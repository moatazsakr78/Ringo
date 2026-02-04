'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/app/lib/supabase/client';
import { cache, CacheKeys, CacheTTL } from '@/app/lib/cache/memoryCache';
import {
  fetchKPIs,
  fetchSalesTrend,
  fetchTopProducts,
  fetchTopCustomers,
} from '../../reports/services/reportsService';
import { KPIData, SalesTrendPoint, TopProductData, TopCustomerData, DateFilter } from '../../reports/types/reports';

// Recent Order interface
export interface RecentOrder {
  id: string;
  order_number: string;
  customer_name: string;
  total_amount: number;
  status: string;
  created_at: string;
}

// Low Stock Product interface
export interface LowStockProduct {
  id: string;
  name: string;
  quantity: number;
  min_stock: number;
  branch_name?: string;
}

// Dashboard Data interface
export interface DashboardData {
  kpis: KPIData | null;
  salesTrend: SalesTrendPoint[];
  topProducts: TopProductData[];
  topCustomers: TopCustomerData[];
  recentOrders: RecentOrder[];
  lowStockProducts: LowStockProduct[];
}

// Initial empty state
const initialData: DashboardData = {
  kpis: null,
  salesTrend: [],
  topProducts: [],
  topCustomers: [],
  recentOrders: [],
  lowStockProducts: [],
};

// Fetch recent orders
const fetchRecentOrders = async (limit: number = 5): Promise<RecentOrder[]> => {
  const { data, error } = await supabase
    .from('orders')
    .select('id, order_number, customer_name, total_amount, status, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching recent orders:', error);
    return [];
  }

  return (data || []).map((order: any) => ({
    id: order.id,
    order_number: order.order_number || `#${order.id.slice(0, 8)}`,
    customer_name: order.customer_name || 'عميل غير معروف',
    total_amount: parseFloat(order.total_amount) || 0,
    status: order.status || 'pending',
    created_at: order.created_at,
  }));
};

// Fetch low stock products
const fetchLowStockProducts = async (limit: number = 10): Promise<LowStockProduct[]> => {
  const { data, error } = await supabase
    .from('branch_stocks')
    .select(`
      quantity,
      min_stock,
      product_id,
      branch_id,
      products!inner(id, name),
      branches(name)
    `)
    .order('quantity', { ascending: true })
    .limit(100);

  if (error) {
    console.error('Error fetching low stock products:', error);
    return [];
  }

  // Filter products where quantity < min_stock
  const lowStock = (data || [])
    .filter((item: any) => {
      const qty = parseFloat(item.quantity) || 0;
      const minStock = parseFloat(item.min_stock) || 0;
      return qty < minStock && minStock > 0;
    })
    .map((item: any) => ({
      id: item.products?.id || item.product_id,
      name: item.products?.name || 'منتج غير معروف',
      quantity: parseFloat(item.quantity) || 0,
      min_stock: parseFloat(item.min_stock) || 0,
      branch_name: item.branches?.name,
    }))
    .slice(0, limit);

  return lowStock;
};

// Auto-refresh interval (30 seconds)
const AUTO_REFRESH_INTERVAL = 30 * 1000;

export function useDashboardData() {
  const [data, setData] = useState<DashboardData>(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const isFetchingRef = useRef(false);

  const todayFilter: DateFilter = { type: 'today' };
  const weekFilter: DateFilter = { type: 'current_week' };
  const monthFilter: DateFilter = { type: 'current_month' };

  const fetchAllData = useCallback(async (forceRefresh = false) => {
    // Prevent concurrent fetches
    if (isFetchingRef.current && !forceRefresh) {
      return;
    }

    // 1. Stale-While-Revalidate: Show cached data immediately
    if (!forceRefresh) {
      const cachedData = cache.get<DashboardData>(CacheKeys.dashboardAll());
      if (cachedData) {
        setData(cachedData);
        setLoading(false);
        // Continue to fetch fresh data in background
      }
    }

    isFetchingRef.current = true;

    // Only show loading spinner if no cached data
    if (!cache.has(CacheKeys.dashboardAll()) || forceRefresh) {
      setLoading(true);
    }

    setError(null);

    try {
      // 2. Fetch all data in parallel
      const [
        kpisResult,
        salesTrendResult,
        topProductsResult,
        topCustomersResult,
        recentOrdersResult,
        lowStockResult,
      ] = await Promise.allSettled([
        fetchKPIs(todayFilter),
        fetchSalesTrend(weekFilter, 7),
        fetchTopProducts(monthFilter, 5),
        fetchTopCustomers(monthFilter, 5),
        fetchRecentOrders(5),
        fetchLowStockProducts(10),
      ]);

      const newData: DashboardData = {
        kpis: kpisResult.status === 'fulfilled' ? kpisResult.value : null,
        salesTrend: salesTrendResult.status === 'fulfilled' ? salesTrendResult.value : [],
        topProducts: topProductsResult.status === 'fulfilled' ? topProductsResult.value : [],
        topCustomers: topCustomersResult.status === 'fulfilled' ? topCustomersResult.value : [],
        recentOrders: recentOrdersResult.status === 'fulfilled' ? recentOrdersResult.value : [],
        lowStockProducts: lowStockResult.status === 'fulfilled' ? lowStockResult.value : [],
      };

      // 3. Save to cache
      cache.set(CacheKeys.dashboardAll(), newData, CacheTTL.dashboardAll);

      setData(newData);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('حدث خطأ في تحميل البيانات');
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Auto-refresh in background every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchAllData(false); // Silent refresh (uses cache first)
    }, AUTO_REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [fetchAllData]);

  // Manual refresh function (force refresh, bypass cache)
  const refresh = useCallback(() => {
    fetchAllData(true);
  }, [fetchAllData]);

  return {
    data,
    loading,
    error,
    lastUpdated,
    refresh,
  };
}

export default useDashboardData;

'use client';

import { useEffect, useState } from 'react';
import {
  CurrencyDollarIcon,
  ChartBarIcon,
  ShoppingCartIcon,
  UserGroupIcon,
  ReceiptPercentIcon,
} from '@heroicons/react/24/outline';
import KPICard from './KPICard';
import { KPIData, DateFilter, SalesTrendPoint } from '../../types/reports';
import { reportsService } from '../../services/reportsService';

interface KPICardGridProps {
  dateFilter: DateFilter;
  onDataLoad?: (data: KPIData) => void;
}

export default function KPICardGrid({ dateFilter, onDataLoad }: KPICardGridProps) {
  const [kpiData, setKpiData] = useState<KPIData | null>(null);
  const [sparklineData, setSparklineData] = useState<SalesTrendPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [kpis, trend] = await Promise.all([
          reportsService.fetchKPIs(dateFilter),
          reportsService.fetchSalesTrend(dateFilter, 14), // Last 14 days for sparkline
        ]);
        setKpiData(kpis);
        setSparklineData(trend);
        onDataLoad?.(kpis);
      } catch (err) {
        console.error('Error fetching KPI data:', err);
        setError('خطأ في تحميل البيانات');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [dateFilter, onDataLoad]);

  // Generate sparkline data from trend
  const salesSparkline = sparklineData.map(d => ({ value: d.sales }));
  const profitSparkline = sparklineData.map(d => ({ value: d.profit }));
  const ordersSparkline = sparklineData.map(d => ({ value: d.orderCount }));

  if (error) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="col-span-full bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-center">
          <p className="text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Total Sales */}
      <KPICard
        title="إجمالي المبيعات"
        value={kpiData?.totalSales || 0}
        previousValue={kpiData?.previousPeriod.totalSales || 0}
        icon={CurrencyDollarIcon}
        iconBgColor="bg-green-500/20"
        iconColor="text-green-400"
        sparklineData={salesSparkline}
        formatAsCurrency={true}
        loading={loading}
      />

      {/* Total Profit */}
      <KPICard
        title="صافي الربح"
        value={kpiData?.totalProfit || 0}
        previousValue={kpiData?.previousPeriod.totalProfit || 0}
        icon={ChartBarIcon}
        iconBgColor="bg-blue-500/20"
        iconColor="text-blue-400"
        sparklineData={profitSparkline}
        formatAsCurrency={true}
        loading={loading}
      />

      {/* Order Count */}
      <KPICard
        title="عدد الفواتير"
        value={kpiData?.orderCount || 0}
        previousValue={kpiData?.previousPeriod.orderCount || 0}
        icon={ShoppingCartIcon}
        iconBgColor="bg-purple-500/20"
        iconColor="text-purple-400"
        sparklineData={ordersSparkline}
        formatAsCurrency={false}
        loading={loading}
      />

      {/* Average Order Value */}
      <KPICard
        title="متوسط الفاتورة"
        value={kpiData?.avgOrderValue || 0}
        previousValue={kpiData?.previousPeriod.avgOrderValue || 0}
        icon={ReceiptPercentIcon}
        iconBgColor="bg-orange-500/20"
        iconColor="text-orange-400"
        sparklineData={[]}
        formatAsCurrency={true}
        loading={loading}
      />
    </div>
  );
}

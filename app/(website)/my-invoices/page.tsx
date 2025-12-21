'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useFormatPrice } from '@/lib/hooks/useCurrency';
import { useCompanySettings } from '@/lib/hooks/useCompanySettings';
import { useStoreTheme } from '@/lib/hooks/useStoreTheme';
import { useAuth } from '@/app/lib/hooks/useAuth';

// Types
interface SaleItem {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  discount: number | null;
  products?: {
    name: string;
    product_code: string | null;
    main_image_url: string | null;
  };
}

interface Invoice {
  id: string;
  invoice_number: string;
  total_amount: number;
  tax_amount: number | null;
  discount_amount: number | null;
  payment_method: string;
  notes: string | null;
  created_at: string;
  time: string | null;
  invoice_type: string | null;
  records?: { name: string } | null;
  sale_items?: SaleItem[];
}

interface Payment {
  id: string;
  amount: number;
  payment_method: string | null;
  notes: string | null;
  payment_date: string | null;
  created_at: string;
  records?: { name: string } | null;
}

interface StatementEntry {
  id: string;
  date: string;
  time: string | null;
  type: string;
  description: string;
  invoiceValue: number;
  paidAmount: number;
  balance: number;
  record: string | null;
}

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  governorate: string | null;
  account_balance: number | null;
  loyalty_points: number | null;
  rank: string | null;
  created_at: string | null;
}

interface Statistics {
  totalInvoices: number;
  totalInvoicesAmount: number;
  totalPayments: number;
  averageOrderValue: number;
  lastInvoiceDate: string | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

type TabType = 'invoices' | 'statement' | 'payments';

export default function MyInvoicesPage() {
  const router = useRouter();
  const formatPrice = useFormatPrice();
  const { logoUrl, companyName, isLoading: isCompanyLoading } = useCompanySettings();
  const { user, isLoading: isAuthLoading, isAuthenticated } = useAuth();
  const { primaryColor, isLoading: isThemeLoading } = useStoreTheme();

  // State
  const [activeTab, setActiveTab] = useState<TabType>('invoices');
  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [statement, setStatement] = useState<StatementEntry[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);

  // Filter state
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Expanded invoice details
  const [expandedInvoice, setExpandedInvoice] = useState<string | null>(null);

  // Ref for print
  const printRef = useRef<HTMLDivElement>(null);

  // Fetch data function
  const fetchData = useCallback(async (tab: TabType, page: number = 1) => {
    if (!isAuthenticated || !user?.id) return;

    setLoading(true);
    try {
      const params = new URLSearchParams({
        tab,
        page: page.toString(),
        limit: '20'
      });

      if (dateFrom) params.append('startDate', dateFrom);
      if (dateTo) params.append('endDate', dateTo);

      const response = await fetch(`/api/user/invoices?${params.toString()}`);

      if (!response.ok) {
        const error = await response.json();
        console.error('API Error:', error);
        setLoading(false);
        return;
      }

      const data = await response.json();

      setCustomer(data.customer);
      setStatistics(data.statistics);
      setPagination(data.pagination);

      if (tab === 'invoices') {
        setInvoices(data.invoices || []);
      } else if (tab === 'payments') {
        setPayments(data.payments || []);
      } else if (tab === 'statement') {
        setStatement(data.statement || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user?.id, dateFrom, dateTo]);

  // Initial load
  useEffect(() => {
    if (isAuthLoading) return;

    if (!isAuthenticated || !user?.id) {
      setLoading(false);
      return;
    }

    fetchData(activeTab);
  }, [isAuthenticated, user?.id, isAuthLoading, fetchData, activeTab]);

  // Handle tab change
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setExpandedInvoice(null);
    fetchData(tab);
  };

  // Handle date filter
  const handleFilter = () => {
    fetchData(activeTab);
  };

  // Clear filter
  const clearFilter = () => {
    setDateFrom('');
    setDateTo('');
    setTimeout(() => fetchData(activeTab), 0);
  };

  // Load more (pagination)
  const loadMore = () => {
    if (pagination && pagination.hasMore) {
      fetchData(activeTab, pagination.page + 1);
    }
  };

  // Print function
  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '', 'width=900,height=650');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <title>${activeTab === 'invoices' ? 'فواتيري' : activeTab === 'statement' ? 'كشف الحساب' : 'الدفعات'}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Cairo', sans-serif;
            direction: rtl;
            padding: 20px;
            background: white;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #333;
            padding-bottom: 15px;
            margin-bottom: 20px;
          }
          .logo { height: 60px; }
          .title { font-size: 24px; font-weight: bold; }
          .customer-info {
            background: #f5f5f5;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
          }
          .customer-info h3 { margin-bottom: 10px; color: #333; }
          .customer-info p { margin: 5px 0; color: #666; }
          .balance {
            font-size: 20px;
            font-weight: bold;
            color: ${customer?.account_balance && customer.account_balance > 0 ? '#dc2626' : '#16a34a'};
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 10px;
            text-align: center;
          }
          th {
            background: #333;
            color: white;
          }
          tr:nth-child(even) { background: #f9f9f9; }
          .total-row { font-weight: bold; background: #e5e5e5 !important; }
          .print-date {
            text-align: center;
            margin-top: 20px;
            color: #888;
            font-size: 12px;
          }
          @media print {
            body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">${activeTab === 'invoices' ? 'فواتيري' : activeTab === 'statement' ? 'كشف الحساب' : 'الدفعات'}</div>
          <img src="${logoUrl || '/assets/logo/El Farouk Group2.png'}" class="logo" />
        </div>
        <div class="customer-info">
          <h3>بيانات العميل</h3>
          <p><strong>الاسم:</strong> ${customer?.name || '-'}</p>
          <p><strong>الهاتف:</strong> ${customer?.phone || '-'}</p>
          <p class="balance"><strong>الرصيد الحالي:</strong> ${formatPrice(customer?.account_balance || 0)}</p>
        </div>
        ${printContent.innerHTML}
        <p class="print-date">تاريخ الطباعة: ${new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  // Format time
  const formatTime = (timeString: string | null) => {
    if (!timeString) return '-';
    return timeString.substring(0, 5);
  };

  // Toggle invoice details
  const toggleInvoiceDetails = (invoiceId: string) => {
    setExpandedInvoice(expandedInvoice === invoiceId ? null : invoiceId);
  };

  // Loading state
  if (loading || isCompanyLoading || isThemeLoading || isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#c0c0c0' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-400 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated || !user?.id) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#c0c0c0' }}>
        <div className="text-center bg-white p-8 rounded-lg shadow-lg">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <h2 className="text-xl font-bold text-gray-800 mb-2">تسجيل الدخول مطلوب</h2>
          <p className="text-gray-600 mb-4">يرجى تسجيل الدخول لعرض فواتيرك</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-2 text-white rounded-lg transition-colors"
            style={{ backgroundColor: 'var(--primary-color)' }}
          >
            العودة للرئيسية
          </button>
        </div>
      </div>
    );
  }

  // No customer account
  if (!customer) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#c0c0c0' }}>
        <div className="text-center bg-white p-8 rounded-lg shadow-lg">
          <svg className="w-16 h-16 mx-auto mb-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="text-xl font-bold text-gray-800 mb-2">لا يوجد حساب عميل</h2>
          <p className="text-gray-600 mb-4">لم يتم العثور على حساب عميل مرتبط بحسابك</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-2 text-white rounded-lg transition-colors"
            style={{ backgroundColor: 'var(--primary-color)' }}
          >
            العودة للرئيسية
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-gray-800" style={{ backgroundColor: '#c0c0c0' }}>
      {/* Hide system headers */}
      <style jsx global>{`
        body { margin-top: 0 !important; padding-top: 0 !important; }
        html { margin-top: 0 !important; padding-top: 0 !important; }
      `}</style>

      {/* Header */}
      <header className="border-b border-gray-700 py-0 relative z-40" style={{ backgroundColor: 'var(--primary-color)' }}>
        <div className="relative flex items-center min-h-[60px] md:min-h-[80px]">
          <div className="max-w-[95%] md:max-w-[95%] lg:max-w-[80%] mx-auto px-2 md:px-3 lg:px-4 flex items-center justify-between min-h-[60px] md:min-h-[80px] w-full">

            {/* Back Button */}
            <button
              onClick={() => router.back()}
              className="flex items-center p-2 text-white hover:text-gray-300 transition-colors"
            >
              <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="hidden md:inline mr-2">العودة</span>
            </button>

            {/* Title */}
            <div className="absolute left-1/2 transform -translate-x-1/2">
              <h1 className="text-lg md:text-2xl font-bold text-white text-center whitespace-nowrap">
                فواتيري
              </h1>
            </div>

            {/* Logo */}
            <div className="flex items-center">
              <img src={logoUrl || '/assets/logo/El Farouk Group2.png'} alt={companyName} className="h-12 w-12 md:h-16 md:w-16 object-contain" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[98%] md:max-w-[95%] lg:max-w-[80%] mx-auto px-2 md:px-3 lg:px-4 py-4 md:py-5 lg:py-8">

        {/* Customer Info Card */}
        <div className="bg-white rounded-lg shadow-lg p-4 md:p-6 mb-4 md:mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center text-white text-xl font-bold" style={{ backgroundColor: 'var(--primary-color)' }}>
                {customer.name?.charAt(0) || '؟'}
              </div>
              <div>
                <h2 className="text-lg md:text-xl font-bold text-gray-800">{customer.name}</h2>
                <p className="text-sm text-gray-600">{customer.phone || 'لا يوجد رقم هاتف'}</p>
                {customer.rank && (
                  <span className="inline-flex items-center gap-1 text-xs text-yellow-600 bg-yellow-100 px-2 py-1 rounded-full mt-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                    {customer.rank}
                  </span>
                )}
              </div>
            </div>

            {/* Balance */}
            <div className="text-center md:text-left bg-gradient-to-r from-gray-100 to-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">رصيد الحساب</p>
              <p className={`text-2xl md:text-3xl font-bold ${(customer.account_balance || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {formatPrice(customer.account_balance || 0)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {(customer.account_balance || 0) > 0 ? 'عليك' : (customer.account_balance || 0) < 0 ? 'لك' : 'الحساب متوازن'}
              </p>
            </div>
          </div>

          {/* Quick Statistics */}
          {statistics && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-4 border-t border-gray-200">
              <div className="text-center">
                <p className="text-xs text-gray-500">عدد الفواتير</p>
                <p className="text-lg font-bold text-gray-800">{statistics.totalInvoices}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500">إجمالي الفواتير</p>
                <p className="text-lg font-bold text-blue-600">{formatPrice(statistics.totalInvoicesAmount)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500">إجمالي المدفوعات</p>
                <p className="text-lg font-bold text-green-600">{formatPrice(statistics.totalPayments)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500">متوسط الفاتورة</p>
                <p className="text-lg font-bold text-gray-800">{formatPrice(statistics.averageOrderValue)}</p>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex mb-4 md:mb-6 bg-white rounded-lg overflow-hidden shadow-lg">
          <button
            onClick={() => handleTabChange('invoices')}
            className={`flex-1 py-3 md:py-4 px-2 md:px-6 text-sm md:text-base font-semibold transition-colors ${
              activeTab === 'invoices' ? 'text-white' : 'text-gray-600 hover:text-gray-800'
            }`}
            style={{ backgroundColor: activeTab === 'invoices' ? 'var(--primary-color)' : 'transparent' }}
          >
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              الفواتير
            </span>
          </button>
          <button
            onClick={() => handleTabChange('statement')}
            className={`flex-1 py-3 md:py-4 px-2 md:px-6 text-sm md:text-base font-semibold transition-colors ${
              activeTab === 'statement' ? 'text-white' : 'text-gray-600 hover:text-gray-800'
            }`}
            style={{ backgroundColor: activeTab === 'statement' ? 'var(--primary-color)' : 'transparent' }}
          >
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              كشف الحساب
            </span>
          </button>
          <button
            onClick={() => handleTabChange('payments')}
            className={`flex-1 py-3 md:py-4 px-2 md:px-6 text-sm md:text-base font-semibold transition-colors ${
              activeTab === 'payments' ? 'text-white' : 'text-gray-600 hover:text-gray-800'
            }`}
            style={{ backgroundColor: activeTab === 'payments' ? 'var(--primary-color)' : 'transparent' }}
          >
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              الدفعات
            </span>
          </button>
        </div>

        {/* Filter Section */}
        <div className="bg-white rounded-lg shadow-lg p-4 mb-4 md:mb-6">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="flex-1 flex flex-col md:flex-row gap-3">
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">من تاريخ</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">إلى تاريخ</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-2 md:mt-6">
              <button
                onClick={handleFilter}
                className="flex-1 md:flex-none px-4 py-2 text-white rounded-lg transition-colors text-sm font-medium"
                style={{ backgroundColor: 'var(--primary-color)' }}
              >
                تطبيق
              </button>
              <button
                onClick={clearFilter}
                className="flex-1 md:flex-none px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
              >
                مسح
              </button>
              <button
                onClick={handlePrint}
                className="flex-1 md:flex-none px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                طباعة
              </button>
            </div>
          </div>
        </div>

        {/* Content - Printable Area */}
        <div ref={printRef} className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Invoices Tab */}
          {activeTab === 'invoices' && (
            <div>
              {invoices.length === 0 ? (
                <div className="p-8 text-center">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-gray-500">لا توجد فواتير</p>
                </div>
              ) : (
                <>
                  {/* Mobile View */}
                  <div className="md:hidden">
                    {invoices.map((invoice, index) => (
                      <div key={invoice.id} className="border-b border-gray-200 last:border-b-0">
                        <div
                          onClick={() => toggleInvoiceDetails(invoice.id)}
                          className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-gray-500">#{index + 1}</span>
                            <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-600">
                              {invoice.invoice_type || 'فاتورة بيع'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-800">{invoice.invoice_number}</p>
                              <p className="text-xs text-gray-500">{formatDate(invoice.created_at)} - {formatTime(invoice.time)}</p>
                            </div>
                            <div className="text-left">
                              <p className="font-bold text-blue-600">{formatPrice(invoice.total_amount)}</p>
                              <p className="text-xs text-gray-500">{invoice.payment_method}</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-gray-500">{invoice.records?.name || '-'}</span>
                            <svg className={`w-5 h-5 text-gray-400 transition-transform ${expandedInvoice === invoice.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>

                        {/* Invoice Details */}
                        {expandedInvoice === invoice.id && invoice.sale_items && (
                          <div className="px-4 pb-4 bg-gray-50">
                            <p className="text-sm font-medium text-gray-700 mb-2">تفاصيل الفاتورة:</p>
                            <div className="space-y-2">
                              {invoice.sale_items.map((item, itemIndex) => (
                                <div key={item.id} className="flex items-center justify-between text-sm bg-white p-2 rounded">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-400">{itemIndex + 1}</span>
                                    <span className="text-gray-700">{item.products?.name || 'منتج'}</span>
                                    <span className="text-xs text-gray-500">x{item.quantity}</span>
                                  </div>
                                  <span className="text-gray-800">{formatPrice(item.unit_price * item.quantity)}</span>
                                </div>
                              ))}
                            </div>
                            {invoice.discount_amount && invoice.discount_amount > 0 && (
                              <div className="flex justify-between mt-2 text-sm text-green-600">
                                <span>الخصم</span>
                                <span>-{formatPrice(invoice.discount_amount)}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Desktop View */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-800 text-white">
                        <tr>
                          <th className="px-4 py-3 text-right text-sm font-medium">#</th>
                          <th className="px-4 py-3 text-right text-sm font-medium">رقم الفاتورة</th>
                          <th className="px-4 py-3 text-right text-sm font-medium">التاريخ</th>
                          <th className="px-4 py-3 text-right text-sm font-medium">الوقت</th>
                          <th className="px-4 py-3 text-right text-sm font-medium">النوع</th>
                          <th className="px-4 py-3 text-right text-sm font-medium">طريقة الدفع</th>
                          <th className="px-4 py-3 text-right text-sm font-medium">المبلغ</th>
                          <th className="px-4 py-3 text-right text-sm font-medium">الخزنة</th>
                          <th className="px-4 py-3 text-right text-sm font-medium">تفاصيل</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {invoices.map((invoice, index) => (
                          <>
                            <tr key={invoice.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm text-gray-600">{index + 1}</td>
                              <td className="px-4 py-3 text-sm font-medium text-blue-600">{invoice.invoice_number}</td>
                              <td className="px-4 py-3 text-sm text-gray-600">{formatDate(invoice.created_at)}</td>
                              <td className="px-4 py-3 text-sm text-gray-600">{formatTime(invoice.time)}</td>
                              <td className="px-4 py-3">
                                <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-600">
                                  {invoice.invoice_type || 'فاتورة بيع'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">{invoice.payment_method}</td>
                              <td className="px-4 py-3 text-sm font-bold text-blue-600">{formatPrice(invoice.total_amount)}</td>
                              <td className="px-4 py-3 text-sm text-gray-600">{invoice.records?.name || '-'}</td>
                              <td className="px-4 py-3">
                                <button
                                  onClick={() => toggleInvoiceDetails(invoice.id)}
                                  className="text-blue-600 hover:text-blue-800 text-sm"
                                >
                                  {expandedInvoice === invoice.id ? 'إخفاء' : 'عرض'}
                                </button>
                              </td>
                            </tr>
                            {expandedInvoice === invoice.id && invoice.sale_items && (
                              <tr>
                                <td colSpan={9} className="bg-gray-50 px-4 py-4">
                                  <div className="text-sm">
                                    <p className="font-medium text-gray-700 mb-2">تفاصيل المنتجات:</p>
                                    <table className="w-full bg-white rounded-lg overflow-hidden">
                                      <thead className="bg-gray-200">
                                        <tr>
                                          <th className="px-3 py-2 text-right text-xs">#</th>
                                          <th className="px-3 py-2 text-right text-xs">المنتج</th>
                                          <th className="px-3 py-2 text-right text-xs">الكمية</th>
                                          <th className="px-3 py-2 text-right text-xs">السعر</th>
                                          <th className="px-3 py-2 text-right text-xs">الإجمالي</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {invoice.sale_items.map((item, itemIndex) => (
                                          <tr key={item.id} className="border-b border-gray-100">
                                            <td className="px-3 py-2 text-xs text-gray-500">{itemIndex + 1}</td>
                                            <td className="px-3 py-2 text-xs">{item.products?.name || 'منتج'}</td>
                                            <td className="px-3 py-2 text-xs">{item.quantity}</td>
                                            <td className="px-3 py-2 text-xs">{formatPrice(item.unit_price)}</td>
                                            <td className="px-3 py-2 text-xs font-medium">{formatPrice(item.unit_price * item.quantity)}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Statement Tab */}
          {activeTab === 'statement' && (
            <div>
              {statement.length === 0 ? (
                <div className="p-8 text-center">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-gray-500">لا توجد حركات</p>
                </div>
              ) : (
                <>
                  {/* Mobile View */}
                  <div className="md:hidden">
                    {statement.map((entry, index) => (
                      <div key={entry.id} className="border-b border-gray-200 last:border-b-0 p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-gray-500">#{index + 1}</span>
                          <span className={`px-2 py-1 text-xs rounded-full ${entry.type === 'سلفة' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                            {entry.type}
                          </span>
                        </div>
                        <p className="text-sm text-gray-800 mb-1">{entry.description}</p>
                        <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                          <span>{formatDate(entry.date)}</span>
                          <span>{formatTime(entry.time)}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center bg-gray-50 p-2 rounded">
                          <div>
                            <p className="text-xs text-gray-500">قيمة الفاتورة</p>
                            <p className="text-sm font-medium text-blue-600">{entry.invoiceValue > 0 ? formatPrice(entry.invoiceValue) : '-'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">المدفوع</p>
                            <p className="text-sm font-medium text-green-600">{entry.paidAmount > 0 ? formatPrice(entry.paidAmount) : '-'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">الرصيد</p>
                            <p className={`text-sm font-bold ${entry.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {formatPrice(entry.balance)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop View */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-800 text-white">
                        <tr>
                          <th className="px-4 py-3 text-right text-sm font-medium">#</th>
                          <th className="px-4 py-3 text-right text-sm font-medium">التاريخ</th>
                          <th className="px-4 py-3 text-right text-sm font-medium">الوقت</th>
                          <th className="px-4 py-3 text-right text-sm font-medium">نوع العملية</th>
                          <th className="px-4 py-3 text-right text-sm font-medium">البيان</th>
                          <th className="px-4 py-3 text-right text-sm font-medium">قيمة الفاتورة</th>
                          <th className="px-4 py-3 text-right text-sm font-medium">المبلغ المدفوع</th>
                          <th className="px-4 py-3 text-right text-sm font-medium">الرصيد</th>
                          <th className="px-4 py-3 text-right text-sm font-medium">الخزنة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {statement.map((entry, index) => (
                          <tr key={entry.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-600">{index + 1}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{formatDate(entry.date)}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{formatTime(entry.time)}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 text-xs rounded-full ${entry.type === 'سلفة' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                                {entry.type}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-800">{entry.description}</td>
                            <td className="px-4 py-3 text-sm text-blue-600">{entry.invoiceValue > 0 ? formatPrice(entry.invoiceValue) : '-'}</td>
                            <td className="px-4 py-3 text-sm text-green-600">{entry.paidAmount > 0 ? formatPrice(entry.paidAmount) : '-'}</td>
                            <td className={`px-4 py-3 text-sm font-bold ${entry.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {formatPrice(entry.balance)}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">{entry.record || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Payments Tab */}
          {activeTab === 'payments' && (
            <div>
              {/* Payments Summary */}
              {payments.length > 0 && (
                <div className="p-4 bg-green-50 border-b border-green-200">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-green-800">إجمالي الدفعات</span>
                    <span className="text-xl font-bold text-green-600">
                      {formatPrice(payments.reduce((sum, p) => sum + Number(p.amount), 0))}
                    </span>
                  </div>
                </div>
              )}

              {payments.length === 0 ? (
                <div className="p-8 text-center">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <p className="text-gray-500">لا توجد دفعات</p>
                </div>
              ) : (
                <>
                  {/* Mobile View */}
                  <div className="md:hidden">
                    {payments.map((payment, index) => (
                      <div key={payment.id} className="border-b border-gray-200 last:border-b-0 p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-gray-500">#{index + 1}</span>
                          <span className="text-xs text-gray-500">{formatDate(payment.payment_date || payment.created_at)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-800">{payment.notes || 'دفعة'}</p>
                            <p className="text-xs text-gray-500">{payment.payment_method || 'نقدي'}</p>
                          </div>
                          <p className="text-lg font-bold text-green-600">{formatPrice(payment.amount)}</p>
                        </div>
                        {payment.records?.name && (
                          <p className="text-xs text-gray-500 mt-1">الخزنة: {payment.records.name}</p>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Desktop View */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-800 text-white">
                        <tr>
                          <th className="px-4 py-3 text-right text-sm font-medium">#</th>
                          <th className="px-4 py-3 text-right text-sm font-medium">التاريخ</th>
                          <th className="px-4 py-3 text-right text-sm font-medium">الوقت</th>
                          <th className="px-4 py-3 text-right text-sm font-medium">المبلغ</th>
                          <th className="px-4 py-3 text-right text-sm font-medium">طريقة الدفع</th>
                          <th className="px-4 py-3 text-right text-sm font-medium">البيان</th>
                          <th className="px-4 py-3 text-right text-sm font-medium">الخزنة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {payments.map((payment, index) => (
                          <tr key={payment.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-600">{index + 1}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{formatDate(payment.payment_date || payment.created_at)}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {payment.created_at ? formatTime(payment.created_at.split('T')[1]?.substring(0, 5)) : '-'}
                            </td>
                            <td className="px-4 py-3 text-sm font-bold text-green-600">{formatPrice(payment.amount)}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{payment.payment_method || 'نقدي'}</td>
                            <td className="px-4 py-3 text-sm text-gray-800">{payment.notes || '-'}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{payment.records?.name || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination && pagination.hasMore && (
          <div className="mt-4 text-center">
            <button
              onClick={loadMore}
              disabled={loading}
              className="px-6 py-2 bg-white text-gray-700 rounded-lg shadow hover:shadow-md transition-all disabled:opacity-50"
            >
              {loading ? 'جاري التحميل...' : 'تحميل المزيد'}
            </button>
          </div>
        )}

        {/* Info Footer */}
        <div className="mt-4 text-center text-xs text-gray-500">
          {pagination && (
            <p>عرض {Math.min(pagination.page * pagination.limit, pagination.total)} من {pagination.total} سجل</p>
          )}
        </div>
      </main>
    </div>
  );
}

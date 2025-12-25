'use client';

import { useEffect, useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import { PaymentMethodData, DateFilter } from '../../types/reports';
import { reportsService } from '../../services/reportsService';
import { CATEGORY_COLORS, DARK_THEME, formatCurrencyAr, formatPercentage } from '../../utils/chartConfig';

interface PaymentMethodsChartProps {
  dateFilter: DateFilter;
  height?: number;
}

export default function PaymentMethodsChart({ dateFilter, height = 300 }: PaymentMethodsChartProps) {
  const [data, setData] = useState<PaymentMethodData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const methods = await reportsService.fetchPaymentMethods(dateFilter);
        setData(methods);
      } catch (err) {
        console.error('Error fetching payment methods:', err);
        setError('خطأ في تحميل البيانات');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [dateFilter]);

  if (loading) {
    return (
      <div className="bg-[#374151] rounded-lg border border-gray-600 p-4">
        <div className="h-8 bg-gray-600 rounded w-1/3 mb-4"></div>
        <div className="animate-pulse bg-gray-600 rounded" style={{ height }}></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#374151] rounded-lg border border-gray-600 p-4">
        <h3 className="text-white font-semibold mb-4 text-right">طرق الدفع</h3>
        <div className="flex items-center justify-center text-red-400" style={{ height }}>
          {error}
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-[#374151] rounded-lg border border-gray-600 p-4">
        <h3 className="text-white font-semibold mb-4 text-right">طرق الدفع</h3>
        <div className="flex items-center justify-center text-gray-400" style={{ height }}>
          لا توجد بيانات للفترة المحددة
        </div>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div
          style={{
            backgroundColor: DARK_THEME.tooltipBackground,
            border: `1px solid ${DARK_THEME.tooltipBorder}`,
            borderRadius: '8px',
            padding: '12px',
            direction: 'rtl',
          }}
        >
          <p className="text-white font-semibold mb-2">{item.methodAr}</p>
          <p className="text-gray-300">الإجمالي: {formatCurrencyAr(item.totalAmount)}</p>
          <p className="text-gray-300">عدد العمليات: {item.count}</p>
          <p className="text-gray-300">النسبة: {formatPercentage(item.percentage)}</p>
        </div>
      );
    }
    return null;
  };

  const renderLegend = (props: any) => {
    const { payload } = props;
    return (
      <div className="flex flex-wrap justify-center gap-3 mt-2" style={{ direction: 'rtl' }}>
        {payload.map((entry: any, index: number) => (
          <div key={`legend-${index}`} className="flex items-center gap-1">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-300 text-sm">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  };

  // Calculate total
  const total = data.reduce((sum, d) => sum + d.totalAmount, 0);

  return (
    <div className="bg-[#374151] rounded-lg border border-gray-600 p-4">
      <div className="flex items-center justify-between mb-4">
        <span className="text-gray-400 text-sm">الإجمالي: {formatCurrencyAr(total)}</span>
        <h3 className="text-white font-semibold text-right">طرق الدفع</h3>
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="45%"
            innerRadius={70}
            outerRadius={100}
            paddingAngle={3}
            dataKey="totalAmount"
            nameKey="methodAr"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend content={renderLegend} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

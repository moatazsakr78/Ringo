'use client';

import { BanknotesIcon } from '@heroicons/react/24/outline';
import { CapitalData } from '../hooks/useDashboardData';
import { formatCurrencyAr } from '../../reports/utils/chartConfig';

interface CapitalCardProps {
  data: CapitalData | null;
  loading?: boolean;
}

export default function CapitalCard({ data, loading = false }: CapitalCardProps) {
  if (loading) {
    return (
      <div className="bg-[#374151] rounded-xl border border-gray-600 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">رأس المال</h3>
          <BanknotesIcon className="w-5 h-5 text-emerald-400" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse flex items-center gap-3 p-3 bg-[#2B3544] rounded-lg">
              <div className="flex-1">
                <div className="h-4 bg-gray-600 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-600 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.branches.length === 0) {
    return (
      <div className="bg-[#374151] rounded-xl border border-gray-600 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">رأس المال</h3>
          <BanknotesIcon className="w-5 h-5 text-gray-400" />
        </div>
        <div className="flex flex-col items-center justify-center py-8 text-gray-400">
          <div className="w-12 h-12 rounded-full bg-gray-500/10 flex items-center justify-center mb-3">
            <BanknotesIcon className="w-6 h-6 text-gray-500" />
          </div>
          <p className="text-gray-400">لا توجد بيانات رأس مال</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#374151] rounded-xl border border-gray-600 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-white">رأس المال</h3>
          <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded-full font-medium">
            {data.branches.length} فرع
          </span>
        </div>
        <BanknotesIcon className="w-5 h-5 text-emerald-400" />
      </div>

      {/* Total Capital */}
      <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
        <p className="text-gray-400 text-xs mb-1">إجمالي رأس المال</p>
        <p className="text-2xl font-bold text-emerald-400">{formatCurrencyAr(data.totalCapital)}</p>
      </div>

      {/* Branch Breakdown */}
      <div className="space-y-2 max-h-[300px] overflow-y-auto scrollbar-hide">
        {data.branches.map((branch) => {
          const percentage = data.totalCapital > 0 ? (branch.capital / data.totalCapital) * 100 : 0;

          return (
            <div
              key={branch.branch_id}
              className="p-3 bg-[#2B3544] rounded-lg"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-white text-sm font-medium">{branch.branch_name}</span>
                <span className="text-blue-300 text-sm font-semibold">{formatCurrencyAr(branch.capital)}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-gray-600 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
                <span className="text-gray-400 text-xs min-w-[40px] text-left">{percentage.toFixed(1)}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

'use client';

import React from 'react';
import PermissionCard from './PermissionCard';
import type { PermissionDefinition } from '@/types/permissions';

interface PermissionGridProps {
  permissions: PermissionDefinition[];
  restrictions: string[]; // Array of restricted permission codes
  onToggle: (permissionCode: string, restricted: boolean) => void;
  onEnableAll: () => void; // Enable all = restrict all (reverse logic)
  onDisableAll: () => void; // Disable all = unrestrict all
  categoryName?: string;
  disabled?: boolean;
}

export default function PermissionGrid({
  permissions,
  restrictions,
  onToggle,
  onEnableAll,
  onDisableAll,
  categoryName,
  disabled = false,
}: PermissionGridProps) {
  const restrictedCount = permissions.filter((p) => restrictions.includes(p.code)).length;
  const totalCount = permissions.length;

  if (permissions.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400">
        <div className="text-center">
          <p className="text-lg mb-2">لا توجد صلاحيات في هذا التصنيف</p>
          <p className="text-sm">اختر تصنيفًا آخر من القائمة الجانبية</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          {categoryName && (
            <h2 className="text-xl font-bold text-white">{categoryName}</h2>
          )}
          <span className="text-gray-400 text-sm">
            إدارة صلاحيات هذه الصفحة ({restrictedCount} من {totalCount} مفعلة)
          </span>
        </div>

        {/* Bulk Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onEnableAll}
            disabled={disabled || restrictedCount === totalCount}
            className={`
              px-3 py-1.5 text-sm rounded-lg transition-colors
              ${disabled || restrictedCount === totalCount
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-red-600 hover:bg-red-700 text-white'
              }
            `}
          >
            تفعيل الكل
          </button>
          <button
            onClick={onDisableAll}
            disabled={disabled || restrictedCount === 0}
            className={`
              px-3 py-1.5 text-sm rounded-lg transition-colors
              ${disabled || restrictedCount === 0
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700 text-white'
              }
            `}
          >
            إلغاء الكل
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="bg-[#2B3544] rounded-lg p-3 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-gray-300 text-sm">ممنوع: {restrictedCount}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-gray-300 text-sm">مسموح: {totalCount - restrictedCount}</span>
            </div>
          </div>

          <div className="text-gray-400 text-sm">
            {restrictedCount === 0 ? (
              <span className="text-green-400">كل الميزات مسموحة لهذا الدور</span>
            ) : restrictedCount === totalCount ? (
              <span className="text-red-400">كل الميزات ممنوعة عن هذا الدور</span>
            ) : (
              <span>{restrictedCount} مفعلة من أصل {totalCount} صلاحية</span>
            )}
          </div>
        </div>
      </div>

      {/* Grid of Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {permissions.map((permission) => (
          <PermissionCard
            key={permission.id}
            permission={permission}
            isRestricted={restrictions.includes(permission.code)}
            onToggle={onToggle}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
}

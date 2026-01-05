'use client';

import React from 'react';
import { CheckIcon, CogIcon } from '@heroicons/react/24/outline';
import type { PermissionDefinition } from '@/types/permissions';
import { PERMISSION_TYPE_LABELS, PERMISSION_TYPE_COLORS } from '@/types/permissions';

interface PermissionCardProps {
  permission: PermissionDefinition;
  isRestricted: boolean; // true = CHECKED = DISABLED for role
  onToggle: (permissionCode: string, restricted: boolean) => void;
  disabled?: boolean;
}

export default function PermissionCard({
  permission,
  isRestricted,
  onToggle,
  disabled = false,
}: PermissionCardProps) {
  const handleToggle = () => {
    if (disabled) return;
    onToggle(permission.code, !isRestricted);
  };

  const typeLabel = PERMISSION_TYPE_LABELS[permission.permission_type];
  const typeColor = PERMISSION_TYPE_COLORS[permission.permission_type];

  return (
    <div
      onClick={handleToggle}
      className={`
        relative flex items-start gap-4 p-4 rounded-lg border-2 transition-all duration-200
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${isRestricted
          ? 'bg-red-500/10 border-red-500/50 hover:border-red-500'
          : 'bg-[#374151] border-transparent hover:border-blue-500/50'
        }
      `}
    >
      {/* Status Indicator */}
      <div
        className={`
          absolute top-3 left-3 w-2.5 h-2.5 rounded-full
          ${isRestricted ? 'bg-red-500' : 'bg-green-500'}
        `}
      />

      {/* Checkbox */}
      <div
        className={`
          flex-shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center
          transition-colors duration-200 mt-0.5
          ${isRestricted
            ? 'bg-red-500 border-red-500'
            : 'border-gray-500 bg-transparent'
          }
        `}
      >
        {isRestricted && <CheckIcon className="w-4 h-4 text-white" />}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <CogIcon className="w-5 h-5 text-gray-400" />
          <h4 className="text-white font-medium">{permission.name}</h4>
          <span className={`text-xs px-2 py-0.5 rounded-full ${typeColor}`}>
            {typeLabel}
          </span>
        </div>

        {permission.description && (
          <p className="text-gray-400 text-sm">{permission.description}</p>
        )}

        {/* Status Text */}
        <div className="mt-2">
          {isRestricted ? (
            <span className="text-xs text-red-400">
              هذه الميزة ممنوعة لهذا الدور
            </span>
          ) : (
            <span className="text-xs text-green-400">
              هذه الميزة مسموحة لهذا الدور
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

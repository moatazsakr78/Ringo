'use client';

import React from 'react';
import { usePermissionsContext } from '@/lib/contexts/PermissionsContext';

interface UsePermissionCheckReturn {
  // Check single permission (returns true if user CAN access)
  can: (permissionCode: string) => boolean;

  // Check multiple permissions (returns true if user CAN access ALL)
  canAll: (permissionCodes: string[]) => boolean;

  // Check if any permission is allowed
  canAny: (permissionCodes: string[]) => boolean;

  // Loading state
  loading: boolean;

  // Error state
  error: string | null;
}

/**
 * Hook للتحقق من صلاحيات المستخدم
 *
 * المنطق المعكوس:
 * - can('pos.safe') = true → المستخدم يستطيع الوصول للخزنة
 * - can('pos.safe') = false → الخزنة ممنوعة عن المستخدم
 *
 * @example
 * ```tsx
 * function POSPage() {
 *   const { can } = usePermissionCheck();
 *
 *   return (
 *     <div>
 *       {can('pos.returns') && <ReturnsButton />}
 *       {can('pos.discount') && <DiscountButton />}
 *     </div>
 *   );
 * }
 * ```
 */
export function usePermissionCheck(): UsePermissionCheckReturn {
  const { hasPermission, hasAllPermissions, hasAnyPermission, loading, error } = usePermissionsContext();

  return {
    can: hasPermission,
    canAll: hasAllPermissions,
    canAny: hasAnyPermission,
    loading,
    error,
  };
}

/**
 * Hook للتحقق من صلاحية محددة
 *
 * @example
 * ```tsx
 * function SafeButton() {
 *   const canAccessSafe = useCanAccess('pos.safe');
 *
 *   if (!canAccessSafe) return null;
 *   return <button>الخزنة</button>;
 * }
 * ```
 */
export function useCanAccess(permissionCode: string): boolean {
  const { can } = usePermissionCheck();
  return can(permissionCode);
}

/**
 * HOC لإخفاء مكون إذا لم يكن للمستخدم صلاحية
 *
 * @example
 * ```tsx
 * const ProtectedSafeButton = withPermission(SafeButton, 'pos.safe');
 * ```
 */
export function withPermission<P extends object>(
  Component: React.ComponentType<P>,
  permissionCode: string,
  options?: {
    fallback?: React.ReactNode;
    hideOnRestricted?: boolean;
  }
) {
  const { fallback = null, hideOnRestricted = true } = options || {};

  return function PermissionWrapper(props: P) {
    const canAccess = useCanAccess(permissionCode);

    if (!canAccess) {
      return hideOnRestricted ? null : fallback;
    }

    return <Component {...props} />;
  };
}

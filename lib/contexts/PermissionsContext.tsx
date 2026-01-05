'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/app/lib/supabase/client';
import { useUserProfile } from './UserProfileContext';

interface PermissionsContextValue {
  userRestrictions: string[]; // Current user's restricted permissions
  loading: boolean;
  error: string | null;

  // Check permission (reverse logic: true = NOT restricted = allowed)
  hasPermission: (code: string) => boolean;

  // Check multiple permissions
  hasAllPermissions: (codes: string[]) => boolean;
  hasAnyPermission: (codes: string[]) => boolean;

  // Refresh permissions
  refetch: () => Promise<void>;
}

const PermissionsContext = createContext<PermissionsContextValue | undefined>(undefined);

interface PermissionsProviderProps {
  children: ReactNode;
}

export function PermissionsProvider({ children }: PermissionsProviderProps) {
  const [userRestrictions, setUserRestrictions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { profile, isAdmin } = useUserProfile();

  // Fetch user's role restrictions
  const fetchUserRestrictions = useCallback(async () => {
    // إذا كان أدمن رئيسي، لا قيود
    if (isAdmin) {
      setUserRestrictions([]);
      setLoading(false);
      return;
    }

    if (!profile?.role) {
      setUserRestrictions([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // First, get the role ID from user_roles table
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('id')
        .eq('name', profile.role)
        .single();

      if (roleError) {
        // Role not found in user_roles, might be a basic role
        // Basic roles (عميل, جملة, موظف, أدمن رئيسي) don't have restrictions
        setUserRestrictions([]);
        setLoading(false);
        return;
      }

      // Fetch restrictions for this role
      const { data: restrictionsData, error: restrictionsError } = await (supabase as any)
        .from('role_restrictions')
        .select('permission_code')
        .eq('role_id', roleData.id);

      if (restrictionsError) throw restrictionsError;

      const restrictions = restrictionsData as Array<{ permission_code: string }>;
      setUserRestrictions(restrictions?.map((r) => r.permission_code) || []);
    } catch (err) {
      console.error('Error fetching user restrictions:', err);
      setError(err instanceof Error ? err.message : 'فشل في جلب صلاحيات المستخدم');
      setUserRestrictions([]);
    } finally {
      setLoading(false);
    }
  }, [profile?.role, isAdmin]);

  useEffect(() => {
    fetchUserRestrictions();
  }, [fetchUserRestrictions]);

  // Check if user has permission (reverse logic)
  // Returns true if permission is NOT restricted (allowed)
  const hasPermission = useCallback(
    (code: string): boolean => {
      // الأدمن الرئيسي له كل الصلاحيات
      if (isAdmin) return true;
      // إذا لم يتم تحميل البيانات بعد، نفترض أن المستخدم له الصلاحية
      if (loading) return true;
      // إذا كان الكود موجود في القيود، فالصلاحية ممنوعة
      return !userRestrictions.includes(code);
    },
    [userRestrictions, isAdmin, loading]
  );

  // Check if user has all permissions
  const hasAllPermissions = useCallback(
    (codes: string[]): boolean => {
      return codes.every((code) => hasPermission(code));
    },
    [hasPermission]
  );

  // Check if user has any of the permissions
  const hasAnyPermission = useCallback(
    (codes: string[]): boolean => {
      return codes.some((code) => hasPermission(code));
    },
    [hasPermission]
  );

  const value: PermissionsContextValue = {
    userRestrictions,
    loading,
    error,
    hasPermission,
    hasAllPermissions,
    hasAnyPermission,
    refetch: fetchUserRestrictions,
  };

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissionsContext(): PermissionsContextValue {
  const context = useContext(PermissionsContext);
  if (context === undefined) {
    throw new Error('usePermissionsContext must be used within a PermissionsProvider');
  }
  return context;
}

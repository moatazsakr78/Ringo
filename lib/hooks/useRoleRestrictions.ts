'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/app/lib/supabase/client';
import type { RoleRestriction } from '@/types/permissions';

interface UseRoleRestrictionsReturn {
  restrictions: string[]; // Array of restricted permission codes
  restrictionsData: RoleRestriction[];
  loading: boolean;
  error: string | null;
  roleId: string | null;

  // Set the role to manage
  setRoleId: (roleId: string | null) => void;

  // Check if permission is restricted (CHECKED = DISABLED)
  isRestricted: (permissionCode: string) => boolean;

  // Toggle restriction
  toggleRestriction: (permissionCode: string) => Promise<boolean>;

  // Add restriction
  addRestriction: (permissionCode: string) => Promise<boolean>;

  // Remove restriction
  removeRestriction: (permissionCode: string) => Promise<boolean>;

  // Bulk operations
  restrictAll: (permissionCodes: string[]) => Promise<boolean>;
  unrestrictAll: (permissionCodes: string[]) => Promise<boolean>;

  // Refresh data
  refetch: () => Promise<void>;
}

export function useRoleRestrictions(initialRoleId?: string): UseRoleRestrictionsReturn {
  const [roleId, setRoleId] = useState<string | null>(initialRoleId || null);
  const [restrictionsData, setRestrictionsData] = useState<RoleRestriction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch restrictions for the role
  const fetchRestrictions = useCallback(async () => {
    if (!roleId) {
      setRestrictionsData([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await (supabase as any)
        .from('role_restrictions')
        .select('*')
        .eq('role_id', roleId);

      if (fetchError) throw fetchError;

      setRestrictionsData((data || []) as RoleRestriction[]);
    } catch (err) {
      console.error('Error fetching restrictions:', err);
      setError(err instanceof Error ? err.message : 'فشل في جلب القيود');
    } finally {
      setLoading(false);
    }
  }, [roleId]);

  useEffect(() => {
    fetchRestrictions();
  }, [fetchRestrictions]);

  // Get array of restricted permission codes
  const restrictions = restrictionsData.map((r) => r.permission_code);

  // Check if permission is restricted
  const isRestricted = useCallback(
    (permissionCode: string): boolean => {
      return restrictions.includes(permissionCode);
    },
    [restrictions]
  );

  // Add restriction
  const addRestriction = useCallback(
    async (permissionCode: string): Promise<boolean> => {
      if (!roleId) return false;

      try {
        const { data, error } = await (supabase as any)
          .from('role_restrictions')
          .insert([{ role_id: roleId, permission_code: permissionCode }])
          .select()
          .single();

        if (error) {
          // Ignore duplicate constraint error
          if (error.code === '23505') return true;
          throw error;
        }

        // Update local state
        setRestrictionsData((prev) => [...prev, data as RoleRestriction]);
        return true;
      } catch (err) {
        console.error('Error adding restriction:', err);
        setError(err instanceof Error ? err.message : 'فشل في إضافة القيد');
        return false;
      }
    },
    [roleId]
  );

  // Remove restriction
  const removeRestriction = useCallback(
    async (permissionCode: string): Promise<boolean> => {
      if (!roleId) return false;

      try {
        const { error } = await (supabase as any)
          .from('role_restrictions')
          .delete()
          .eq('role_id', roleId)
          .eq('permission_code', permissionCode);

        if (error) throw error;

        // Update local state
        setRestrictionsData((prev) =>
          prev.filter((r) => r.permission_code !== permissionCode)
        );
        return true;
      } catch (err) {
        console.error('Error removing restriction:', err);
        setError(err instanceof Error ? err.message : 'فشل في إزالة القيد');
        return false;
      }
    },
    [roleId]
  );

  // Toggle restriction
  const toggleRestriction = useCallback(
    async (permissionCode: string): Promise<boolean> => {
      if (isRestricted(permissionCode)) {
        return removeRestriction(permissionCode);
      } else {
        return addRestriction(permissionCode);
      }
    },
    [isRestricted, addRestriction, removeRestriction]
  );

  // Restrict all (add all permission codes)
  const restrictAll = useCallback(
    async (permissionCodes: string[]): Promise<boolean> => {
      if (!roleId) return false;

      try {
        // Filter out already restricted codes
        const newCodes = permissionCodes.filter((code) => !isRestricted(code));
        if (newCodes.length === 0) return true;

        const { data, error } = await (supabase as any)
          .from('role_restrictions')
          .insert(newCodes.map((code) => ({ role_id: roleId, permission_code: code })))
          .select();

        if (error) throw error;

        // Update local state
        setRestrictionsData((prev) => [...prev, ...((data || []) as RoleRestriction[])]);
        return true;
      } catch (err) {
        console.error('Error restricting all:', err);
        setError(err instanceof Error ? err.message : 'فشل في تفعيل جميع القيود');
        return false;
      }
    },
    [roleId, isRestricted]
  );

  // Unrestrict all (remove all permission codes)
  const unrestrictAll = useCallback(
    async (permissionCodes: string[]): Promise<boolean> => {
      if (!roleId) return false;

      try {
        const { error } = await (supabase as any)
          .from('role_restrictions')
          .delete()
          .eq('role_id', roleId)
          .in('permission_code', permissionCodes);

        if (error) throw error;

        // Update local state
        setRestrictionsData((prev) =>
          prev.filter((r) => !permissionCodes.includes(r.permission_code))
        );
        return true;
      } catch (err) {
        console.error('Error unrestricting all:', err);
        setError(err instanceof Error ? err.message : 'فشل في إلغاء جميع القيود');
        return false;
      }
    },
    [roleId]
  );

  return {
    restrictions,
    restrictionsData,
    loading,
    error,
    roleId,
    setRoleId,
    isRestricted,
    toggleRestriction,
    addRestriction,
    removeRestriction,
    restrictAll,
    unrestrictAll,
    refetch: fetchRestrictions,
  };
}

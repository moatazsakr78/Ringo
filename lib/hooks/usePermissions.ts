'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/app/lib/supabase/client';
import type {
  PermissionCategory,
  PermissionDefinition,
  PermissionCategoryWithPermissions,
  CreatePermissionInput,
  UpdatePermissionInput,
  CreateCategoryInput,
} from '@/types/permissions';

interface UsePermissionsReturn {
  categories: PermissionCategory[];
  permissions: PermissionDefinition[];
  categoriesWithPermissions: PermissionCategoryWithPermissions[];
  loading: boolean;
  error: string | null;

  // Filter permissions by category
  getPermissionsByCategory: (categoryId: string) => PermissionDefinition[];
  getPermissionsByCategoryCode: (categoryCode: string) => PermissionDefinition[];

  // CRUD operations
  createPermission: (data: CreatePermissionInput) => Promise<PermissionDefinition | null>;
  updatePermission: (id: string, data: UpdatePermissionInput) => Promise<boolean>;
  deletePermission: (id: string) => Promise<boolean>;

  // Category operations
  createCategory: (data: CreateCategoryInput) => Promise<PermissionCategory | null>;

  // Refresh data
  refetch: () => Promise<void>;
}

export function usePermissions(): UsePermissionsReturn {
  const [categories, setCategories] = useState<PermissionCategory[]>([]);
  const [permissions, setPermissions] = useState<PermissionDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch categories (cast to any - tables exist in database but not in generated types yet)
      const { data: categoriesData, error: categoriesError } = await (supabase as any)
        .from('permission_categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (categoriesError) throw categoriesError;

      // Fetch permissions
      const { data: permissionsData, error: permissionsError } = await (supabase as any)
        .from('permission_definitions')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (permissionsError) throw permissionsError;

      setCategories((categoriesData || []) as PermissionCategory[]);
      setPermissions((permissionsData || []) as PermissionDefinition[]);
    } catch (err) {
      console.error('Error fetching permissions:', err);
      setError(err instanceof Error ? err.message : 'فشل في جلب البيانات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Get categories with their permissions
  const categoriesWithPermissions: PermissionCategoryWithPermissions[] = categories.map((category) => ({
    ...category,
    permissions: permissions.filter((p) => p.category_id === category.id),
  }));

  // Filter permissions by category ID
  const getPermissionsByCategory = useCallback(
    (categoryId: string): PermissionDefinition[] => {
      return permissions.filter((p) => p.category_id === categoryId);
    },
    [permissions]
  );

  // Filter permissions by category code (name_en)
  const getPermissionsByCategoryCode = useCallback(
    (categoryCode: string): PermissionDefinition[] => {
      const category = categories.find((c) => c.name_en === categoryCode);
      if (!category) return [];
      return permissions.filter((p) => p.category_id === category.id);
    },
    [categories, permissions]
  );

  // Create new permission
  const createPermission = useCallback(
    async (data: CreatePermissionInput): Promise<PermissionDefinition | null> => {
      try {
        const { data: newPermission, error } = await (supabase as any)
          .from('permission_definitions')
          .insert([data])
          .select()
          .single();

        if (error) throw error;

        // Update local state
        setPermissions((prev) => [...prev, newPermission as PermissionDefinition]);
        return newPermission;
      } catch (err) {
        console.error('Error creating permission:', err);
        setError(err instanceof Error ? err.message : 'فشل في إنشاء الصلاحية');
        return null;
      }
    },
    []
  );

  // Update permission
  const updatePermission = useCallback(
    async (id: string, data: UpdatePermissionInput): Promise<boolean> => {
      try {
        const { error } = await (supabase as any)
          .from('permission_definitions')
          .update({ ...data, updated_at: new Date().toISOString() })
          .eq('id', id);

        if (error) throw error;

        // Update local state
        setPermissions((prev) =>
          prev.map((p) => (p.id === id ? { ...p, ...data } : p))
        );
        return true;
      } catch (err) {
        console.error('Error updating permission:', err);
        setError(err instanceof Error ? err.message : 'فشل في تحديث الصلاحية');
        return false;
      }
    },
    []
  );

  // Delete permission
  const deletePermission = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const { error } = await (supabase as any)
          .from('permission_definitions')
          .delete()
          .eq('id', id);

        if (error) throw error;

        // Update local state
        setPermissions((prev) => prev.filter((p) => p.id !== id));
        return true;
      } catch (err) {
        console.error('Error deleting permission:', err);
        setError(err instanceof Error ? err.message : 'فشل في حذف الصلاحية');
        return false;
      }
    },
    []
  );

  // Create new category
  const createCategory = useCallback(
    async (data: CreateCategoryInput): Promise<PermissionCategory | null> => {
      try {
        const { data: newCategory, error } = await (supabase as any)
          .from('permission_categories')
          .insert([data])
          .select()
          .single();

        if (error) throw error;

        // Update local state
        setCategories((prev) => [...prev, newCategory as PermissionCategory]);
        return newCategory;
      } catch (err) {
        console.error('Error creating category:', err);
        setError(err instanceof Error ? err.message : 'فشل في إنشاء التصنيف');
        return null;
      }
    },
    []
  );

  return {
    categories,
    permissions,
    categoriesWithPermissions,
    loading,
    error,
    getPermissionsByCategory,
    getPermissionsByCategoryCode,
    createPermission,
    updatePermission,
    deletePermission,
    createCategory,
    refetch: fetchData,
  };
}

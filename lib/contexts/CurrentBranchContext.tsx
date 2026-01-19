'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/app/lib/supabase/client';
import { useAuth } from '../useAuth';

export interface Branch {
  id: string;
  name: string;
  name_en?: string | null;
  address: string;
  phone: string;
  is_active: boolean;
  is_default: boolean;
}

interface UserBranchAssignment {
  id: string;
  user_id: string;
  branch_id: string;
  is_default: boolean;
  branch: Branch;
}

interface CurrentBranchContextValue {
  currentBranch: Branch | null;
  userBranches: Branch[];
  setCurrentBranch: (branch: Branch) => void;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  hasMultipleBranches: boolean;
}

const STORAGE_KEY = 'current_branch';

const CurrentBranchContext = createContext<CurrentBranchContextValue | undefined>(undefined);

export function CurrentBranchProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [currentBranch, setCurrentBranchState] = useState<Branch | null>(null);
  const [userBranches, setUserBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch user's assigned branches from database
  const fetchUserBranches = useCallback(async (userId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch branches assigned to user from user_branch_assignments
      const { data: assignments, error: assignmentsError } = await supabase
        .from('user_branch_assignments')
        .select(`
          id,
          user_id,
          branch_id,
          is_default,
          branch:branches(id, name, name_en, address, phone, is_active, is_default)
        `)
        .eq('user_id', userId);

      if (assignmentsError) {
        console.error('Error fetching user branch assignments:', assignmentsError);
        // If no assignments found, fall back to getting all active branches (for admin or unassigned users)
        const { data: allBranches, error: branchesError } = await supabase
          .from('branches')
          .select('id, name, name_en, address, phone, is_active, is_default')
          .eq('is_active', true)
          .order('is_default', { ascending: false })
          .order('name', { ascending: true });

        if (branchesError) {
          setError('فشل في جلب الفروع');
          setUserBranches([]);
          return;
        }

        setUserBranches(allBranches || []);
        return;
      }

      // If user has no assignments, fall back to all active branches
      if (!assignments || assignments.length === 0) {
        const { data: allBranches, error: branchesError } = await supabase
          .from('branches')
          .select('id, name, name_en, address, phone, is_active, is_default')
          .eq('is_active', true)
          .order('is_default', { ascending: false })
          .order('name', { ascending: true });

        if (branchesError) {
          setError('فشل في جلب الفروع');
          setUserBranches([]);
          return;
        }

        setUserBranches(allBranches || []);
        return;
      }

      // Extract branches from assignments and filter active ones
      // Note: Supabase returns the joined branch as an object, not array
      const branches: Branch[] = assignments
        .map((assignment: any) => {
          const branch = assignment.branch;
          // Handle both array and object responses from Supabase
          return Array.isArray(branch) ? branch[0] : branch;
        })
        .filter((branch: Branch | null): branch is Branch => branch !== null && branch.is_active);

      // Find the default branch from assignments
      const defaultAssignment = assignments.find((a: any) => a.is_default);

      setUserBranches(branches);

      // Load saved branch from localStorage or use default
      const savedBranchId = typeof window !== 'undefined'
        ? localStorage.getItem(STORAGE_KEY)
        : null;
      let branchToSet: Branch | null = null;

      if (savedBranchId) {
        // Check if saved branch is in user's assigned branches
        branchToSet = branches.find((b: Branch) => b.id === savedBranchId) || null;
      }

      if (!branchToSet && defaultAssignment && defaultAssignment.branch) {
        // Use the default branch from assignments
        const branch = defaultAssignment.branch;
        branchToSet = Array.isArray(branch) ? branch[0] : branch;
      }

      if (!branchToSet && branches.length > 0) {
        // Use the first branch if no default is set
        branchToSet = branches[0];
      }

      if (branchToSet) {
        setCurrentBranchState(branchToSet);
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, branchToSet.id);
        }
      }
    } catch (err) {
      console.error('Error in fetchUserBranches:', err);
      setError('حدث خطأ في جلب الفروع');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Set current branch and save to localStorage
  const setCurrentBranch = useCallback((branch: Branch) => {
    setCurrentBranchState(branch);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, branch.id);
    }
  }, []);

  // Refetch branches
  const refetch = useCallback(async () => {
    if (user?.id) {
      await fetchUserBranches(user.id);
    }
  }, [user?.id, fetchUserBranches]);

  // Effect to load branches when user changes
  useEffect(() => {
    if (!isAuthenticated || !user) {
      setCurrentBranchState(null);
      setUserBranches([]);
      setIsLoading(false);
      setError(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY);
      }
      return;
    }

    fetchUserBranches(user.id);
  }, [user?.id, isAuthenticated, fetchUserBranches]);

  const value: CurrentBranchContextValue = {
    currentBranch,
    userBranches,
    setCurrentBranch,
    isLoading,
    error,
    refetch,
    hasMultipleBranches: userBranches.length > 1,
  };

  return (
    <CurrentBranchContext.Provider value={value}>
      {children}
    </CurrentBranchContext.Provider>
  );
}

export function useCurrentBranch() {
  const context = useContext(CurrentBranchContext);
  if (context === undefined) {
    throw new Error('useCurrentBranch must be used within a CurrentBranchProvider');
  }
  return context;
}

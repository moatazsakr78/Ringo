'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from '../useAuth';

interface FavoriteItem {
  id: string;
  product_id: string;
  created_at: string;
}

interface FavoritesContextType {
  favorites: FavoriteItem[];
  isLoading: boolean;
  addToFavorites: (productId: string) => Promise<boolean>;
  removeFromFavorites: (productId: string) => Promise<boolean>;
  isFavorite: (productId: string) => boolean;
  toggleFavorite: (productId: string) => Promise<boolean>;
  favoritesCount: number;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

interface FavoritesProviderProps {
  children: ReactNode;
}

export function FavoritesProvider({ children }: FavoritesProviderProps) {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user, isAuthenticated } = useAuth();

  // Load favorites from database
  const loadFavorites = useCallback(async () => {
    if (!isAuthenticated || !user?.id) {
      setFavorites([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const { supabase } = await import('@/app/lib/supabase/client');

      const { data, error } = await supabase
        .from('favorites')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading favorites:', error);
        setFavorites([]);
      } else {
        setFavorites(data || []);
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
      setFavorites([]);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user?.id]);

  // Load favorites when user changes
  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  // Check if a product is in favorites
  const isFavorite = useCallback((productId: string): boolean => {
    return favorites.some(fav => fav.product_id === productId);
  }, [favorites]);

  // Add product to favorites
  const addToFavorites = useCallback(async (productId: string): Promise<boolean> => {
    if (!isAuthenticated || !user?.id) {
      console.warn('User must be logged in to add favorites');
      return false;
    }

    // Optimistic update
    const tempId = `temp_${Date.now()}`;
    const newFavorite: FavoriteItem = {
      id: tempId,
      product_id: productId,
      created_at: new Date().toISOString()
    };
    setFavorites(prev => [newFavorite, ...prev]);

    try {
      const { supabase } = await import('@/app/lib/supabase/client');

      const { data, error } = await supabase
        .from('favorites')
        .insert({
          user_id: user.id,
          product_id: productId
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding to favorites:', error);
        // Rollback optimistic update
        setFavorites(prev => prev.filter(fav => fav.id !== tempId));
        return false;
      }

      // Update with real data
      setFavorites(prev => prev.map(fav =>
        fav.id === tempId ? data : fav
      ));
      return true;
    } catch (error) {
      console.error('Error adding to favorites:', error);
      // Rollback optimistic update
      setFavorites(prev => prev.filter(fav => fav.id !== tempId));
      return false;
    }
  }, [isAuthenticated, user?.id]);

  // Remove product from favorites
  const removeFromFavorites = useCallback(async (productId: string): Promise<boolean> => {
    if (!isAuthenticated || !user?.id) {
      return false;
    }

    // Find the favorite to remove
    const favoriteToRemove = favorites.find(fav => fav.product_id === productId);
    if (!favoriteToRemove) return false;

    // Optimistic update
    setFavorites(prev => prev.filter(fav => fav.product_id !== productId));

    try {
      const { supabase } = await import('@/app/lib/supabase/client');

      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('product_id', productId);

      if (error) {
        console.error('Error removing from favorites:', error);
        // Rollback optimistic update
        setFavorites(prev => [...prev, favoriteToRemove]);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error removing from favorites:', error);
      // Rollback optimistic update
      setFavorites(prev => [...prev, favoriteToRemove]);
      return false;
    }
  }, [isAuthenticated, user?.id, favorites]);

  // Toggle favorite status
  const toggleFavorite = useCallback(async (productId: string): Promise<boolean> => {
    if (isFavorite(productId)) {
      return removeFromFavorites(productId);
    } else {
      return addToFavorites(productId);
    }
  }, [isFavorite, addToFavorites, removeFromFavorites]);

  const value: FavoritesContextType = {
    favorites,
    isLoading,
    addToFavorites,
    removeFromFavorites,
    isFavorite,
    toggleFavorite,
    favoritesCount: favorites.length
  };

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (context === undefined) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
}

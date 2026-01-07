'use client';

import { useState } from 'react';
import { useFavorites } from '@/lib/contexts/FavoritesContext';
import { useAuth } from '@/lib/useAuth';
import { useRouter } from 'next/navigation';

interface FavoriteButtonProps {
  productId: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function FavoriteButton({ productId, size = 'md', className = '' }: FavoriteButtonProps) {
  const { isFavorite, toggleFavorite, isLoading: isFavoritesLoading } = useFavorites();
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [isAnimating, setIsAnimating] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const isFav = isFavorite(productId);

  // Size classes
  const sizeClasses = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-11 h-11'
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    // Check if user is authenticated
    if (!isAuthenticated) {
      // Redirect to login
      router.push('/auth/login?redirect=' + encodeURIComponent(window.location.pathname));
      return;
    }

    if (isProcessing || isFavoritesLoading) return;

    setIsProcessing(true);
    setIsAnimating(true);

    try {
      await toggleFavorite(productId);
    } catch (error) {
      console.error('Error toggling favorite:', error);
    } finally {
      setIsProcessing(false);
      setTimeout(() => setIsAnimating(false), 300);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={isProcessing || isFavoritesLoading}
      className={`
        ${sizeClasses[size]}
        flex items-center justify-center
        rounded-full
        transition-all duration-200
        ${isFav
          ? 'bg-red-500 hover:bg-red-600'
          : 'bg-white/90 hover:bg-white border border-gray-200'
        }
        shadow-lg hover:shadow-xl
        ${isAnimating ? 'scale-125' : 'scale-100'}
        ${isProcessing ? 'opacity-70 cursor-wait' : 'cursor-pointer'}
        ${className}
      `}
      title={isFav ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
    >
      {isProcessing ? (
        <svg
          className={`${iconSizes[size]} animate-spin ${isFav ? 'text-white' : 'text-gray-500'}`}
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : (
        <svg
          className={`${iconSizes[size]} transition-transform duration-200 ${isAnimating ? 'scale-110' : 'scale-100'}`}
          fill={isFav ? 'white' : 'none'}
          stroke={isFav ? 'white' : '#EF4444'}
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
          />
        </svg>
      )}
    </button>
  );
}

'use client';

import { useState } from 'react';
import { useFavorites } from '@/lib/contexts/FavoritesContext';

interface FavoriteButtonProps {
  productId: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function FavoriteButton({ productId, size = 'md', className = '' }: FavoriteButtonProps) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const [isAnimating, setIsAnimating] = useState(false);

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

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    // Animate
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 200);

    // Toggle - instant, no API call
    toggleFavorite(productId);
  };

  return (
    <button
      onClick={handleClick}
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
        cursor-pointer
        ${className}
      `}
      title={isFav ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
    >
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
    </button>
  );
}

'use client';

import { useState } from 'react';

interface CarouselItem {
  id: string;
  render: (item: any) => JSX.Element;
}

interface ProductCarouselProps {
  items: any[];
  renderItem: (item: any, onAddToCart?: (item: any) => Promise<void>) => JSX.Element;
  className?: string;
  itemsPerView?: number;
  onAddToCart?: (item: any) => Promise<void>;
}

export default function ProductCarousel({ 
  items, 
  renderItem, 
  className = "",
  itemsPerView = 4,
  onAddToCart 
}: ProductCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const canGoPrevious = currentIndex > 0;
  const canGoNext = currentIndex < items.length - itemsPerView;
  
  const goToPrevious = () => {
    if (canGoPrevious) {
      setCurrentIndex(Math.max(0, currentIndex - 1));
    }
  };
  
  const goToNext = () => {
    if (canGoNext) {
      setCurrentIndex(Math.min(items.length - itemsPerView, currentIndex + 1));
    }
  };
  
  // Show all items in grid if they fit
  if (items.length <= itemsPerView) {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 ${className}`}>
        {items.map((item, index) => (
          <div key={index}>
            {renderItem(item, onAddToCart)}
          </div>
        ))}
      </div>
    );
  }
  
  // Calculate how much to move per slide (one item at a time)
  const movePercentage = 100 / itemsPerView;
  
  return (
    <div className={`relative ${className}`}>
      {/* Previous Arrow (Left) */}
      <button
        onClick={goToPrevious}
        disabled={!canGoPrevious}
        className={`absolute -left-6 top-1/2 transform -translate-y-1/2 z-10 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
          canGoPrevious 
            ? 'bg-white shadow-lg hover:shadow-xl hover:scale-110 cursor-pointer' 
            : 'bg-gray-300 cursor-not-allowed opacity-30'
        }`}
      >
        <svg 
          className={`w-6 h-6 ${canGoPrevious ? 'text-gray-700' : 'text-gray-400'}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M15 19l-7-7 7-7" 
          />
        </svg>
      </button>

      {/* Carousel Content */}
      <div className="overflow-hidden mx-8">
        <div 
          className="flex gap-5 transition-all duration-700 ease-in-out"
          style={{
            transform: `translateX(-${currentIndex * movePercentage}%)`,
          }}
        >
          {items.map((item, index) => (
            <div 
              key={index} 
              className="flex-shrink-0"
              style={{ width: `calc(25% - 15px)` }}
            >
              {renderItem(item, onAddToCart)}
            </div>
          ))}
        </div>
      </div>

      {/* Next Arrow (Right) */}
      <button
        onClick={goToNext}
        disabled={!canGoNext}
        className={`absolute -right-6 top-1/2 transform -translate-y-1/2 z-10 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
          canGoNext 
            ? 'bg-white shadow-lg hover:shadow-xl hover:scale-110 cursor-pointer' 
            : 'bg-gray-300 cursor-not-allowed opacity-30'
        }`}
      >
        <svg 
          className={`w-6 h-6 ${canGoNext ? 'text-gray-700' : 'text-gray-400'}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M9 5l7 7-7 7" 
          />
        </svg>
      </button>
    </div>
  );
}
"use client";

/**
 * Skeleton loading component for POS products grid
 * Shows animated placeholders while products are loading
 */

interface ProductGridSkeletonProps {
  count?: number;
}

function ProductCardSkeleton() {
  return (
    <div className="bg-[#374151] rounded-lg p-3 animate-pulse">
      {/* Image skeleton */}
      <div className="mb-3 relative">
        <div className="aspect-square bg-gray-600 rounded-lg" />
      </div>

      {/* Name skeleton */}
      <div className="h-4 bg-gray-600 rounded mb-2 mx-auto w-3/4" />

      {/* Price skeleton */}
      <div className="h-5 bg-gray-600 rounded mx-auto w-1/2" />
    </div>
  );
}

export default function ProductGridSkeleton({ count = 12 }: ProductGridSkeletonProps) {
  return (
    <div className="flex-1 overflow-hidden">
      <div className="h-full overflow-y-auto scrollbar-hide p-4">
        <div className="grid gap-4 grid-cols-2 md:grid-cols-6">
          {Array.from({ length: count }).map((_, index) => (
            <ProductCardSkeleton key={index} />
          ))}
        </div>
      </div>
    </div>
  );
}

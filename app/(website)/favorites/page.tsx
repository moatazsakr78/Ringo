'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFavorites } from '@/lib/contexts/FavoritesContext';
import { useAuth } from '@/lib/useAuth';
import { useCompanySettings } from '@/lib/hooks/useCompanySettings';
import { useStoreTheme } from '@/lib/hooks/useStoreTheme';
import { useWebsiteCurrency } from '@/lib/hooks/useCurrency';
import FavoriteButton from '@/components/website/FavoriteButton';

interface FavoriteProduct {
  id: string;
  name: string;
  description: string | null;
  price: number;
  main_image_url: string | null;
  discount_percentage: number | null;
  discount_start_date: string | null;
  discount_end_date: string | null;
}

export default function FavoritesPage() {
  const router = useRouter();
  const { favorites, isLoading: isFavoritesLoading, removeFromFavorites } = useFavorites();
  const { user, isAuthenticated, loading: isAuthLoading } = useAuth();
  const { logoUrl, isLoading: isCompanyLoading } = useCompanySettings();
  const { primaryColor, isLoading: isThemeLoading } = useStoreTheme();
  const websiteCurrency = useWebsiteCurrency();

  const [products, setProducts] = useState<FavoriteProduct[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      router.push('/auth/login?redirect=/favorites');
    }
  }, [isAuthLoading, isAuthenticated, router]);

  // Load product details for favorites
  useEffect(() => {
    const loadProducts = async () => {
      if (favorites.length === 0) {
        setProducts([]);
        setIsLoadingProducts(false);
        return;
      }

      try {
        setIsLoadingProducts(true);
        const { supabase } = await import('@/app/lib/supabase/client');

        const productIds = favorites.map(fav => fav.product_id);

        const { data, error } = await supabase
          .from('products')
          .select('id, name, description, price, main_image_url, discount_percentage, discount_start_date, discount_end_date')
          .in('id', productIds);

        if (error) {
          console.error('Error loading favorite products:', error);
          setProducts([]);
        } else {
          // Sort products by the order they were added to favorites (most recent first)
          const sortedProducts = (data || []).sort((a, b) => {
            const aIndex = favorites.findIndex(f => f.product_id === a.id);
            const bIndex = favorites.findIndex(f => f.product_id === b.id);
            return aIndex - bIndex;
          });
          setProducts(sortedProducts);
        }
      } catch (error) {
        console.error('Error loading favorite products:', error);
        setProducts([]);
      } finally {
        setIsLoadingProducts(false);
      }
    };

    if (!isFavoritesLoading) {
      loadProducts();
    }
  }, [favorites, isFavoritesLoading]);

  // Handle remove from favorites
  const handleRemove = async (productId: string) => {
    await removeFromFavorites(productId);
  };

  // Handle product click
  const handleProductClick = (productId: string) => {
    router.push(`/product/${productId}`);
  };

  // Loading state
  if (isAuthLoading || isCompanyLoading || isThemeLoading || isFavoritesLoading || isLoadingProducts) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#c0c0c0' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-400 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل المفضلة...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen text-gray-800" style={{ backgroundColor: '#c0c0c0' }}>
      {/* Header */}
      <header className="border-b border-gray-700 py-0 relative z-40" style={{ backgroundColor: 'var(--primary-color)' }}>
        <div className="relative flex items-center min-h-[60px] md:min-h-[80px]">
          <div className="max-w-[95%] md:max-w-[95%] lg:max-w-[80%] mx-auto px-2 md:px-3 lg:px-4 flex items-center justify-between min-h-[60px] md:min-h-[80px] w-full">

            {/* Back Button - Left */}
            <button
              onClick={() => router.back()}
              className="flex items-center p-2 text-white hover:text-gray-300 transition-colors"
            >
              <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="hidden md:inline mr-2">العودة</span>
            </button>

            {/* Title - Center */}
            <div className="absolute left-1/2 transform -translate-x-1/2">
              <h1 className="text-lg md:text-2xl font-bold text-white text-center whitespace-nowrap flex items-center gap-2">
                <svg className="w-6 h-6 md:w-7 md:h-7" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                المفضلة
              </h1>
            </div>

            {/* Logo - Right */}
            <div className="flex items-center">
              <img src={logoUrl || '/assets/logo/El Farouk Group2.png'} alt="الفاروق" className="h-12 w-12 md:h-16 md:w-16 object-contain" />
            </div>

          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[98%] md:max-w-[95%] lg:max-w-[80%] mx-auto px-2 md:px-3 lg:px-4 py-4 md:py-5 lg:py-8">
        {/* Favorites Count */}
        <div className="bg-white rounded-lg p-4 mb-4 shadow-lg">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">
              المنتجات المفضلة
            </h2>
            <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-medium">
              {favorites.length} منتج
            </span>
          </div>
        </div>

        {/* Empty State */}
        {products.length === 0 ? (
          <div className="bg-white rounded-lg p-8 shadow-lg text-center">
            <div className="text-gray-400 text-6xl mb-4">
              <svg className="w-24 h-24 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-600 mb-2">
              لا توجد منتجات في المفضلة
            </h3>
            <p className="text-gray-500 mb-6">
              اضغط على القلب في أي منتج لإضافته للمفضلة
            </p>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-3 rounded-lg text-white transition-colors font-medium"
              style={{ backgroundColor: 'var(--primary-color)' }}
              onMouseEnter={(e) => {
                (e.target as HTMLButtonElement).style.backgroundColor = 'var(--primary-hover-color)';
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLButtonElement).style.backgroundColor = 'var(--primary-color)';
              }}
            >
              تصفح المنتجات
            </button>
          </div>
        ) : (
          /* Products Grid */
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4 lg:gap-6">
            {products.map((product) => (
              <div
                key={product.id}
                className="bg-white rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow cursor-pointer group"
              >
                {/* Product Image */}
                <div className="relative aspect-square">
                  <img
                    src={product.main_image_url || '/placeholder-product.svg'}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onClick={() => handleProductClick(product.id)}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = '/placeholder-product.svg';
                    }}
                  />

                  {/* Discount Badge */}
                  {product.discount_percentage && product.discount_percentage > 0 && (
                    <span className="absolute top-2 right-2 bg-red-600 text-white px-2 py-1 rounded-full text-xs font-bold">
                      -{product.discount_percentage}%
                    </span>
                  )}

                  {/* Favorite Button */}
                  <div className="absolute top-2 left-2">
                    <FavoriteButton productId={product.id} size="md" />
                  </div>
                </div>

                {/* Product Info */}
                <div className="p-3 md:p-4" onClick={() => handleProductClick(product.id)}>
                  {/* Product Name */}
                  <h3 className="font-semibold text-gray-800 text-sm md:text-base mb-2 line-clamp-2 group-hover:text-red-600 transition-colors">
                    {product.name}
                  </h3>

                  {/* Price */}
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold" style={{ color: 'var(--primary-color)' }}>
                      {product.price} {websiteCurrency}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="px-3 md:px-4 pb-3 md:pb-4 flex gap-2">
                  {/* View Product */}
                  <button
                    onClick={() => handleProductClick(product.id)}
                    className="flex-1 py-2 rounded-lg text-white text-sm font-medium transition-colors"
                    style={{ backgroundColor: 'var(--primary-color)' }}
                    onMouseEnter={(e) => {
                      (e.target as HTMLButtonElement).style.backgroundColor = 'var(--primary-hover-color)';
                    }}
                    onMouseLeave={(e) => {
                      (e.target as HTMLButtonElement).style.backgroundColor = 'var(--primary-color)';
                    }}
                  >
                    عرض المنتج
                  </button>

                  {/* Remove from Favorites */}
                  <button
                    onClick={() => handleRemove(product.id)}
                    className="w-10 h-10 flex items-center justify-center rounded-lg bg-gray-200 hover:bg-red-100 text-gray-600 hover:text-red-600 transition-colors"
                    title="إزالة من المفضلة"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

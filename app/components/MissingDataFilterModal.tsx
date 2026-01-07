'use client';

import { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

// Filter field definitions
const FILTER_SECTIONS = [
  {
    id: 'basic',
    title: 'البيانات الأساسية',
    icon: '📋',
    fields: [
      { id: 'product_code', label: 'كود المنتج' },
      { id: 'barcode', label: 'الباركود' },
      { id: 'category', label: 'المجموعة (الفئة)' },
      { id: 'description', label: 'الوصف' },
    ]
  },
  {
    id: 'prices',
    title: 'الأسعار',
    icon: '💰',
    fields: [
      { id: 'cost_price', label: 'سعر الشراء' },
      { id: 'price', label: 'سعر البيع' },
      { id: 'wholesale_price', label: 'سعر الجملة' },
      { id: 'price1', label: 'سعر 1' },
      { id: 'price2', label: 'سعر 2' },
      { id: 'price3', label: 'سعر 3' },
      { id: 'price4', label: 'سعر 4' },
    ]
  },
  {
    id: 'inventory',
    title: 'المخزون',
    icon: '📦',
    fields: [
      { id: 'stock', label: 'المخزون' },
    ]
  },
  {
    id: 'media',
    title: 'الوسائط',
    icon: '🖼️',
    fields: [
      { id: 'images', label: 'الصور' },
      { id: 'videos', label: 'الفيديوهات' },
    ]
  }
];

interface MissingDataFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: Set<string>, filterMode: 'OR' | 'AND') => void;
  initialFilters?: Set<string>;
  initialFilterMode?: 'OR' | 'AND';
  isMobile?: boolean;
}

export default function MissingDataFilterModal({
  isOpen,
  onClose,
  onApply,
  initialFilters = new Set(),
  initialFilterMode = 'OR',
  isMobile = false
}: MissingDataFilterModalProps) {
  const [selectedFilters, setSelectedFilters] = useState<Set<string>>(new Set(initialFilters));
  const [filterMode, setFilterMode] = useState<'OR' | 'AND'>(initialFilterMode);

  // Sync with initial values when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedFilters(new Set(initialFilters));
      setFilterMode(initialFilterMode);
    }
  }, [isOpen, initialFilters, initialFilterMode]);

  const toggleFilter = (fieldId: string) => {
    setSelectedFilters(prev => {
      const newFilters = new Set(prev);
      if (newFilters.has(fieldId)) {
        newFilters.delete(fieldId);
      } else {
        newFilters.add(fieldId);
      }
      return newFilters;
    });
  };

  const handleApply = () => {
    onApply(selectedFilters, filterMode);
    onClose();
  };

  const handleClear = () => {
    setSelectedFilters(new Set());
  };

  const handleCancel = () => {
    setSelectedFilters(new Set(initialFilters));
    setFilterMode(initialFilterMode);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={handleCancel}
      />

      {/* Modal */}
      <div className={`
        relative bg-[#1F2937] rounded-lg shadow-xl border border-gray-600
        ${isMobile
          ? 'w-full h-full max-h-full rounded-none'
          : 'w-full max-w-md max-h-[90vh]'
        }
        flex flex-col
      `}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-600">
          <h2 className="text-lg font-bold text-white">منتجات بدون</h2>
          <button
            onClick={handleCancel}
            className="p-1 text-gray-400 hover:text-white transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Filter Mode Toggle */}
        <div className="px-4 py-3 border-b border-gray-700 bg-[#374151]">
          <p className="text-sm text-gray-300 mb-2">نوع الفلترة:</p>
          <div className="flex gap-2">
            <button
              onClick={() => setFilterMode('OR')}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                filterMode === 'OR'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
              }`}
            >
              أي واحد منهم (OR)
            </button>
            <button
              onClick={() => setFilterMode('AND')}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                filterMode === 'AND'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
              }`}
            >
              كلهم معاً (AND)
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {FILTER_SECTIONS.map((section) => (
            <div key={section.id} className="bg-[#374151] rounded-lg overflow-hidden">
              {/* Section Header */}
              <div className="flex items-center gap-2 px-4 py-2 bg-[#2B3544] border-b border-gray-600">
                <span>{section.icon}</span>
                <span className="text-white font-medium">{section.title}</span>
              </div>

              {/* Section Fields */}
              <div className="p-3 space-y-2">
                {section.fields.map((field) => (
                  <label
                    key={field.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#4B5563] cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedFilters.has(field.id)}
                      onChange={() => toggleFilter(field.id)}
                      className="w-5 h-5 rounded border-gray-500 text-blue-600 focus:ring-blue-500 focus:ring-offset-0 bg-gray-700"
                    />
                    <span className="text-gray-200">{field.label}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-600 bg-[#1F2937]">
          {/* Selection count */}
          {selectedFilters.size > 0 && (
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-400">
                {selectedFilters.size} فلتر مختار
              </span>
              <button
                onClick={handleClear}
                className="text-sm text-red-400 hover:text-red-300 transition-colors"
              >
                مسح الكل
              </button>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleCancel}
              className="flex-1 py-3 px-4 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-500 transition-colors"
            >
              إلغاء
            </button>
            <button
              onClick={handleApply}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
                selectedFilters.size > 0
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-500 text-gray-300'
              }`}
            >
              تطبيق {selectedFilters.size > 0 ? `(${selectedFilters.size})` : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Export filter field IDs for use in filtering logic
export const FILTER_FIELD_IDS = FILTER_SECTIONS.flatMap(section =>
  section.fields.map(field => field.id)
);

// Export helper function to check if a product is missing data based on filter
export function isProductMissingData(product: any, fieldId: string): boolean {
  switch (fieldId) {
    case 'product_code':
      return !product.product_code || product.product_code.trim() === '';
    case 'barcode':
      return !product.barcode || product.barcode.trim() === '';
    case 'category':
      // Products without category or in the root "منتجات" category
      return !product.category_id || product.category?.name === 'منتجات';
    case 'description':
      return !product.description || product.description.trim() === '';
    case 'cost_price':
      return !product.cost_price || product.cost_price === 0;
    case 'price':
      return !product.price || product.price === 0;
    case 'wholesale_price':
      return !product.wholesale_price || product.wholesale_price === 0;
    case 'price1':
      return !product.price1 || product.price1 === 0;
    case 'price2':
      return !product.price2 || product.price2 === 0;
    case 'price3':
      return !product.price3 || product.price3 === 0;
    case 'price4':
      return !product.price4 || product.price4 === 0;
    case 'stock':
      const totalQty = product.totalQuantity ?? product.stock ?? 0;
      return totalQty === 0;
    case 'images':
      const hasMainImage = product.main_image_url && product.main_image_url.trim() !== '';
      const hasAllImages = product.allImages && product.allImages.length > 0;
      return !hasMainImage && !hasAllImages;
    case 'videos':
      const hasVideoUrl = product.video_url && product.video_url.trim() !== '';
      const hasVideos = product.productVideos && product.productVideos.length > 0;
      return !hasVideoUrl && !hasVideos;
    default:
      return false;
  }
}

// Export helper function to filter products by missing data
export function filterProductsByMissingData(
  products: any[],
  filters: Set<string>,
  mode: 'OR' | 'AND'
): any[] {
  if (filters.size === 0) return products;

  const filterArray = Array.from(filters);

  return products.filter(product => {
    if (mode === 'OR') {
      // OR: Product matches if it's missing ANY of the selected fields
      return filterArray.some(fieldId => isProductMissingData(product, fieldId));
    } else {
      // AND: Product matches if it's missing ALL of the selected fields
      return filterArray.every(fieldId => isProductMissingData(product, fieldId));
    }
  });
}

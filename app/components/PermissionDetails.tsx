'use client'

import { useState, useEffect } from 'react'
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline'

interface PagePermission {
  id: string
  name: string
  description: string
  enabled: boolean
  category: 'button' | 'feature' | 'view'
}

interface PermissionDetailsProps {
  pageName: string
  pageId: string
  onClose: () => void
  isSelected?: boolean
}

const pagePermissionsData: { [key: string]: PagePermission[] } = {
  'pos': [
    { id: 'pos-register', name: 'الخزنة', description: 'الوصول إلى الخزنة ومراجعة العمليات', enabled: true, category: 'feature' },
    { id: 'pos-branch-transfer', name: 'تحويل فرع', description: 'تحويل المبيعات والمخزون بين الفروع', enabled: true, category: 'feature' },
    { id: 'pos-purchase-mode', name: 'وضع الشراء', description: 'تفعيل وضع الشراء لعمليات المشتريات', enabled: false, category: 'feature' },
    { id: 'pos-inventory-transfer', name: 'نقل البضاعة', description: 'نقل البضائع والمنتجات بين المواقع', enabled: true, category: 'feature' }
  ],
  'products': [
    { id: 'products-new-group', name: 'مجموعة جديدة', description: 'إنشاء مجموعة منتجات جديدة', enabled: true, category: 'button' },
    { id: 'products-edit-group', name: 'تحرير المجموعة', description: 'تعديل بيانات مجموعات المنتجات', enabled: true, category: 'button' },
    { id: 'products-delete-group', name: 'حذف المجموعة', description: 'حذف مجموعات المنتجات من النظام', enabled: false, category: 'button' },
    { id: 'products-new-product', name: 'منتج جديد', description: 'إضافة منتج جديد للنظام', enabled: true, category: 'button' },
    { id: 'products-edit-product', name: 'تحرير المنتج', description: 'تعديل بيانات المنتجات الموجودة', enabled: true, category: 'button' },
    { id: 'products-delete-product', name: 'حذف المنتج', description: 'حذف منتجات من النظام', enabled: false, category: 'button' },
    { id: 'products-assign-color', name: 'تحديد اللون', description: 'تحديد وتعيين ألوان للمنتجات', enabled: true, category: 'button' },
    { id: 'products-change-color', name: 'تغيير اللون', description: 'تغيير ألوان المنتجات الموجودة', enabled: true, category: 'button' }
  ],
  'inventory': [
    { id: 'inventory-adjust-stock', name: 'تعديل المخزون', description: 'تعديل كميات المخزون', enabled: true, category: 'button' },
    { id: 'inventory-transfer', name: 'نقل مخزون', description: 'نقل المخزون بين المواقع', enabled: true, category: 'button' },
    { id: 'inventory-stocktake', name: 'جرد المخزون', description: 'إجراء عمليات الجرد', enabled: false, category: 'feature' },
    { id: 'inventory-low-stock-alerts', name: 'تنبيهات النقص', description: 'عرض تنبيهات نقص المخزون', enabled: true, category: 'view' },
    { id: 'inventory-reports', name: 'تقارير المخزون', description: 'عرض تقارير المخزون', enabled: true, category: 'view' }
  ],
  'customers': [
    { id: 'customers-add', name: 'إضافة عميل', description: 'إضافة عملاء جدد', enabled: true, category: 'button' },
    { id: 'customers-edit', name: 'تعديل عميل', description: 'تعديل بيانات العملاء', enabled: true, category: 'button' },
    { id: 'customers-delete', name: 'حذف عميل', description: 'حذف عملاء من النظام', enabled: false, category: 'button' },
    { id: 'customers-view-history', name: 'سجل العميل', description: 'عرض سجل مشتريات العميل', enabled: true, category: 'view' },
    { id: 'customers-credit-limit', name: 'إدارة الائتمان', description: 'إدارة حدود الائتمان للعملاء', enabled: false, category: 'feature' }
  ],
  'suppliers': [
    { id: 'suppliers-add', name: 'إضافة مورد', description: 'إضافة موردين جدد', enabled: true, category: 'button' },
    { id: 'suppliers-edit', name: 'تعديل مورد', description: 'تعديل بيانات الموردين', enabled: true, category: 'button' },
    { id: 'suppliers-delete', name: 'حذف مورد', description: 'حذف موردين من النظام', enabled: false, category: 'button' },
    { id: 'suppliers-purchase-orders', name: 'أوامر الشراء', description: 'إنشاء وإدارة أوامر الشراء', enabled: true, category: 'feature' },
    { id: 'suppliers-payment-history', name: 'سجل المدفوعات', description: 'عرض سجل المدفوعات للموردين', enabled: true, category: 'view' }
  ],
  'customer-orders': [
    { id: 'orders-view-all', name: 'عرض جميع الطلبات', description: 'عرض جميع طلبات العملاء', enabled: true, category: 'view' },
    { id: 'orders-change-status', name: 'تغيير حالة الطلب', description: 'تغيير حالة طلبات العملاء', enabled: true, category: 'button' },
    { id: 'orders-cancel', name: 'إلغاء طلب', description: 'إلغاء طلبات العملاء', enabled: false, category: 'button' },
    { id: 'orders-print-invoice', name: 'طباعة الفاتورة', description: 'طباعة فواتير الطلبات', enabled: true, category: 'button' }
  ],
  'records': [
    { id: 'records-add', name: 'إضافة خزنة', description: 'إضافة خزن جديدة', enabled: true, category: 'button' },
    { id: 'records-edit', name: 'تعديل خزنة', description: 'تعديل الخزن الموجودة', enabled: true, category: 'button' },
    { id: 'records-delete', name: 'حذف خزنة', description: 'حذف الخزن', enabled: false, category: 'button' },
    { id: 'records-search', name: 'البحث في الخزن', description: 'البحث والتصفية في الخزن', enabled: true, category: 'feature' }
  ],
  'store-customer-orders': [
    { id: 'store-orders-view', name: 'عرض طلبات المتجر', description: 'عرض طلبات عملاء المتجر', enabled: true, category: 'view' },
    { id: 'store-orders-process', name: 'معالجة الطلبات', description: 'معالجة وتحضير طلبات المتجر', enabled: true, category: 'button' },
    { id: 'store-orders-ship', name: 'شحن الطلبات', description: 'إدارة شحن طلبات المتجر', enabled: true, category: 'feature' }
  ],
  'store-products': [
    { id: 'store-products-manage', name: 'إدارة منتجات المتجر', description: 'إدارة المنتجات المعروضة في المتجر', enabled: true, category: 'feature' },
    { id: 'store-products-pricing', name: 'إدارة الأسعار', description: 'تحديد أسعار منتجات المتجر', enabled: true, category: 'feature' },
    { id: 'store-products-visibility', name: 'إظهار/إخفاء المنتجات', description: 'التحكم في ظهور المنتجات للعملاء', enabled: true, category: 'button' }
  ],
  'store-management': [
    { id: 'store-settings', name: 'إعدادات المتجر', description: 'إدارة إعدادات المتجر العامة', enabled: true, category: 'feature' },
    { id: 'store-themes', name: 'إدارة القوالب', description: 'تغيير وإدارة قوالب المتجر', enabled: false, category: 'feature' },
    { id: 'store-seo', name: 'إعدادات SEO', description: 'إدارة إعدادات تحسين محركات البحث', enabled: true, category: 'feature' }
  ],
  'shipping-details': [
    { id: 'shipping-zones', name: 'مناطق الشحن', description: 'إدارة مناطق وتكاليف الشحن', enabled: true, category: 'feature' },
    { id: 'shipping-methods', name: 'طرق الشحن', description: 'إدارة طرق الشحن المتاحة', enabled: true, category: 'feature' },
    { id: 'shipping-tracking', name: 'تتبع الشحنات', description: 'تتبع حالة الشحنات', enabled: true, category: 'view' }
  ]
}

export default function PermissionDetails({ pageName, pageId, onClose, isSelected }: PermissionDetailsProps) {
  const [permissions, setPermissions] = useState<PagePermission[]>(
    pagePermissionsData[pageId] || []
  )

  // تحديث البيانات عند تغيير pageId
  useEffect(() => {
    setPermissions(pagePermissionsData[pageId] || [])
  }, [pageId])

  const togglePermission = (permissionId: string) => {
    setPermissions(prev => 
      prev.map(perm => 
        perm.id === permissionId 
          ? { ...perm, enabled: !perm.enabled }
          : perm
      )
    )
  }

  const getCategoryIcon = (category: 'button' | 'feature' | 'view') => {
    switch (category) {
      case 'button':
        return '🔲'
      case 'feature':
        return '⚙️'
      case 'view':
        return '👁️'
      default:
        return '📋'
    }
  }

  const getCategoryColor = (category: 'button' | 'feature' | 'view') => {
    switch (category) {
      case 'button':
        return 'text-blue-400'
      case 'feature':
        return 'text-purple-400'
      case 'view':
        return 'text-green-400'
      default:
        return 'text-gray-400'
    }
  }

  const enabledCount = permissions.filter(p => p.enabled).length

  return (
    <div className={`bg-[#2B3544] rounded-lg border overflow-hidden transition-all ${
      isSelected ? 'border-blue-500 shadow-lg shadow-blue-500/20' : 'border-gray-600'
    }`}>
      {/* Header */}
      <div className="bg-[#374151] px-6 py-4 border-b border-gray-600">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">{pageName}</h3>
            <p className="text-sm text-gray-400 mt-1">
              إدارة صلاحيات هذه الصفحة ({enabledCount} من {permissions.length} مفعلة)
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* Permissions List */}
      <div className="p-6">
        {permissions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400">لا توجد صلاحيات محددة لهذه الصفحة حالياً</p>
            <p className="text-gray-500 text-sm mt-2">سيتم إضافة الصلاحيات عند تطوير الصفحة</p>
          </div>
        ) : (
          <div className="space-y-3">
            {permissions.map((permission) => (
              <div
                key={permission.id}
                className={`flex items-center gap-4 p-4 rounded-lg border transition-all ${
                  permission.enabled
                    ? 'bg-[#374151] border-blue-500/30 shadow-sm'
                    : 'bg-gray-700/30 border-gray-600'
                }`}
              >
                {/* Checkbox */}
                <button
                  onClick={() => togglePermission(permission.id)}
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                    permission.enabled
                      ? 'bg-blue-600 border-blue-600'
                      : 'border-gray-500 hover:border-gray-400'
                  }`}
                >
                  {permission.enabled && (
                    <CheckIcon className="h-3 w-3 text-white" />
                  )}
                </button>

                {/* Permission Details */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm">{getCategoryIcon(permission.category)}</span>
                    <h4 className={`font-medium ${
                      permission.enabled ? 'text-white' : 'text-gray-400'
                    }`}>
                      {permission.name}
                    </h4>
                    <span className={`text-xs px-2 py-1 rounded-full ${getCategoryColor(permission.category)} bg-opacity-20`}>
                      {permission.category === 'button' ? 'زر' : 
                       permission.category === 'feature' ? 'ميزة' : 'عرض'}
                    </span>
                  </div>
                  <p className={`text-sm ${
                    permission.enabled ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    {permission.description}
                  </p>
                </div>

                {/* Status Indicator */}
                <div className={`w-2 h-2 rounded-full ${
                  permission.enabled ? 'bg-green-500' : 'bg-gray-500'
                }`}></div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-[#374151] px-6 py-4 border-t border-gray-600">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-400">
            <span className="text-green-400 font-medium">{enabledCount}</span> مفعلة من أصل{' '}
            <span className="text-white font-medium">{permissions.length}</span> صلاحية
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setPermissions(prev => prev.map(p => ({ ...p, enabled: true })))
              }}
              className="text-sm px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              تفعيل الكل
            </button>
            <button
              onClick={() => {
                setPermissions(prev => prev.map(p => ({ ...p, enabled: false })))
              }}
              className="text-sm px-3 py-1 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              إلغاء الكل
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
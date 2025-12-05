/**
 * إدارة تكلفة الشراء للمنتجات
 * Purchase Cost Management for Products
 */

import { supabase } from '../supabase/client'
import { calculateWeightedAverageCost, WeightedAverageCostParams } from './weighted-average-cost'

export interface PurchaseHistoryCheck {
  hasPurchaseHistory: boolean
  canEditCost: boolean
  lastPurchaseDate: string | null
  totalPurchases: number
  message?: string
}

export interface ProductCostUpdate {
  productId: string
  newAverageCost: number
  totalQuantityPurchased: number
  totalCostAccumulated: number
  lastPurchasePrice: number
  lastPurchaseDate: string
}

/**
 * التحقق من حالة المنتج وإمكانية تعديل سعر الشراء
 * Check product status and ability to edit purchase cost
 */
export async function checkProductPurchaseHistory(productId: string): Promise<PurchaseHistoryCheck> {
  try {
    // البحث في جدول purchase_invoice_items عن المنتج
    const { data: purchaseItems, error } = await supabase
      .from('purchase_invoice_items')
      .select(`
        quantity,
        unit_purchase_price,
        created_at,
        purchase_invoice_id,
        purchase_invoices (
          invoice_date,
          is_active
        )
      `)
      .eq('product_id', productId)
      .eq('purchase_invoices.is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error checking purchase history:', error)
      return {
        hasPurchaseHistory: false,
        canEditCost: true,
        lastPurchaseDate: null,
        totalPurchases: 0,
        message: 'حدث خطأ في التحقق من تاريخ الشراء'
      }
    }

    const totalPurchases = purchaseItems?.length || 0
    const hasPurchaseHistory = totalPurchases > 0

    if (!hasPurchaseHistory) {
      return {
        hasPurchaseHistory: false,
        canEditCost: true,
        lastPurchaseDate: null,
        totalPurchases: 0,
        message: 'يمكن تعديل سعر الشراء - لا توجد فواتير شراء'
      }
    }

    // إذا كان هناك فواتير شراء، لا يمكن تعديل السعر يدوياً
    const lastPurchase = purchaseItems[0]
    const purchaseInvoice = Array.isArray(lastPurchase?.purchase_invoices)
      ? lastPurchase.purchase_invoices[0]
      : lastPurchase?.purchase_invoices
    const lastPurchaseDate = purchaseInvoice?.invoice_date || lastPurchase?.created_at

    return {
      hasPurchaseHistory: true,
      canEditCost: false,
      lastPurchaseDate,
      totalPurchases,
      message: `لا يمكن تعديل سعر الشراء - يتم حسابه تلقائياً من ${totalPurchases} فاتورة شراء`
    }

  } catch (error) {
    console.error('Error in checkProductPurchaseHistory:', error)
    return {
      hasPurchaseHistory: false,
      canEditCost: true,
      lastPurchaseDate: null,
      totalPurchases: 0,
      message: 'حدث خطأ في التحقق من تاريخ الشراء'
    }
  }
}

/**
 * حساب وتحديث تكلفة المنتج بعد شراء جديد
 * Calculate and update product cost after new purchase
 */
export async function updateProductCostAfterPurchase(
  productId: string,
  newPurchaseQuantity: number,
  newPurchaseUnitCost: number
): Promise<ProductCostUpdate | null> {
  try {
    // الحصول على بيانات التكلفة الحالية من product_cost_tracking
    const { data: costTracking, error: costError } = await supabase
      .from('product_cost_tracking')
      .select('*')
      .eq('product_id', productId)
      .single()

    if (costError && costError.code !== 'PGRST116') {
      console.error('Error fetching cost tracking:', costError)
      return null
    }

    // الحصول على المخزون الحالي من الفروع
    const { data: inventory, error: invError } = await supabase
      .from('inventory')
      .select('quantity')
      .eq('product_id', productId)

    if (invError) {
      console.error('Error fetching inventory:', invError)
      return null
    }

    const currentStockQuantity = inventory?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0
    const currentCostPerUnit = costTracking?.average_cost || 0

    // حساب متوسط التكلفة المرجح الجديد
    const costParams: WeightedAverageCostParams = {
      current_stock_quantity: currentStockQuantity,
      current_cost_per_unit: currentCostPerUnit,
      new_purchase_quantity: newPurchaseQuantity,
      new_purchase_unit_cost: newPurchaseUnitCost
    }

    const result = calculateWeightedAverageCost(costParams)

    // تحديث أو إنشاء سجل product_cost_tracking
    const updateData = {
      product_id: productId,
      average_cost: result.updated_cost_per_unit,
      total_quantity_purchased: (costTracking?.total_quantity_purchased || 0) + newPurchaseQuantity,
      total_cost: result.total_cost,
      last_purchase_price: newPurchaseUnitCost,
      last_purchase_date: new Date().toISOString(),
      has_purchase_history: true,
      updated_at: new Date().toISOString()
    }

    if (costTracking) {
      // تحديث السجل الموجود
      const { error: updateError } = await supabase
        .from('product_cost_tracking')
        .update(updateData)
        .eq('id', costTracking.id)

      if (updateError) {
        console.error('Error updating cost tracking:', updateError)
        return null
      }
    } else {
      // إنشاء سجل جديد
      const { error: insertError } = await supabase
        .from('product_cost_tracking')
        .insert(updateData)

      if (insertError) {
        console.error('Error inserting cost tracking:', insertError)
        return null
      }
    }

    // تحديث cost_price في جدول المنتجات
    const { error: productUpdateError } = await supabase
      .from('products')
      .update({
        cost_price: result.updated_cost_per_unit,
        updated_at: new Date().toISOString()
      })
      .eq('id', productId)

    if (productUpdateError) {
      console.error('Error updating product cost_price:', productUpdateError)
      return null
    }

    return {
      productId,
      newAverageCost: result.updated_cost_per_unit,
      totalQuantityPurchased: updateData.total_quantity_purchased,
      totalCostAccumulated: result.total_cost,
      lastPurchasePrice: newPurchaseUnitCost,
      lastPurchaseDate: updateData.last_purchase_date
    }

  } catch (error) {
    console.error('Error in updateProductCostAfterPurchase:', error)
    return null
  }
}

/**
 * حساب التكلفة المحدثة بدون حفظ في قاعدة البيانات (للمعاينة)
 * Calculate updated cost without saving to database (for preview)
 */
export async function previewCostUpdate(
  productId: string,
  newPurchaseQuantity: number,
  newPurchaseUnitCost: number
): Promise<{ currentCost: number; newCost: number; difference: number } | null> {
  try {
    const { data: costTracking } = await supabase
      .from('product_cost_tracking')
      .select('average_cost')
      .eq('product_id', productId)
      .single()

    const { data: inventory } = await supabase
      .from('inventory')
      .select('quantity')
      .eq('product_id', productId)

    const currentStockQuantity = inventory?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0
    const currentCostPerUnit = costTracking?.average_cost || 0

    const result = calculateWeightedAverageCost({
      current_stock_quantity: currentStockQuantity,
      current_cost_per_unit: currentCostPerUnit,
      new_purchase_quantity: newPurchaseQuantity,
      new_purchase_unit_cost: newPurchaseUnitCost
    })

    return {
      currentCost: currentCostPerUnit,
      newCost: result.updated_cost_per_unit,
      difference: result.updated_cost_per_unit - currentCostPerUnit
    }

  } catch (error) {
    console.error('Error in previewCostUpdate:', error)
    return null
  }
}
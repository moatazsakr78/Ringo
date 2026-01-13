/**
 * خدمة تحويل العميل لمورد والمورد لعميل
 * Party Conversion Service - Customer to Supplier and vice versa
 */

import { supabase } from '../supabase/client';

// Types
export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  company_name: string | null;
  contact_person: string | null;
  tax_id: string | null;
  account_balance: number | null;
  credit_limit: number | null;
  category: string | null;
  rank: string | null;
  notes: string | null;
  is_active: boolean | null;
  opening_balance?: number | null;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  company_name: string | null;
  contact_person: string | null;
  tax_id: string | null;
  account_balance: number | null;
  credit_limit: number | null;
  category: string | null;
  rank: string | null;
  notes: string | null;
  is_active: boolean | null;
  opening_balance?: number | null;
}

export interface ConversionResult {
  success: boolean;
  newId?: string;
  error?: string;
}

/**
 * تحويل العميل لمورد
 * Converts a customer to a supplier
 * - Creates a new supplier record with the customer's data
 * - Marks the original customer as inactive
 * - Stores reference to the new supplier
 */
export async function convertCustomerToSupplier(customerId: string): Promise<ConversionResult> {
  try {
    // 1. جلب بيانات العميل
    const { data: customer, error: fetchError } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single();

    if (fetchError || !customer) {
      return {
        success: false,
        error: fetchError?.message || 'لم يتم العثور على العميل'
      };
    }

    // 2. التحقق من أن العميل نشط ولم يتم تحويله من قبل
    if (!customer.is_active) {
      return {
        success: false,
        error: 'العميل غير نشط ولا يمكن تحويله'
      };
    }

    if (customer.converted_to_supplier_id) {
      return {
        success: false,
        error: 'تم تحويل هذا العميل لمورد من قبل'
      };
    }

    // 3. إنشاء سجل المورد الجديد بالبيانات المشتركة
    const supplierData = {
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      address: customer.address,
      city: customer.city,
      country: customer.country,
      company_name: customer.company_name,
      contact_person: customer.contact_person,
      tax_id: customer.tax_id,
      account_balance: 0, // يبدأ المورد برصيد صفر
      credit_limit: customer.credit_limit,
      category: customer.category,
      rank: customer.rank,
      notes: customer.notes ? `تم التحويل من عميل: ${customer.notes}` : 'تم التحويل من عميل',
      is_active: true,
      opening_balance: 0
    };

    const { data: newSupplier, error: insertError } = await supabase
      .from('suppliers')
      .insert(supplierData)
      .select('id')
      .single();

    if (insertError || !newSupplier) {
      return {
        success: false,
        error: insertError?.message || 'فشل في إنشاء سجل المورد'
      };
    }

    // 4. تحديث سجل العميل الأصلي
    const { error: updateError } = await supabase
      .from('customers')
      .update({
        is_active: false,
        converted_to_supplier_id: newSupplier.id,
        conversion_date: new Date().toISOString(),
        notes: customer.notes
          ? `${customer.notes}\n[تم التحويل لمورد بتاريخ ${new Date().toLocaleDateString('ar-EG')}]`
          : `[تم التحويل لمورد بتاريخ ${new Date().toLocaleDateString('ar-EG')}]`
      })
      .eq('id', customerId);

    if (updateError) {
      // محاولة التراجع - حذف المورد الجديد
      await supabase.from('suppliers').delete().eq('id', newSupplier.id);
      return {
        success: false,
        error: updateError.message || 'فشل في تحديث سجل العميل'
      };
    }

    return {
      success: true,
      newId: newSupplier.id
    };

  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'حدث خطأ غير متوقع'
    };
  }
}

/**
 * تحويل المورد لعميل
 * Converts a supplier to a customer
 * - Creates a new customer record with the supplier's data
 * - Marks the original supplier as inactive
 * - Stores reference to the new customer
 */
export async function convertSupplierToCustomer(supplierId: string): Promise<ConversionResult> {
  try {
    // 1. جلب بيانات المورد
    const { data: supplier, error: fetchError } = await supabase
      .from('suppliers')
      .select('*')
      .eq('id', supplierId)
      .single();

    if (fetchError || !supplier) {
      return {
        success: false,
        error: fetchError?.message || 'لم يتم العثور على المورد'
      };
    }

    // 2. التحقق من أن المورد نشط ولم يتم تحويله من قبل
    if (!supplier.is_active) {
      return {
        success: false,
        error: 'المورد غير نشط ولا يمكن تحويله'
      };
    }

    if (supplier.converted_to_customer_id) {
      return {
        success: false,
        error: 'تم تحويل هذا المورد لعميل من قبل'
      };
    }

    // 3. إنشاء سجل العميل الجديد بالبيانات المشتركة
    const customerData = {
      name: supplier.name,
      phone: supplier.phone,
      email: supplier.email,
      address: supplier.address,
      city: supplier.city,
      country: supplier.country,
      company_name: supplier.company_name,
      contact_person: supplier.contact_person,
      tax_id: supplier.tax_id,
      account_balance: 0, // يبدأ العميل برصيد صفر
      credit_limit: supplier.credit_limit,
      category: supplier.category,
      rank: supplier.rank,
      notes: supplier.notes ? `تم التحويل من مورد: ${supplier.notes}` : 'تم التحويل من مورد',
      is_active: true,
      loyalty_points: 0,
      opening_balance: 0
    };

    const { data: newCustomer, error: insertError } = await supabase
      .from('customers')
      .insert(customerData)
      .select('id')
      .single();

    if (insertError || !newCustomer) {
      return {
        success: false,
        error: insertError?.message || 'فشل في إنشاء سجل العميل'
      };
    }

    // 4. تحديث سجل المورد الأصلي
    const { error: updateError } = await supabase
      .from('suppliers')
      .update({
        is_active: false,
        converted_to_customer_id: newCustomer.id,
        conversion_date: new Date().toISOString(),
        notes: supplier.notes
          ? `${supplier.notes}\n[تم التحويل لعميل بتاريخ ${new Date().toLocaleDateString('ar-EG')}]`
          : `[تم التحويل لعميل بتاريخ ${new Date().toLocaleDateString('ar-EG')}]`
      })
      .eq('id', supplierId);

    if (updateError) {
      // محاولة التراجع - حذف العميل الجديد
      await supabase.from('customers').delete().eq('id', newCustomer.id);
      return {
        success: false,
        error: updateError.message || 'فشل في تحديث سجل المورد'
      };
    }

    return {
      success: true,
      newId: newCustomer.id
    };

  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'حدث خطأ غير متوقع'
    };
  }
}

/**
 * جلب معلومات العميل مع حساب الرصيد
 */
export async function getCustomerWithBalance(customerId: string): Promise<{
  customer: Customer | null;
  balance: number;
  error?: string;
}> {
  try {
    const { data: customer, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single();

    if (error || !customer) {
      return { customer: null, balance: 0, error: error?.message };
    }

    // حساب الرصيد باستخدام الدالة المخزنة
    const { data: balanceData } = await supabase
      .rpc('calculate_customer_balances' as any);

    const balanceRecord = (balanceData || []).find(
      (b: any) => b.customer_id === customerId
    );

    return {
      customer,
      balance: Number(balanceRecord?.calculated_balance) || 0
    };

  } catch (error: any) {
    return { customer: null, balance: 0, error: error.message };
  }
}

/**
 * جلب معلومات المورد مع حساب الرصيد
 */
export async function getSupplierWithBalance(supplierId: string): Promise<{
  supplier: Supplier | null;
  balance: number;
  error?: string;
}> {
  try {
    const { data: supplier, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('id', supplierId)
      .single();

    if (error || !supplier) {
      return { supplier: null, balance: 0, error: error?.message };
    }

    // جلب رصيد المورد من دالة RPC المركزية
    const { data: balancesData } = await supabase.rpc('calculate_supplier_balances' as any);

    const balanceRecord = (balancesData || []).find(
      (b: any) => b.supplier_id === supplierId
    );

    const balance = Number(balanceRecord?.calculated_balance) || 0;

    return {
      supplier,
      balance
    };

  } catch (error: any) {
    return { supplier: null, balance: 0, error: error.message };
  }
}

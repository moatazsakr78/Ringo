import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '../../../lib/supabase/admin'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')

    if (!productId) {
      return NextResponse.json(
        { success: false, error: 'Product ID is required' },
        { status: 400 }
      )
    }

    const supabaseAdmin = getSupabaseAdmin()

    // ✅ Get variant definitions from new system (product_color_shape_definitions)
    // @ts-ignore
    const { data: definitions, error: defsError } = await supabaseAdmin
      .from('product_color_shape_definitions')
      .select('*')
      .eq('product_id', productId)
      .order('sort_order', { ascending: true })

    if (defsError) {
      console.error('❌ Error fetching variant definitions:', defsError)
      return NextResponse.json(
        { success: false, error: defsError.message },
        { status: 500 }
      )
    }

    if (!definitions || definitions.length === 0) {
      return NextResponse.json({
        success: true,
        data: []
      })
    }

    // ✅ Get quantities for these definitions
    const definitionIds = definitions.map(d => d.id)
    // @ts-ignore
    const { data: quantities, error: qtysError } = await supabaseAdmin
      .from('product_variant_quantities')
      .select('*')
      .in('variant_definition_id', definitionIds)

    if (qtysError) {
      console.error('❌ Error fetching variant quantities:', qtysError)
      return NextResponse.json(
        { success: false, error: qtysError.message },
        { status: 500 }
      )
    }

    // ✅ Combine definitions and quantities into the old format for compatibility
    const variants = definitions.map(def => {
      // Find all quantities for this definition across all branches
      const defQuantities = (quantities || []).filter(q => q.variant_definition_id === def.id)

      // Return multiple records (one per branch) to match old format
      if (defQuantities.length > 0) {
        return defQuantities.map(qty => ({
          id: def.id,
          product_id: productId,
          branch_id: qty.branch_id,
          variant_type: def.variant_type,
          name: def.name,
          quantity: qty.quantity || 0,
          barcode: def.barcode,
          image_url: def.image_url,
          color_hex: def.color_hex,
          color_name: def.name,
          created_at: def.created_at,
          updated_at: def.updated_at || qty.updated_at
        }))
      } else {
        // No quantities yet, return definition only with 0 quantity
        return [{
          id: def.id,
          product_id: productId,
          branch_id: null,
          variant_type: def.variant_type,
          name: def.name,
          quantity: 0,
          barcode: def.barcode,
          image_url: def.image_url,
          color_hex: def.color_hex,
          color_name: def.name,
          created_at: def.created_at,
          updated_at: def.updated_at
        }]
      }
    }).flat()

    return NextResponse.json({
      success: true,
      data: variants
    })

  } catch (error) {
    console.error('❌ API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

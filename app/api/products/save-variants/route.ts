import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '../../../lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { productId, colors, shapes, quantities } = body

    console.log('🔵 API: Received save-variants request')
    console.log('📦 API: productId:', productId)
    console.log('🎨 API: colors received:', colors)
    console.log('🔶 API: shapes received:', shapes)
    console.log('📊 API: quantities received:', quantities)

    if (!productId) {
      return NextResponse.json(
        { success: false, error: 'Product ID is required' },
        { status: 400 }
      )
    }

    const supabaseAdmin = getSupabaseAdmin()

    // Delete old variants for this product
    // @ts-ignore - TypeScript has issues with schema type inference
    const { error: deleteError } = await supabaseAdmin
      .from('product_variants')
      .delete()
      .eq('product_id', productId)

    if (deleteError) {
      console.error('❌ Error deleting old variants:', deleteError)
      // Continue anyway - the delete might fail if there are no existing variants
    }

    // Get all branches
    // @ts-ignore
    const { data: branches } = await supabaseAdmin
      .from('branches')
      .select('id')

    if (!branches || branches.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No branches found' },
        { status: 400 }
      )
    }

    const allVariants: any[] = []

    // Process colors - create variants for each color with quantities from locations
    if (colors && colors.length > 0) {
      for (const color of colors) {
        // Group quantities by branch for this color
        const colorQuantities = (quantities || []).filter(
          (q: any) => q.elementType === 'color' && q.elementName === color.name
        )

        if (colorQuantities.length > 0) {
          // Create variant for each branch that has this color
          for (const qty of colorQuantities) {
            allVariants.push({
              product_id: productId,
              branch_id: qty.locationId,
              variant_type: 'color',
              name: color.name,
              color_hex: color.color || null,
              color_name: color.name,
              image_url: color.image || null,
              barcode: color.barcode || null,
              quantity: qty.quantity || 0
            })
          }
        } else {
          // If no quantities, create variant for the first branch with quantity 0
          allVariants.push({
            product_id: productId,
            branch_id: branches[0].id,
            variant_type: 'color',
            name: color.name,
            color_hex: color.color || null,
            color_name: color.name,
            image_url: color.image || null,
            barcode: color.barcode || null,
            quantity: 0
          })
        }
      }
    }

    // Process shapes - create variants for each shape with quantities from locations
    if (shapes && shapes.length > 0) {
      for (const shape of shapes) {
        // Group quantities by branch for this shape
        const shapeQuantities = (quantities || []).filter(
          (q: any) => q.elementType === 'shape' && q.elementName === shape.name
        )

        if (shapeQuantities.length > 0) {
          // Create variant for each branch that has this shape
          for (const qty of shapeQuantities) {
            allVariants.push({
              product_id: productId,
              branch_id: qty.locationId,
              variant_type: 'shape',
              name: shape.name,
              color_hex: null,
              color_name: null,
              image_url: shape.image_url || null,
              barcode: shape.barcode || null,
              quantity: qty.quantity || 0
            })
          }
        } else {
          // If no quantities, create variant for the first branch with quantity 0
          allVariants.push({
            product_id: productId,
            branch_id: branches[0].id,
            variant_type: 'shape',
            name: shape.name,
            color_hex: null,
            color_name: null,
            image_url: shape.image_url || null,
            barcode: shape.barcode || null,
            quantity: 0
          })
        }
      }
    }

    if (allVariants.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No variants to save',
        data: []
      })
    }

    // Insert new variants using service_role_key
    // @ts-ignore - TypeScript has issues with schema type inference
    const { data: savedVariants, error: insertError } = await supabaseAdmin
      .from('product_variants')
      .insert(allVariants)
      .select()

    if (insertError) {
      console.error('❌ Error inserting variants:', insertError)
      return NextResponse.json(
        { success: false, error: insertError.message },
        { status: 500 }
      )
    }

    console.log('✅ Saved variants:', savedVariants)

    // ✨ Trigger revalidation to update the website immediately
    try {
      const revalidateUrl = `${request.nextUrl.origin}/api/revalidate`;
      await fetch(revalidateUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret: 'client-revalidate-request',
          productId,
          path: '/'
        })
      });
      console.log('✅ Triggered revalidation for product:', productId);
    } catch (revalidateError) {
      console.warn('⚠️ Revalidation failed (non-critical):', revalidateError);
      // Non-critical error - don't fail the main operation
    }

    return NextResponse.json({
      success: true,
      data: savedVariants
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

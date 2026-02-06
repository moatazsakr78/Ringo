import { NextResponse } from 'next/server'
import { resolveBrandFromHostname } from '@/lib/brand/brand-resolver'

export async function GET(req: Request) {
  const hostname = req.headers.get('host') || 'unknown'

  try {
    const brand = await resolveBrandFromHostname(hostname)

    return NextResponse.json({
      hostname,
      brand: brand ? {
        id: brand.id,
        slug: brand.slug,
        name: brand.name,
        domain: brand.domain,
        is_default: brand.is_default,
        is_active: brand.is_active,
        theme_color: brand.theme_color,
      } : null,
      env: {
        hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        nodeEnv: process.env.NODE_ENV,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json({
      hostname,
      error: error instanceof Error ? error.message : 'Unknown error',
      env: {
        hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        nodeEnv: process.env.NODE_ENV,
      },
      timestamp: new Date().toISOString(),
    }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { hasPageAccess, rolePermissions, type UserRole } from '@/app/lib/auth/roleBasedAccess'
import { auth } from '@/lib/auth.config'
import { PAGE_ACCESS_MAP } from '@/types/permissions'
import { createClient } from '@supabase/supabase-js'
import { CLIENT_CONFIG } from '@/client.config'

// Cookie name for storing last valid page
const LAST_PAGE_COOKIE = 'last_valid_page'

// Create Supabase client for middleware (server-side)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    db: { schema: CLIENT_CONFIG.schema },
    auth: { persistSession: false, autoRefreshToken: false }
  }
)

// Helper function to fetch page restrictions for an employee from database
async function getEmployeePageRestrictions(userId: string): Promise<string[]> {
  try {
    // Get user's permission_id from user_profiles
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('permission_id')
      .eq('id', userId)
      .single()

    if (profileError || !profile?.permission_id) {
      console.log('📋 No permission_id found for user:', userId)
      return [] // No permission template = no restrictions (full access)
    }

    // Get page access restrictions from permission_template_restrictions
    const { data: restrictions, error: restrictionsError } = await supabase
      .from('permission_template_restrictions')
      .select('permission_code')
      .eq('template_id', profile.permission_id)
      .like('permission_code', 'page_access.%')

    if (restrictionsError) {
      console.error('❌ Error fetching restrictions:', restrictionsError)
      return []
    }

    const codes = restrictions?.map(r => r.permission_code) || []
    console.log('📋 Fetched restrictions for user:', userId, 'count:', codes.length, 'codes:', codes)
    return codes
  } catch (error) {
    console.error('❌ Error in getEmployeePageRestrictions:', error)
    return []
  }
}

// Helper function to get page access code from pathname
function getPageAccessCode(pathname: string): string | null {
  // Direct match
  if (PAGE_ACCESS_MAP[pathname]) {
    return PAGE_ACCESS_MAP[pathname]
  }

  // Check for sub-paths (e.g., /products/123 -> /products)
  for (const [path, code] of Object.entries(PAGE_ACCESS_MAP)) {
    if (pathname.startsWith(path + '/')) {
      return code
    }
  }

  return null
}

// Paths that don't need any authentication or authorization
const alwaysPublicPaths = [
  '/auth/login',
  '/auth/register',
  '/auth/error',
  '/auth/logout',
  '/api/auth', // NextAuth API routes
]

// Paths that require authentication and specific roles
const adminOnlyPaths = [
  '/dashboard',
  '/pos',
  '/inventory',
  '/customers',
  '/suppliers',
  '/safes',
  '/reports',
  '/permissions',
  '/admin',
  '/customer-orders',
  '/shipping',
  '/products', // النظام (مش المتجر)
  '/settings',
]

// Paths for customers only (admins should use customer-orders instead)
const customerOnlyPaths = [
  '/my-orders',
  '/cart',
  '/checkout',
]

export default auth(async (req) => {
  const { pathname } = req.nextUrl

  // Skip NextAuth internal routes, static files, and WhatsApp webhook
  if (pathname.startsWith('/api/auth') ||
      pathname.startsWith('/api/whatsapp') ||
      pathname.startsWith('/_next') ||
      pathname.startsWith('/favicon') ||
      pathname.startsWith('/images') ||
      pathname.startsWith('/fonts')) {
    return NextResponse.next()
  }

  // Allow always-public paths (login, register, etc.)
  if (alwaysPublicPaths.some(path => pathname === path || pathname.startsWith(path + '/'))) {
    return NextResponse.next()
  }

  // Get session from NextAuth
  const session = req.auth
  const userRole = session?.user?.role as UserRole | null

  // Check if it's an admin-only path
  const isAdminPath = adminOnlyPaths.some(path =>
    pathname === path || pathname.startsWith(path + '/')
  )

  // Check if it's a customer-only path
  const isCustomerPath = customerOnlyPaths.some(path =>
    pathname === path || pathname.startsWith(path + '/')
  )

  // Block admin paths for non-authenticated users
  if (isAdminPath) {
    // Debug logging
    console.log('🔒 Middleware - Admin path access check:', {
      pathname,
      hasSession: !!session,
      userRole,
      userAgent: req.headers.get('user-agent')?.substring(0, 100)
    });

    // If no session, redirect to login
    if (!session) {
      console.log('❌ No session - redirecting to login');
      const loginUrl = new URL('/auth/login', req.url)
      loginUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(loginUrl)
    }

    // Check if user has access based on role
    const hasAccess = hasPageAccess(userRole, pathname)

    console.log('🔍 Access check result:', {
      userRole,
      pathname,
      hasAccess
    });

    if (!hasAccess) {
      console.log('❌ Access denied - redirecting to home');
      return NextResponse.redirect(new URL('/', req.url))
    }

    // Check granular page permissions for employees (fetch from database)
    if (userRole === 'موظف' && session.user?.id) {
      const pageCode = getPageAccessCode(pathname)

      if (pageCode) {
        // Fetch restrictions directly from database (most reliable)
        const pageRestrictions = await getEmployeePageRestrictions(session.user.id)

        console.log('🔍 Employee permission check:', {
          userId: session.user.id,
          pathname,
          pageCode,
          restrictionsCount: pageRestrictions.length,
          restrictions: pageRestrictions,
          isRestricted: pageRestrictions.includes(pageCode)
        });

        if (pageRestrictions.includes(pageCode)) {
          // Employee is restricted from this page - redirect to last valid page
          const lastPage = req.cookies.get(LAST_PAGE_COOKIE)?.value || '/dashboard'
          console.log('🚫 Employee restricted from page, redirecting to:', lastPage);
          return NextResponse.redirect(new URL(lastPage, req.url))
        }
      }
    }

    // Access granted - update last valid page cookie
    console.log('✅ Access granted');
    const response = NextResponse.next()
    response.cookies.set(LAST_PAGE_COOKIE, pathname, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    })
    return response
  }

  // Customer paths - just check for session
  if (isCustomerPath && !session) {
    const loginUrl = new URL('/auth/login', req.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes (handled separately)
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth.config';
import { supabaseAdmin } from '@/app/lib/supabase/admin';

// Force Node.js runtime (required for auth)
export const runtime = 'nodejs';

// POST - Activate a theme
export async function POST(request: Request) {
  try {
    // Check authentication
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'Theme ID is required' }, { status: 400 });
    }

    // First, deactivate all themes
    const { error: deactivateError } = await supabaseAdmin
      .from('store_theme_colors')
      .update({ is_active: false })
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all rows

    if (deactivateError) {
      console.error('Error deactivating themes:', deactivateError);
      return NextResponse.json({ error: deactivateError.message }, { status: 500 });
    }

    // Then activate the selected theme
    const { error: activateError } = await supabaseAdmin
      .from('store_theme_colors')
      .update({ is_active: true })
      .eq('id', id);

    if (activateError) {
      console.error('Error activating theme:', activateError);
      return NextResponse.json({ error: activateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

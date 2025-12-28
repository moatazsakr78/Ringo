import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Fetch all WhatsApp contacts with profile pictures
export async function GET() {
  try {
    const { data, error } = await supabase
      .schema('elfaroukgroup')
      .from('whatsapp_contacts')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching contacts:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('❌ Error in contacts API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

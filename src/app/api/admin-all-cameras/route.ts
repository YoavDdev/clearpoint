import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  try {
    const { data, error } = await supabaseAdmin
      .from('cameras')
      .select(`
        id,
        name,
        is_stream_active,
        user_id,
        stream_path,
        created_at,
        last_seen_at,
        serial_number,
        user:users!cameras_user_id_fkey (full_name, email)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching all cameras:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, cameras: data }, { status: 200 });
  } catch (error) {
    console.error('Unexpected error fetching cameras:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

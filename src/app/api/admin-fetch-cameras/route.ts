import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  const { userId } = await req.json();

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data, error } = await supabaseAdmin
  .from('cameras')
  .select(`
    id,
    name,
    serial_number,
    image_url,
    user:users!cameras_user_id_fkey (full_name)
  `)
  .eq('user_id', userId);

  if (error) {
    console.error('Error fetching cameras:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true, cameras: data }, { status: 200 });
}

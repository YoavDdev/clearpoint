import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  const { name, serialNumber, userId, userEmail, streamPath, isStreamActive } = await req.json();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase.from('cameras').insert([
    {
      name,
      serial_number: serialNumber,
      user_id: userId,
      user_email: userEmail,
      stream_path: streamPath,
      is_stream_active: isStreamActive,
    },
  ]).select().single();

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, camera: data });
}

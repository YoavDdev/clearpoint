import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  const body = await req.json();
  const { name, imageUrl, userEmail } = body;

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // use service key (server secret)
  );

  const { error } = await supabaseAdmin.from('cameras').insert([
    {
      name,
      image_url: imageUrl,
      user_email: userEmail,
    },
  ]);

  if (error) {
    console.error('Error inserting camera:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true }, { status: 200 });
}

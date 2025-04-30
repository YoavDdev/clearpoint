import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  const body = await req.json();
  const { name, imageUrl, serialNumber, userId, userEmail } = body;

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabaseAdmin
    .from("cameras")
    .insert([
      {
        name,
        image_url: imageUrl,
        serial_number: serialNumber,
        user_id: userId,
        user_email: userEmail, // ✅ now inserting this
      },
    ])
    .select()
    .single();

  if (error) {
    console.error("Error inserting camera:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    camera: data,
  });
}

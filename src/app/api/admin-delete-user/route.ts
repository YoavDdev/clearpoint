import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  const body = await req.json();
  const { userId } = body;

  if (!userId) {
    return NextResponse.json({ success: false, error: "Missing user ID" }, { status: 400 });
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Step 1: Delete from public.users table
  const { error: deleteDbError } = await supabaseAdmin
    .from('users')
    .delete()
    .eq('id', userId);

  if (deleteDbError) {
    console.error('Database deletion error:', deleteDbError);
    return NextResponse.json({ success: false, error: deleteDbError.message }, { status: 400 });
  }

  // Step 2: (Optional) Delete from Authentication too
  const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

  if (authDeleteError) {
    console.error('Auth deletion error:', authDeleteError);
    // You can choose whether to still return success or not
    return NextResponse.json({ success: false, error: authDeleteError.message }, { status: 400 });
  }

  return NextResponse.json({ success: true }, { status: 200 });
}

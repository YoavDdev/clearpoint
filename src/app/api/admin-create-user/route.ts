import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const body = await req.json();
  const { email, password, full_name, subscription_plan, phone, address, notes } = body;

  // 1. Create auth user
  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError || !authUser.user) {
    return NextResponse.json({ success: false, error: authError?.message }, { status: 400 });
  }

  // 2. Add extra user info to the `users` table
  const { error: dbError } = await supabaseAdmin.from('users').insert({
    id: authUser.user.id,
    email,
    full_name,
    subscription_plan,
    phone,
    address,
    notes,
  });

  if (dbError) {
    return NextResponse.json({ success: false, error: dbError.message }, { status: 400 });
  }

  return NextResponse.json({ success: true }, { status: 200 });
}

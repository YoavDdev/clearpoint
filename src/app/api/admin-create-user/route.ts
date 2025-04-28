import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  const body = await req.json();
  const { email, password, full_name = '', subscription_plan = 'basic' } = body; 

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Step 1: Create user in Authentication
  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError) {
    console.error('Error creating user:', authError);
    return NextResponse.json({ success: false, error: authError.message }, { status: 400 });
  }

  console.log('Auth User Created:', authUser.user);

  const userId = authUser?.user?.id || undefined; // if no id, let db auto-create

  // Step 2: Insert into users table
  const { error: dbError } = await supabaseAdmin.from('users').insert([
    {
      id: userId, // ok if undefined (Supabase auto-generates if needed)
      email,
      full_name,
      subscription_plan,
      role: 'user',
    },
  ]);

  if (dbError) {
    console.error('Database error:', dbError);
    return NextResponse.json({ success: false, error: dbError.message }, { status: 400 });
  }

  return NextResponse.json({ success: true }, { status: 200 });
}

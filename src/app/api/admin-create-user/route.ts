import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
  }

  const body = await req.json();
  const {
    email,
    password,
    full_name,
    plan_type,
    plan_duration_days,
    phone,
    address,
    notes,
  } = body;

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 1. Create auth user
  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError || !authUser.user) {
    return NextResponse.json({ success: false, error: authError?.message }, { status: 400 });
  }

  // 2. Insert into users table
  const { error: dbError } = await supabaseAdmin.from('users').insert({
    id: authUser.user.id,
    email,
    full_name,
    plan_type,
    plan_duration_days,
    phone,
    address,
    notes,
  });

  if (dbError) {
    return NextResponse.json({ success: false, error: dbError.message }, { status: 400 });
  }

  return NextResponse.json({ success: true }, { status: 200 });
}

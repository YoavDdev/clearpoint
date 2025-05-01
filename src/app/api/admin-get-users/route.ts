import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);

  // ✅ Block access if not admin
  if (!session || session.user.role !== 'Admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  // ✅ Init Supabase with service key to bypass RLS
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // ✅ Fetch all users safely — no .eq() filtering here
  const { data, error } = await supabase
    .from('users')
    .select('id, email, full_name, subscription_plan, phone, address, notes');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ users: data });
}

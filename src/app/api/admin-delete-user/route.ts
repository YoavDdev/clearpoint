import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { createClient } from '@supabase/supabase-js';
import { removePayPlusCustomer } from '@/lib/payplus';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
  }

  const body = await req.json();
  const { userId } = body;

  if (!userId) {
    return NextResponse.json({ success: false, error: "Missing user ID" }, { status: 400 });
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Step 0: קבלת customer_uid לפני המחיקה
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('customer_uid, email')
    .eq('id', userId)
    .single();

  // Step 1: Delete from public.users table
  const { error: deleteDbError } = await supabaseAdmin
    .from('users')
    .delete()
    .eq('id', userId);

  if (deleteDbError) {
    console.error('Database deletion error:', deleteDbError);
    return NextResponse.json({ success: false, error: deleteDbError.message }, { status: 400 });
  }

  // Step 2: Delete from Auth
  const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

  if (authDeleteError) {
    console.error('Auth deletion error:', authDeleteError);
    return NextResponse.json({ success: false, error: authDeleteError.message }, { status: 400 });
  }

  // Step 3: מחיקת לקוח מ-PayPlus (אם קיים customer_uid)
  if (user?.customer_uid) {
    console.log('🔵 Removing PayPlus customer:', user.customer_uid);
    const payplusResult = await removePayPlusCustomer(user.customer_uid);
    
    if (!payplusResult.success) {
      console.warn('⚠️ Failed to remove PayPlus customer:', payplusResult.error);
      // לא עוצרים - המשתמש כבר נמחק מהמערכת
    } else {
      console.log('✅ PayPlus customer removed successfully');
    }
  }

  return NextResponse.json({ success: true }, { status: 200 });
}

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

  // Step 1: Soft-delete — mark user as deleted (preserve financial data)
  const { data: user, error: updateError } = await supabaseAdmin
    .from('users')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', userId)
    .select('customer_uid, email')
    .single();

  if (updateError) {
    console.error('Soft-delete error:', updateError);
    return NextResponse.json({ success: false, error: updateError.message }, { status: 400 });
  }

  // Step 2: Disable auth (ban user so they can't login, but don't delete)
  const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    ban_duration: '876600h', // ~100 years = effectively permanent ban
  });

  if (authError) {
    console.error('Auth ban error:', authError);
    // Don't fail — user is already soft-deleted in DB
  }

  // Step 3: מחיקת לקוח מ-PayPlus (אם קיים customer_uid)
  if (user?.customer_uid) {
    console.log('🔵 Removing PayPlus customer:', user.customer_uid);
    const payplusResult = await removePayPlusCustomer(user.customer_uid);
    
    if (!payplusResult.success) {
      console.warn('⚠️ Failed to remove PayPlus customer:', payplusResult.error);
    } else {
      console.log('✅ PayPlus customer removed successfully');
    }
  }

  console.log(`🗑️ User ${userId} (${user?.email}) soft-deleted`);
  return NextResponse.json({ success: true }, { status: 200 });
}

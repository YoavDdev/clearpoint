import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { createClient } from '@supabase/supabase-js';
import { updatePayPlusCustomer, createPayPlusCustomer } from '@/lib/payplus';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
  }

  const body = await req.json();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // קבלת הנתונים הנוכחיים של המשתמש (לשם customer_uid)
  const { data: currentUser } = await supabase
    .from('users')
    .select('customer_uid, email')
    .eq('id', body.id)
    .single();

  const { error } = await supabase
    .from('users')
    .update({
      full_name: body.full_name,
      phone: body.phone,
      address: body.address,
      notes: body.notes,
      plan_id: body.plan_id,
      plan_duration_days: body.plan_duration_days,
      custom_price: body.custom_price ?? null,
      // Business fields
      vat_number: body.vat_number ?? null,
      business_city: body.business_city ?? null,
      business_postal_code: body.business_postal_code ?? null,
      communication_email: body.communication_email ?? null,
    })
    .eq('id', body.id);

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  // סנכרון עם PayPlus
  if (currentUser?.customer_uid) {
    // עדכון לקוח קיים ב-PayPlus
    console.log('🔵 Updating PayPlus customer:', currentUser.customer_uid);
    const payplusResult = await updatePayPlusCustomer(currentUser.customer_uid, {
      email: currentUser.email,
      customer_name: body.full_name || currentUser.email,
      phone: body.phone || '',
      business_address: body.address || '',
      business_city: body.business_city || '',
      business_postal_code: body.business_postal_code || '',
      notes: body.notes || '',
      customer_number: body.id,
      vat_number: body.vat_number || '',
      communication_email: body.communication_email || currentUser.email,
    });

    if (!payplusResult.success) {
      console.warn('⚠️ Failed to update PayPlus customer:', payplusResult.error);
    } else {
      console.log('✅ PayPlus customer updated successfully');
    }
  } else if (currentUser?.email) {
    // אין customer_uid - ננסה ליצור לקוח חדש ב-PayPlus
    console.log('🔵 No customer_uid found, creating PayPlus customer');
    const payplusResult = await createPayPlusCustomer({
      email: currentUser.email,
      customer_name: body.full_name || currentUser.email,
      phone: body.phone || '',
      business_address: body.address || '',
      business_city: body.business_city || '',
      business_postal_code: body.business_postal_code || '',
      notes: body.notes || '',
      customer_number: body.id,
      vat_number: body.vat_number || '',
      communication_email: body.communication_email || currentUser.email,
    });

    if (payplusResult.success && payplusResult.customer_uid) {
      console.log('✅ PayPlus customer created:', payplusResult.customer_uid);
      // שמירת customer_uid
      await supabase
        .from('users')
        .update({ customer_uid: payplusResult.customer_uid })
        .eq('id', body.id);
    } else {
      console.warn('⚠️ Failed to create PayPlus customer:', payplusResult.error);
    }
  }

  return NextResponse.json({ success: true });
}

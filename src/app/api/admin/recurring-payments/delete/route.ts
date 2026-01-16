import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { deleteRecurringPayment } from '@/lib/payplus';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { recurring_payment_id } = body;

    if (!recurring_payment_id) {
      return NextResponse.json(
        { error: 'Missing recurring_payment_id' },
        { status: 400 }
      );
    }

    const { data: payment, error: fetchError } = await supabaseAdmin
      .from('recurring_payments')
      .select('recurring_uid')
      .eq('id', recurring_payment_id)
      .single();

    if (fetchError || !payment) {
      return NextResponse.json(
        { error: 'Recurring payment not found' },
        { status: 404 }
      );
    }

    if (payment.recurring_uid) {
      try {
        await deleteRecurringPayment(payment.recurring_uid);
      } catch (payplusError) {
        console.error('⚠️ PayPlus delete error (continuing):', payplusError);
      }
    }

    const { error: dbError } = await supabaseAdmin
      .from('recurring_payments')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', recurring_payment_id);

    if (dbError) {
      console.error('❌ Database error:', dbError);
      return NextResponse.json(
        { error: 'Failed to update database' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Recurring payment deleted successfully',
    });
  } catch (error) {
    console.error('❌ Server error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

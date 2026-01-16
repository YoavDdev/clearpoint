import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createRecurringPayment } from '@/lib/payplus';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      user_id,
      plan_id,
      customer_uid,
      card_token,
      recurring_type = 2,
      recurring_range = 1,
      number_of_charges = 0,
      start_date,
      end_date,
      amount,
      currency_code = 'ILS',
      items,
      extra_info,
      notes,
    } = body;

    if (!user_id || !amount || !items || !customer_uid || !card_token) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const payplusRequest = {
      terminal_uid: process.env.PAYPLUS_TERMINAL_UID!,
      customer_uid,
      card_token,
      cashier_uid: process.env.PAYPLUS_CASHIER_UID!,
      currency_code,
      recurring_type,
      recurring_range,
      number_of_charges,
      start_date,
      end_date,
      items,
      extra_info,
    };

    const payplusResponse = await createRecurringPayment(payplusRequest);

    if (payplusResponse.results.status !== 'success') {
      return NextResponse.json(
        { error: 'PayPlus API error', details: payplusResponse },
        { status: 400 }
      );
    }

    const nextChargeDate = new Date(start_date);
    if (recurring_type === 2) {
      nextChargeDate.setMonth(nextChargeDate.getMonth() + recurring_range);
    } else if (recurring_type === 1) {
      nextChargeDate.setDate(nextChargeDate.getDate() + (7 * recurring_range));
    } else if (recurring_type === 0) {
      nextChargeDate.setDate(nextChargeDate.getDate() + recurring_range);
    }

    const { data: dbRecord, error: dbError } = await supabaseAdmin
      .from('recurring_payments')
      .insert({
        user_id,
        plan_id,
        recurring_uid: payplusResponse.data.recurring_uid,
        customer_uid,
        card_token,
        recurring_type,
        recurring_range,
        number_of_charges,
        start_date,
        end_date,
        next_charge_date: nextChargeDate.toISOString(),
        amount,
        currency_code,
        items,
        extra_info,
        notes,
        is_active: true,
        is_valid: true,
      })
      .select()
      .single();

    if (dbError) {
      console.error('❌ Database error:', dbError);
      return NextResponse.json(
        { error: 'Failed to save to database' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      recurring_payment: dbRecord,
      payplus_response: payplusResponse,
    });
  } catch (error) {
    console.error('❌ Server error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

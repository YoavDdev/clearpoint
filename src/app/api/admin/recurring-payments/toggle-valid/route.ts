import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { toggleRecurringValid } from '@/lib/payplus';
import { requireAdmin } from "@/lib/admin-auth";

import { apiHandler } from "@/lib/api-handler";

const supabaseAdmin = getSupabaseAdmin();

export const POST = apiHandler(async (request: NextRequest) => {
  const authResult = await requireAdmin();
  if (authResult instanceof NextResponse) return authResult;
  try {
    const body = await request.json();
    const { recurring_payment_id, valid } = body;

    if (!recurring_payment_id || typeof valid !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing required fields' },
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
        const payplusResponse = await toggleRecurringValid(payment.recurring_uid, valid);
        
        if (payplusResponse.results.status !== 'success') {
          return NextResponse.json(
            { error: 'PayPlus API error', details: payplusResponse },
            { status: 400 }
          );
        }
      } catch (payplusError) {
        console.error('❌ PayPlus toggle error:', payplusError);
        return NextResponse.json(
          { error: 'PayPlus API failed' },
          { status: 500 }
        );
      }
    }

    const { error: dbError } = await supabaseAdmin
      .from('recurring_payments')
      .update({
        is_valid: valid,
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
      message: `Recurring payment ${valid ? 'activated' : 'paused'} successfully`,
    });
  } catch (error) {
    console.error('❌ Server error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

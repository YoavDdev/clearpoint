import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getRecurringCharges } from '@/lib/payplus';

const supabaseAdmin = getSupabaseAdmin();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const { data: payment, error } = await supabaseAdmin
      .from('recurring_payments')
      .select('recurring_uid')
      .eq('id', id)
      .single();

    if (error || !payment) {
      return NextResponse.json(
        { error: 'Recurring payment not found' },
        { status: 404 }
      );
    }

    if (!payment.recurring_uid) {
      return NextResponse.json({
        success: true,
        charges: [],
        message: 'No PayPlus recurring_uid available',
      });
    }

    const chargesResponse = await getRecurringCharges(payment.recurring_uid);

    if (chargesResponse.results.status !== 'success') {
      return NextResponse.json(
        { error: 'PayPlus API error', details: chargesResponse },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      charges: chargesResponse.data.items || [],
    });
  } catch (error) {
    console.error('❌ Server error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

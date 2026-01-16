import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendCardRenewalNotification } from '@/lib/payplus';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { disable_send_email = false } = body;

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
      return NextResponse.json(
        { error: 'No PayPlus recurring_uid available' },
        { status: 400 }
      );
    }

    const renewalResponse = await sendCardRenewalNotification(
      payment.recurring_uid,
      disable_send_email
    );

    if (renewalResponse.results.status !== 'success') {
      return NextResponse.json(
        { error: 'PayPlus API error', details: renewalResponse },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      payment_page_url: renewalResponse.data.payment_page_url,
      message: 'Card renewal notification sent successfully',
    });
  } catch (error) {
    console.error('❌ Server error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

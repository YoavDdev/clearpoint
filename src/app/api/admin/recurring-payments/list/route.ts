import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    let query = supabaseAdmin
      .from('recurring_payments')
      .select('*')
      .order('created_at', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: payments, error } = await query;

    if (error) {
      console.error('❌ Error fetching recurring payments:', error);
      return NextResponse.json(
        { error: 'Failed to fetch recurring payments', details: error.message },
        { status: 500 }
      );
    }

    // Fetch user and plan data separately
    const paymentsWithDetails = await Promise.all(
      (payments || []).map(async (payment) => {
        const { data: user } = await supabaseAdmin
          .from('users')
          .select('id, full_name, email, phone')
          .eq('id', payment.user_id)
          .single();

        let plan = null;
        if (payment.plan_id) {
          const { data: planData } = await supabaseAdmin
            .from('plans')
            .select('id, name, monthly_price')
            .eq('id', payment.plan_id)
            .single();
          plan = planData;
        }

        return {
          ...payment,
          user,
          plan,
        };
      })
    );

    return NextResponse.json({
      success: true,
      recurring_payments: paymentsWithDetails,
    });
  } catch (error) {
    console.error('❌ Server error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

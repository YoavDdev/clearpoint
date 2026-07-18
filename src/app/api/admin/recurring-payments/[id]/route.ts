import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

const supabaseAdmin = getSupabaseAdmin();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const { data, error } = await supabaseAdmin
      .from('recurring_payments')
      .select(`
        *,
        user:user_id (
          id,
          full_name,
          email,
          phone
        ),
        plan:plan_id (
          id,
          name,
          monthly_price
        )
      `)
      .eq('id', id)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: 'Recurring payment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      recurring_payment: data,
    });
  } catch (error) {
    console.error('❌ Server error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

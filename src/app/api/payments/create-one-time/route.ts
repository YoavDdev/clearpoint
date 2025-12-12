import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { createOneTimePayment } from '@/lib/payplus';

/**
 * יצירת תשלום חד-פעמי (חומרה)
 * POST /api/payments/create-one-time
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // אימות משתמש
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // קבלת פרטי המשתמש
    const { data: user } = await supabase
      .from('users')
      .select('id, full_name, email, phone')
      .eq('email', session.user.email)
      .single();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // קבלת נתוני התשלום מהבקשה
    const body = await req.json();
    const { planId, items, returnUrl } = body;

    if (!planId || !items || !Array.isArray(items)) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data' },
        { status: 400 }
      );
    }

    // קבלת פרטי התוכנית
    const { data: plan } = await supabase
      .from('plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (!plan) {
      return NextResponse.json(
        { success: false, error: 'Plan not found' },
        { status: 404 }
      );
    }

    // חישוב סכום כולל
    const totalAmount = items.reduce(
      (sum: number, item: { price: number; quantity: number }) => sum + (item.price * item.quantity),
      0
    );

    // יצירת רשומת תשלום במסד הנתונים (סטטוס: pending)
    console.log('Creating payment record for user:', user.id, 'amount:', totalAmount);
    
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        user_id: user.id,
        payment_type: 'one_time',
        amount: totalAmount,
        currency: 'ILS',
        status: 'pending',
        payment_provider: 'grow',
        description: `תשלום חד-פעמי עבור ${plan.name_he || plan.name} - ${plan.connection_type}`,
        items: items,
        metadata: {
          plan_id: planId,
          plan_name: plan.name,
          plan_name_he: plan.name_he,
          connection_type: plan.connection_type,
        },
      })
      .select()
      .single();

    if (paymentError || !payment) {
      console.error('Failed to create payment record:', {
        error: paymentError,
        code: paymentError?.code,
        message: paymentError?.message,
        details: paymentError?.details,
        hint: paymentError?.hint
      });
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to create payment record',
          details: paymentError?.message || 'Unknown error',
          hint: paymentError?.hint
        },
        { status: 500 }
      );
    }

    // יצירת תשלום ב-Grow
    const growPayment = await createOneTimePayment({
      sum: totalAmount,
      currency: 'ILS',
      description: `Clearpoint Security - ${plan.name}`,
      customer_name: user.full_name || user.email,
      customer_email: user.email,
      customer_phone: user.phone || '',
      custom_fields: {
        cField1: payment.id, // Payment ID שלנו
        cField2: user.id, // User ID
        cField3: planId, // Plan ID
      },
      success_url: returnUrl || `${process.env.NEXT_PUBLIC_BASE_URL}/payment/success?payment_id=${payment.id}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/cancel?payment_id=${payment.id}`,
      items: items.map((item: { name: string; quantity: number; price: number; description?: string }) => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        description: item.description,
      })),
    });

    if (!growPayment.data?.pageUrl) {
      // עדכון סטטוס התשלום לכישלון
      await supabase
        .from('payments')
        .update({ status: 'failed' })
        .eq('id', payment.id);

      return NextResponse.json(
        { success: false, error: 'Failed to create PayPlus payment' },
        { status: 500 }
      );
    }

    // עדכון ה-payment עם ה-provider_payment_id
    await supabase
      .from('payments')
      .update({
        provider_payment_id: growPayment.data.processId,
        provider_transaction_id: growPayment.data.transactionId,
      })
      .eq('id', payment.id);

    return NextResponse.json({
      success: true,
      payment: {
        id: payment.id,
        amount: totalAmount,
        paymentUrl: growPayment.data.pageUrl,
        processId: growPayment.data.processId,
      },
    });

  } catch (error) {
    console.error('Create one-time payment error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { createRecurringSubscription, calculateNextBillingDate } from '@/lib/grow';

/**
 * יצירת מנוי חודשי/שנתי
 * POST /api/payments/create-subscription
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

    // בדיקה אם כבר יש מנוי פעיל
    const { data: existingSubscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (existingSubscription) {
      return NextResponse.json(
        { success: false, error: 'User already has an active subscription' },
        { status: 400 }
      );
    }

    // קבלת נתוני המנוי מהבקשה
    const body = await req.json();
    const { planId, billingCycle = 'monthly' } = body;

    if (!planId) {
      return NextResponse.json(
        { success: false, error: 'Plan ID is required' },
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

    // חישוב מחיר לפי מחזור החיוב
    let amount = 99; // מחיר בסיס לחודש
    
    if (plan.connection_type === 'sim') {
      amount = 149; // ₪99 ענן + ₪50 SIM
    }
    
    if (billingCycle === 'yearly') {
      amount = amount * 12 * 0.85; // 15% הנחה לשנתי
    }

    // חישוב תאריך חיוב ראשון והבא
    const now = new Date();
    const nextBillingDate = calculateNextBillingDate(billingCycle, now);

    // יצירת רשומת מנוי במסד הנתונים (סטטוס: active)
    const { data: subscription, error: subscriptionError } = await supabase
      .from('subscriptions')
      .insert({
        user_id: user.id,
        plan_id: planId,
        status: 'active',
        billing_cycle: billingCycle,
        amount: amount,
        currency: 'ILS',
        next_billing_date: nextBillingDate.toISOString().split('T')[0],
        billing_day: now.getDate(),
        payment_provider: 'grow',
        started_at: now.toISOString(),
      })
      .select()
      .single();

    if (subscriptionError || !subscription) {
      console.error('Failed to create subscription record:', subscriptionError);
      return NextResponse.json(
        { success: false, error: 'Failed to create subscription record' },
        { status: 500 }
      );
    }

    // יצירת תשלום ראשון
    const { data: firstPayment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        user_id: user.id,
        payment_type: 'recurring',
        amount: amount,
        currency: 'ILS',
        status: 'pending',
        payment_provider: 'grow',
        description: `מנוי ${billingCycle === 'monthly' ? 'חודשי' : 'שנתי'} - ${plan.plan_name}`,
        metadata: {
          subscription_id: subscription.id,
          plan_id: planId,
          billing_cycle: billingCycle,
        },
      })
      .select()
      .single();

    if (paymentError || !firstPayment) {
      console.error('Failed to create payment record:', paymentError);
      // מחיקת המנוי אם התשלום נכשל
      await supabase.from('subscriptions').delete().eq('id', subscription.id);
      return NextResponse.json(
        { success: false, error: 'Failed to create payment record' },
        { status: 500 }
      );
    }

    // יצירת מנוי חוזר ב-Grow
    const growSubscription = await createRecurringSubscription({
      customer_id: user.id,
      amount: amount,
      currency: 'ILS',
      description: `Clearpoint Security - ${plan.plan_name} (${billingCycle})`,
      customer_name: user.full_name || user.email,
      customer_email: user.email,
      customer_phone: user.phone || '',
      billing_cycle: billingCycle,
      start_date: now.toISOString().split('T')[0],
    });

    if (!growSubscription.data?.pageUrl) {
      // עדכון סטטוס המנוי והתשלום לכישלון
      await supabase
        .from('subscriptions')
        .update({ status: 'cancelled' })
        .eq('id', subscription.id);
      
      await supabase
        .from('payments')
        .update({ status: 'failed' })
        .eq('id', firstPayment.id);

      return NextResponse.json(
        { success: false, error: 'Failed to create Grow subscription' },
        { status: 500 }
      );
    }

    // עדכון המנוי עם ה-provider_subscription_id
    await supabase
      .from('subscriptions')
      .update({
        provider_subscription_id: growSubscription.data.processId,
        provider_customer_id: growSubscription.data.transactionId,
      })
      .eq('id', subscription.id);

    // עדכון התשלום הראשון
    await supabase
      .from('payments')
      .update({
        provider_payment_id: growSubscription.data.processId,
        provider_transaction_id: growSubscription.data.transactionId,
      })
      .eq('id', firstPayment.id);

    // רישום בהיסטוריה
    await supabase.from('subscription_history').insert({
      subscription_id: subscription.id,
      user_id: user.id,
      event_type: 'created',
      new_status: 'active',
      new_plan_id: planId,
      description: `מנוי חדש נוצר - ${plan.plan_name}`,
      metadata: {
        billing_cycle: billingCycle,
        amount: amount,
      },
    });

    // עדכון טבלת users עם subscription_id
    await supabase
      .from('users')
      .update({ subscription_id: subscription.id })
      .eq('id', user.id);

    return NextResponse.json({
      success: true,
      subscription: {
        id: subscription.id,
        planId: planId,
        amount: amount,
        billingCycle: billingCycle,
        nextBillingDate: nextBillingDate.toISOString(),
        paymentUrl: growSubscription.data.pageUrl,
      },
    });

  } catch (error) {
    console.error('Create subscription error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

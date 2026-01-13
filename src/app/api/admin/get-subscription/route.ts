import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { listAllRecurringPayments } from '@/lib/payplus';

export const dynamic = 'force-dynamic';

/**
 * GET - קבלת פרטי מנוי של משתמש
 * עובד ישירות מול PayPlus API - המקור האמת
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Missing userId parameter' },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. קבל את פרטי המשתמש
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, full_name, custom_price')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // 2. קבל את כל המנויים החוזרים מ-PayPlus
    const result = await listAllRecurringPayments();
    
    if (result.status !== 'success') {
      console.error('Failed to fetch recurring payments from PayPlus');
      return NextResponse.json({
        success: true,
        subscription: null
      });
    }

    const recurringPayments = result.data || [];

    // 3. חפש מנוי פעיל עבור המשתמש הזה (לפי email)
    const userSubscription = recurringPayments.find(
      (payment: any) => payment.customer_email === user.email && payment.status === 'active'
    );

    if (!userSubscription) {
      return NextResponse.json({
        success: true,
        subscription: null
      });
    }

    // 4. המר לפורמט שהקומפוננטה מצפה לו
    const subscription = {
      id: userSubscription.uid,
      plan_id: 'monthly', // PayPlus לא מחזיק plan_id
      status: userSubscription.status,
      amount: userSubscription.amount,
      next_billing_date: userSubscription.next_charge_date,
      started_at: userSubscription.created_at,
    };

    return NextResponse.json({
      success: true,
      subscription
    });
  } catch (error) {
    console.error('Error in get-subscription:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

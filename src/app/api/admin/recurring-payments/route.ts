import { NextRequest, NextResponse } from 'next/server';
import { listAllRecurringPayments, cancelRecurringPayment } from '@/lib/payplus';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

/**
 * GET - קבלת כל המנויים החוזרים + סנכרון אוטומטי עם משתמשים
 * API זה פתוח רק לדפי אדמין (מוגן ברמת הראוטינג)
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🔵 GET /api/admin/recurring-payments - Starting...');
    
    // קבלת רשימת מנויים מ-PayPlus
    const result = await listAllRecurringPayments();
    console.log('🔵 Result from PayPlus:', result);
    
    if (result.status !== 'success') {
      console.log('❌ PayPlus returned non-success status');
      throw new Error('Failed to fetch recurring payments');
    }

    const recurringPayments = result.data || [];
    
    // סנכרון אוטומטי עם משתמשים (אפשרות A - לפי email)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const enrichedPayments = [];

    for (const payment of recurringPayments) {
      let linkedUser = null;
      let hasActiveSubscription = false;
      let subscriptionCreated = false;

      if (payment.customer_email) {
        // 1. חפש משתמש לפי email
        const { data: user } = await supabase
          .from('users')
          .select('id, full_name, email, plan_id')
          .eq('email', payment.customer_email)
          .single();

        if (user) {
          linkedUser = user;
          
          // 2. בדוק אם יש subscription פעיל
          const { data: subscription } = await supabase
            .from('subscriptions')
            .select('id, status, amount')
            .eq('user_id', user.id)
            .eq('status', 'active')
            .single();

          if (subscription) {
            hasActiveSubscription = true;
            console.log(`✅ User ${user.email} already has active subscription`);
          } else {
            // 3. אין subscription פעיל - צור חדש
            console.log(`🆕 Creating subscription for user: ${user.email}`);
            
            const { data: newSubscription, error: createError } = await supabase
              .from('subscriptions')
              .insert({
                user_id: user.id,
                plan_id: user.plan_id,
                status: 'active',
                amount: payment.amount,
                billing_cycle: payment.recurring_type || 'monthly',
                next_billing_date: payment.next_charge_date,
                created_at: new Date().toISOString(),
              })
              .select()
              .single();

            if (!createError && newSubscription) {
              subscriptionCreated = true;
              hasActiveSubscription = true;
              console.log(`✅ Subscription created: ${newSubscription.id}`);
            } else {
              console.error(`❌ Failed to create subscription:`, createError);
            }
          }

          // 4. עדכן את ה-user.subscription_status ל-active
          await supabase
            .from('users')
            .update({ subscription_status: 'active' })
            .eq('id', user.id);
        } else {
          console.log(`⚠️ No user found for email: ${payment.customer_email}`);
        }
      }

      enrichedPayments.push({
        ...payment,
        linked_user: linkedUser,
        has_active_subscription: hasActiveSubscription,
        subscription_created: subscriptionCreated,
      });
    }

    console.log('✅ Success, returning enriched data');
    return NextResponse.json({ 
      success: true, 
      data: enrichedPayments,
      stats: {
        total: enrichedPayments.length,
        linked: enrichedPayments.filter(p => p.linked_user).length,
        not_linked: enrichedPayments.filter(p => !p.linked_user).length,
        subscriptions_created: enrichedPayments.filter(p => p.subscription_created).length,
      }
    });
  } catch (error) {
    console.error('❌ Error fetching recurring payments:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch recurring payments', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE - ביטול מנוי חוזר
 * API זה פתוח רק לדפי אדמין (מוגן ברמת הראוטינג)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { uid } = await request.json();
    
    if (!uid) {
      return NextResponse.json({ error: 'Missing UID' }, { status: 400 });
    }

    console.log('🔵 Cancelling recurring payment:', uid);

    // ביטול מנוי ב-PayPlus
    const result = await cancelRecurringPayment(uid);
    
    if (result.status === 'success') {
      console.log('✅ Recurring payment cancelled successfully');
      return NextResponse.json({ 
        success: true, 
        message: 'Recurring payment cancelled successfully' 
      });
    } else {
      console.log('❌ Failed to cancel recurring payment');
      throw new Error('Failed to cancel recurring payment');
    }
  } catch (error) {
    console.error('❌ Error cancelling recurring payment:', error);
    return NextResponse.json(
      { error: 'Failed to cancel recurring payment', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

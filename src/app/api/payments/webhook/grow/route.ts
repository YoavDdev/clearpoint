import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyWebhookSignature, parseWebhookData, type GrowWebhookPayload } from '@/lib/grow';

// שימוש ב-Service Role Key לעדכונים בלי RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Webhook handler עבור Grow
 * POST /api/payments/webhook/grow
 * 
 * Grow שולח POST request עם JSON payload כאשר:
 * - תשלום מסתיים בהצלחה
 * - תשלום נכשל
 * - מנוי חודשי מחויב
 * - מנוי מבוטל
 */
export async function POST(req: NextRequest) {
  try {
    const payload: GrowWebhookPayload = await req.json();

    console.log('Grow webhook received:', JSON.stringify(payload, null, 2));

    // אימות חתימה
    if (!verifyWebhookSignature(payload)) {
      console.error('Invalid webhook signature');
      return NextResponse.json(
        { success: false, error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // בדיקה אם הבקשה תקינה
    if (payload.status !== '1' || !payload.data) {
      console.error('Invalid webhook payload:', payload.err);
      return NextResponse.json(
        { success: false, error: payload.err || 'Invalid payload' },
        { status: 400 }
      );
    }

    // פענוח הנתונים
    const paymentData = parseWebhookData(payload);

    // חיפוש התשלום במסד הנתונים לפי custom field (Payment ID)
    const paymentId = payload.data.customFields?.cField1;
    const userId = payload.data.customFields?.cField2;
    
    if (!paymentId) {
      console.error('Payment ID not found in webhook');
      return NextResponse.json(
        { success: false, error: 'Payment ID not found' },
        { status: 400 }
      );
    }

    // עדכון התשלום במסד הנתונים
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .update({
        status: paymentData.status,
        paid_at: paymentData.status === 'completed' ? new Date().toISOString() : null,
        provider_transaction_id: paymentData.transactionId,
        metadata: {
          ...payload.data.customFields,
          asmachta: paymentData.asmachta,
          card_details: paymentData.cardDetails,
          payment_date: paymentData.paymentDate,
        },
      })
      .eq('id', paymentId)
      .select()
      .single();

    if (paymentError) {
      console.error('Failed to update payment:', paymentError);
      return NextResponse.json(
        { success: false, error: 'Failed to update payment' },
        { status: 500 }
      );
    }

    // אם התשלום הצליח
    if (paymentData.status === 'completed') {
      console.log(`✅ Payment ${paymentId} completed successfully`);

      // אם זה תשלום חד-פעמי (חומרה)
      if (payment.payment_type === 'one_time') {
        // יצירת חשבונית (ניישם בהמשך עם Green Invoice)
        // await createInvoice(payment);

        // שליחת אימייל אישור (אופציונלי)
        // await sendPaymentConfirmationEmail(userId, payment);

        console.log(`📧 One-time payment processed for user ${userId}`);
      }

      // אם זה תשלום חוזר (מנוי)
      if (payment.payment_type === 'recurring') {
        // עדכון תאריך החיוב הבא במנוי
        const { data: subscription } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (subscription) {
          const nextBillingDate = new Date();
          if (subscription.billing_cycle === 'monthly') {
            nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
          } else {
            nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
          }

          await supabase
            .from('subscriptions')
            .update({
              last_billing_date: new Date().toISOString().split('T')[0],
              next_billing_date: nextBillingDate.toISOString().split('T')[0],
              status: 'active',
            })
            .eq('id', subscription.id);

          // רישום בהיסטוריה
          await supabase.from('subscription_history').insert({
            subscription_id: subscription.id,
            user_id: userId,
            event_type: 'renewed',
            new_status: 'active',
            description: `חיוב חודשי בסך ${paymentData.amount}₪`,
            metadata: {
              payment_id: paymentId,
              asmachta: paymentData.asmachta,
            },
          });

          console.log(`📅 Subscription renewed for user ${userId}`);
        }

        // יצירת חשבונית חודשית
        // await createMonthlyInvoice(payment, subscription);
      }
    }

    // אם התשלום נכשל
    if (paymentData.status === 'failed') {
      console.log(`❌ Payment ${paymentId} failed`);

      // שליחת התראה על כישלון (אופציונלי)
      // await sendPaymentFailedNotification(userId, payment);

      // אם זה מנוי חוזר - סימון כפג-תוקף
      if (payment.payment_type === 'recurring') {
        await supabase
          .from('subscriptions')
          .update({
            status: 'expired',
            expires_at: new Date().toISOString(),
          })
          .eq('user_id', userId);

        await supabase.from('subscription_history').insert({
          subscription_id: payment.metadata?.subscription_id,
          user_id: userId,
          event_type: 'updated',
          previous_status: 'active',
          new_status: 'expired',
          description: 'חיוב נכשל - מנוי הוקפא',
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Webhook processed successfully',
      payment_id: paymentId,
      status: paymentData.status,
    });

  } catch (error: any) {
    console.error('Grow webhook error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// מאפשר POST בלבד
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

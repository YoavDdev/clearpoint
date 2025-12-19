import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyWebhookSignature, parseWebhookData } from "@/lib/payplus";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs'; // ✅ חשוב - מבטיח שזה רץ ב-Node.js ולא ב-Edge

/**
 * POST /api/webhooks/payplus/recurring
 * Webhook לקבלת עדכונים על חיובים חודשיים מ-PayPlus או Zapier
 * 
 * PayPlus/Zapier שולחים webhook אוטומטית כל פעם שמתבצע חיוב חודשי
 * (הצלחה או כשלון)
 */
export async function POST(req: NextRequest) {
  try {
    console.log("🔔 Received PayPlus recurring webhook");

    // שלב 1: אימות ש-webhook באמת מגיע מ-PayPlus או Zapier
    const userAgent = req.headers.get('user-agent') || '';
    const receivedHash = req.headers.get('hash') || '';
    const body = await req.text();
    const payload = JSON.parse(body);

    // זיהוי מקור: Zapier או PayPlus ישיר
    const isFromZapier = payload.source === 'zapier' || userAgent.toLowerCase().includes('zapier');
    
    console.log(`📥 Webhook source: ${isFromZapier ? 'Zapier' : 'PayPlus Direct'}`);

    // אימות signature (רק אם זה מגיע ישירות מ-PayPlus, לא דרך Zapier)
    if (!isFromZapier && process.env.PAYPLUS_USE_MOCK !== 'true') {
      const isValid = verifyWebhookSignature(payload, receivedHash, userAgent);
      if (!isValid) {
        console.error("❌ Invalid webhook signature");
        return NextResponse.json(
          { success: false, error: "Invalid signature" },
          { status: 401 }
        );
      }
      console.log("✅ Webhook signature verified");
    } else if (isFromZapier) {
      console.log("✅ Zapier webhook accepted (no signature validation needed)");
    }

    console.log("📦 Payload:", JSON.stringify(payload, null, 2));

    // שלב 2: פרסור הנתונים מ-PayPlus
    const webhookData = parseWebhookData(payload);
    
    // שלב 3: מצא את המנוי לפי recurring_uid או customer_uid
    // תמיכה במבנים שונים: ישיר, nested, או דרך Zapier
    let recurringUid = payload.recurring_uid 
      || payload.data?.recurring_uid 
      || payload.payload?.data?.recurring_uid
      || payload.payload?.recurring_uid;
    
    let customerUid = payload.customer_uid
      || payload.data?.customer_uid
      || payload.data?.data?.customer_uid
      || payload.payload?.customer_uid;
    
    // אם Zapier שולח את כל ה-payload בתוך payload.payload
    if (isFromZapier && payload.payload && typeof payload.payload === 'string') {
      try {
        const nestedPayload = JSON.parse(payload.payload);
        recurringUid = recurringUid || nestedPayload.data?.recurring_uid || nestedPayload.recurring_uid;
        customerUid = customerUid || nestedPayload.data?.customer_uid || nestedPayload.customer_uid;
      } catch (e) {
        console.log("⚠️ Could not parse nested payload");
      }
    }
    
    // בדוק שיש לפחות אחד מהשניים
    if (!recurringUid && !customerUid) {
      console.error("❌ Missing both recurring_uid and customer_uid in webhook");
      console.error("📦 Full payload for debugging:", JSON.stringify(payload, null, 2));
      return NextResponse.json(
        { success: false, error: "Missing recurring_uid or customer_uid" },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // נסה למצוא את המנוי - קודם לפי recurring_uid, אחר כך לפי customer_uid
    let subscription;
    let subError;
    
    if (recurringUid) {
      const result = await supabase
        .from("subscriptions")
        .select("*")
        .eq("recurring_uid", recurringUid)
        .single();
      subscription = result.data;
      subError = result.error;
    }
    
    // אם לא מצאנו לפי recurring_uid, נסה לפי customer_uid
    if ((!subscription || subError) && customerUid) {
      console.log("⚠️ Subscription not found by recurring_uid, trying customer_uid...");
      
      // מצא את ה-user לפי customer_uid
      const { data: user } = await supabase
        .from("users")
        .select("id")
        .eq("id", customerUid)
        .single();
      
      if (user) {
        const result = await supabase
          .from("subscriptions")
          .select("*")
          .eq("user_id", user.id)
          .eq("status", "active")
          .single();
        subscription = result.data;
        subError = result.error;
      }
    }

    if (subError || !subscription) {
      console.error("❌ Subscription not found for recurring_uid:", recurringUid);
      return NextResponse.json(
        { success: false, error: "Subscription not found" },
        { status: 404 }
      );
    }

    console.log("📋 Found subscription:", subscription.id);

    // שלב 4: שמור את החיוב בטבלת subscription_charges
    const chargeStatus = webhookData.status === 'completed' ? 'success' : 'failed';
    
    const { data: charge, error: chargeError } = await supabase
      .from("subscription_charges")
      .insert({
        subscription_id: subscription.id,
        user_id: subscription.user_id,
        amount: webhookData.amount,
        currency: subscription.currency || 'ILS',
        status: chargeStatus,
        transaction_id: webhookData.transactionId,
        recurring_uid: recurringUid,
        payment_method: subscription.payment_method || 'credit_card',
        error_code: webhookData.status !== 'completed' ? payload.status_code : null,
        error_message: webhookData.status !== 'completed' ? payload.status_description : null,
        charged_at: new Date(webhookData.paymentDate),
        metadata: payload,
      })
      .select()
      .single();

    if (chargeError) {
      console.error("❌ Error saving charge:", chargeError);
      return NextResponse.json(
        { success: false, error: "Failed to save charge" },
        { status: 500 }
      );
    }

    console.log(`💰 Charge recorded: ${charge.id} (${chargeStatus})`);

    // שלב 5: עדכן את המנוי בהתאם לתוצאה
    if (chargeStatus === 'success') {
      // חיוב הצליח - עדכן תאריכים ואפס כשלונות
      const nextPaymentDate = new Date();
      nextPaymentDate.setMonth(nextPaymentDate.getMonth() + (subscription.billing_cycle === 'monthly' ? 1 : 12));

      await supabase
        .from("subscriptions")
        .update({
          last_payment_date: new Date(webhookData.paymentDate),
          next_payment_date: nextPaymentDate,
          payment_failures: 0,
          status: 'active', // ודא שהסטטוס פעיל
        })
        .eq("id", subscription.id);

      console.log("✅ Subscription updated - payment successful");
      console.log(`📅 Next payment date: ${nextPaymentDate.toISOString()}`);

      // שלח אימייל ללקוח (אופציונלי)
      // await sendPaymentSuccessEmail(subscription.user_id, webhookData.amount);

    } else {
      // חיוב נכשל - הגדל payment_failures
      const newFailures = (subscription.payment_failures || 0) + 1;
      
      await supabase
        .from("subscriptions")
        .update({
          payment_failures: newFailures,
          // אם הגענו ל-3 כשלונות, השעה את המנוי
          status: newFailures >= 3 ? 'suspended' : subscription.status,
        })
        .eq("id", subscription.id);

      console.log(`⚠️ Payment failed - failures: ${newFailures}`);
      
      if (newFailures >= 3) {
        console.log("🚫 Subscription suspended due to multiple failures");
        // שלח אימייל ללקוח על השעיית המנוי
        // await sendPaymentFailureEmail(subscription.user_id, newFailures);
      }
    }

    // שלב 6: החזר תשובה ל-PayPlus
    return NextResponse.json({
      success: true,
      message: "Webhook processed successfully",
      chargeId: charge.id,
      status: chargeStatus,
    });

  } catch (error) {
    console.error("❌ Error processing PayPlus recurring webhook:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET endpoint לבדיקה
export async function GET() {
  return NextResponse.json({
    message: "PayPlus recurring webhook endpoint",
    method: "POST only",
    status: "active",
  });
}

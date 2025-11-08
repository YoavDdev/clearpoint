import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Webhook מ-Grow לעדכון סטטוס תשלומים ומנויים
 * POST /api/webhooks/grow
 */
export async function POST(req: NextRequest) {
  try {
    console.log("🔔 Grow Webhook received");

    const payload = await req.json();
    console.log("📦 Webhook payload:", JSON.stringify(payload, null, 2));

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Grow שולח את המידע הזה:
    // {
    //   status: '1' | '0',
    //   transactionId: string,
    //   processId: string,
    //   sum: number,
    //   customerId: string,
    //   cField1: paymentId,
    //   cField2: userId,
    //   cField3: planId,
    //   paymentType: 'recurring' | 'one_time'
    // }

    const {
      status,
      transactionId,
      processId,
      sum,
      customerId,
      cField1: paymentId,
      cField2: userId,
      cField3: planId,
      paymentType,
    } = payload;

    // בדיקה אם התשלום הצליח
    const paymentSuccess = status === "1";

    console.log("💳 Payment status:", paymentSuccess ? "Success" : "Failed");
    console.log("🆔 Payment ID:", paymentId);
    console.log("👤 User ID:", userId);

    // עדכון רשומת התשלום ב-payments
    if (paymentId) {
      const { error: paymentError } = await supabase
        .from("payments")
        .update({
          status: paymentSuccess ? "completed" : "failed",
          paid_at: paymentSuccess ? new Date().toISOString() : null,
          provider_payment_id: processId,
          provider_transaction_id: transactionId,
        })
        .eq("id", paymentId);

      if (paymentError) {
        console.error("❌ Failed to update payment:", paymentError);
      } else {
        console.log("✅ Payment updated successfully");
      }
    }

    // אם זה תשלום חוזר (מנוי), נעדכן את המנוי
    if (paymentType === "recurring" && userId) {
      console.log("🔄 Processing recurring payment for subscription");

      // קבלת המנוי
      const { data: subscription } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "active")
        .single();

      if (subscription) {
        if (paymentSuccess) {
          // חישוב תאריך חיוב הבא
          const nextBillingDate = new Date(subscription.next_billing_date);
          
          if (subscription.billing_cycle === "monthly") {
            nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
          } else if (subscription.billing_cycle === "yearly") {
            nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
          }

          // עדכון המנוי
          await supabase
            .from("subscriptions")
            .update({
              last_billing_date: new Date().toISOString().split("T")[0],
              next_billing_date: nextBillingDate.toISOString().split("T")[0],
              updated_at: new Date().toISOString(),
            })
            .eq("id", subscription.id);

          console.log("✅ Subscription updated - next billing:", nextBillingDate.toISOString());
        } else {
          // אם התשלום נכשל, נעדכן את הסטטוס ל-past_due
          await supabase
            .from("subscriptions")
            .update({
              status: "past_due",
              updated_at: new Date().toISOString(),
            })
            .eq("id", subscription.id);

          console.log("⚠️ Payment failed - subscription marked as past_due");
        }
      }
    }

    // החזרת תגובה ל-Grow
    return NextResponse.json({
      success: true,
      message: "Webhook processed successfully",
      paymentId,
      status: paymentSuccess ? "completed" : "failed",
    });
  } catch (error) {
    console.error("❌ Webhook error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to process webhook",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// אפשר גם GET למטרות בדיקה
export async function GET() {
  return NextResponse.json({
    message: "Grow Webhook Endpoint",
    url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/webhooks/grow`,
    status: "active",
  });
}

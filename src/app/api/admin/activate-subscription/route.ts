import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createRecurringSubscription, calculateNextBillingDate } from "@/lib/payplus";

export async function POST(req: NextRequest) {
  try {
    console.log("🔵 activate-subscription API called");
    const { userId, planId, billingCycle = "monthly", userEmail, userName, customPrice, cardToken } = await req.json();
    console.log("📦 Request data:", { userId, planId, billingCycle, customPrice, hasCardToken: !!cardToken });

    if (!userId || !planId) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // בדיקה אם כבר יש מנוי (כלשהו - לא רק active)
    const { data: existingSubscription, error: subCheckError } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .single();

    console.log("🔍 Existing subscription check:", { 
      found: !!existingSubscription, 
      status: existingSubscription?.status,
      error: subCheckError?.message 
    });

    if (existingSubscription) {
      // אם יש מנוי פעיל, נחזיר שגיאה
      if (existingSubscription.status === "active") {
        console.log("❌ User already has active subscription:", existingSubscription.id);
        return NextResponse.json(
          { success: false, error: "User already has an active subscription" },
          { status: 400 }
        );
      }
      
      // אם יש מנוי ישן (לא פעיל), נמחק אותו ונמשיך
      console.log("🗑️ Deleting old subscription:", {
        id: existingSubscription.id,
        status: existingSubscription.status
      });
      await supabase
        .from("subscriptions")
        .delete()
        .eq("id", existingSubscription.id);
    }

    // קבלת פרטי התוכנית
    const { data: plan } = await supabase
      .from("plans")
      .select("*")
      .eq("id", planId)
      .single();

    if (!plan) {
      return NextResponse.json(
        { success: false, error: "Plan not found" },
        { status: 404 }
      );
    }

    // קבלת פרטי משתמש
    const { data: user } = await supabase
      .from("users")
      .select("id, full_name, email, phone")
      .eq("id", userId)
      .single();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    // חישוב מחיר - אם יש מחיר מותאם אישית, נשתמש בו
    let amount = customPrice || plan.monthly_price || 99;

    if (billingCycle === "yearly") {
      amount = amount * 12 * 0.85; // 15% הנחה לשנתי
    }

    // חישוב תאריך חיוב הבא
    const now = new Date();
    const nextBillingDate = calculateNextBillingDate(billingCycle, now);

    // יצירת רשומת מנוי
    const { data: subscription, error: subscriptionError } = await supabase
      .from("subscriptions")
      .insert({
        user_id: userId,
        plan_id: planId,
        status: "active",
        billing_cycle: billingCycle,
        amount: amount,
        currency: "ILS",
        next_billing_date: nextBillingDate.toISOString().split("T")[0],
        billing_day: now.getDate(),
        payment_provider: "grow",
        started_at: now.toISOString(),
      })
      .select()
      .single();

    if (subscriptionError || !subscription) {
      console.error("Failed to create subscription record:", subscriptionError);
      return NextResponse.json(
        { success: false, error: "Failed to create subscription record" },
        { status: 500 }
      );
    }

    // יצירת תשלום ראשון
    const { data: firstPayment, error: paymentError } = await supabase
      .from("payments")
      .insert({
        user_id: userId,
        payment_type: "recurring",
        amount: amount.toString(),
        currency: "ILS",
        status: "pending",
        payment_provider: "grow",
        description: `מנוי ${billingCycle === "monthly" ? "חודשי" : "שנתי"} - ${plan.name_he || plan.plan_name}`,
        metadata: {
          subscription_id: subscription.id,
          plan_id: planId,
          billing_cycle: billingCycle,
        },
      })
      .select()
      .single();

    if (paymentError || !firstPayment) {
      console.error("Failed to create payment record:", paymentError);
      // מחיקת המנוי אם התשלום נכשל
      await supabase.from("subscriptions").delete().eq("id", subscription.id);
      return NextResponse.json(
        { success: false, error: "Failed to create payment record" },
        { status: 500 }
      );
    }

    // יצירת מנוי חוזר ב-Grow
    console.log("🚀 Creating Grow subscription...");
    if (cardToken) {
      console.log("💳 Using card token from previous payment");
    }
    let growSubscription;
    try {
      growSubscription = await createRecurringSubscription({
        customer_id: userId,
        amount: amount,
        currency: "ILS",
        description: `Clearpoint Security - ${plan.name_he || plan.plan_name} (${billingCycle})`,
        customer_name: user.full_name || userName || user.email,
        customer_email: user.email || userEmail,
        customer_phone: user.phone || "",
        billing_cycle: billingCycle,
        start_date: now.toISOString().split("T")[0],
        card_token: cardToken, // 💳 העברת card token אם קיים
      });
    } catch (growError) {
      console.error("❌ Grow subscription creation failed:", growError);
      // עדכון סטטוס המנוי והתשלום לכישלון
      await supabase
        .from("subscriptions")
        .update({ status: "cancelled" })
        .eq("id", subscription.id);

      await supabase
        .from("payments")
        .update({ status: "failed" })
        .eq("id", firstPayment.id);

      return NextResponse.json(
        { 
          success: false, 
          error: "Failed to create Grow subscription",
          details: growError instanceof Error ? growError.message : "Unknown Grow error"
        },
        { status: 500 }
      );
    }

    if (!growSubscription.data?.pageUrl) {
      console.error("❌ Grow returned no pageUrl");
      // עדכון סטטוס המנוי והתשלום לכישלון
      await supabase
        .from("subscriptions")
        .update({ status: "cancelled" })
        .eq("id", subscription.id);

      await supabase
        .from("payments")
        .update({ status: "failed" })
        .eq("id", firstPayment.id);

      return NextResponse.json(
        { success: false, error: "Failed to create Grow subscription - no payment URL" },
        { status: 500 }
      );
    }

    // עדכון המנוי עם ה-provider_subscription_id
    await supabase
      .from("subscriptions")
      .update({
        provider_subscription_id: growSubscription.data.processId,
        provider_customer_id: growSubscription.data.transactionId,
      })
      .eq("id", subscription.id);

    // עדכון התשלום הראשון
    await supabase
      .from("payments")
      .update({
        provider_payment_id: growSubscription.data.processId,
        provider_transaction_id: growSubscription.data.transactionId,
      })
      .eq("id", firstPayment.id);

    // רישום בהיסטוריה אם הטבלה קיימת
    try {
      await supabase.from("subscription_history").insert({
        subscription_id: subscription.id,
        user_id: userId,
        event_type: "created",
        new_status: "active",
        new_plan_id: planId,
        description: `מנוי חדש נוצר - ${plan.name_he || plan.plan_name}`,
        metadata: {
          billing_cycle: billingCycle,
          amount: amount,
        },
      });
    } catch (historyError) {
      console.log("⚠️ subscription_history table does not exist, skipping history log");
    }

    // עדכון טבלת users עם subscription_id
    await supabase
      .from("users")
      .update({ subscription_id: subscription.id })
      .eq("id", userId);

    return NextResponse.json({
      success: true,
      subscription: {
        id: subscription.id,
        planId: planId,
        amount: amount,
        billingCycle: billingCycle,
        nextBillingDate: nextBillingDate.toISOString(),
      },
    });
  } catch (error) {
    console.error("❌ Activate subscription error:", error);
    console.error("❌ Error stack:", error instanceof Error ? error.stack : "No stack trace");
    console.error("❌ Error details:", {
      name: error instanceof Error ? error.name : 'unknown',
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

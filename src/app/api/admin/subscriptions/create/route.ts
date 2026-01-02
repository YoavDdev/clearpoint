import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createRecurringSubscription } from "@/lib/payplus";

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/subscriptions/create
 * יצירת מנוי חודשי חדש עם 30 יום ניסיון חינם
 * 
 * Body:
 * {
 *   userId: string
 *   planId: string
 *   amount: number
 *   trialDays?: number (default: 30)
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const { userId, planId, amount, trialDays = 30 } = await req.json();

    if (!userId || !planId || !amount) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. קבלת פרטי משתמש
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, full_name, email, phone")
      .eq("id", userId)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    // 2. בדיקה אם יש מנוי פעיל
    const { data: existingSubscription } = await supabase
      .from("subscriptions")
      .select("id, status")
      .eq("user_id", userId)
      .in("status", ["trial", "active"])
      .single();

    if (existingSubscription) {
      return NextResponse.json(
        { 
          success: false, 
          error: "User already has active subscription",
          subscription_id: existingSubscription.id
        },
        { status: 400 }
      );
    }

    // 3. חישוב תאריכים
    const now = new Date();
    const trialEndsAt = new Date(now);
    trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

    const startDate = new Date(trialEndsAt);
    startDate.setDate(startDate.getDate() + 1); // חיוב ראשון יום אחרי סיום trial

    const currentPeriodStart = now;
    const currentPeriodEnd = new Date(trialEndsAt);

    console.log("📅 Trial dates:");
    console.log("  Now:", now.toISOString());
    console.log("  Trial ends:", trialEndsAt.toISOString());
    console.log("  First charge:", startDate.toISOString().split('T')[0]);

    // 4. יצירת הוראת קבע ב-PayPlus
    console.log("🔄 Creating recurring payment in PayPlus...");
    const recurringResponse = await createRecurringSubscription({
      customer_id: userId,
      amount: amount,
      currency: "ILS",
      description: `מנוי חודשי Clearpoint Security - ${user.full_name}`,
      customer_name: user.full_name,
      customer_email: user.email,
      customer_phone: user.phone || "",
      billing_cycle: "monthly",
      start_date: startDate.toISOString().split('T')[0], // חיוב ראשון אחרי trial
      notify_url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/webhooks/payplus/recurring`,
    });

    if (recurringResponse.status !== "1" || !recurringResponse.data) {
      console.error("❌ PayPlus recurring payment failed:", recurringResponse);
      return NextResponse.json(
        { 
          success: false, 
          error: "Failed to create recurring payment in PayPlus", 
          details: recurringResponse.err 
        },
        { status: 500 }
      );
    }

    console.log("✅ PayPlus recurring created:", recurringResponse.data);

    // 5. שמירת המנוי ב-DB
    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .insert({
        user_id: userId,
        plan_id: planId,
        status: 'trial', // מתחיל כ-trial!
        billing_cycle: 'monthly',
        amount: amount,
        currency: 'ILS',
        trial_ends_at: trialEndsAt.toISOString(),
        trial_days: trialDays,
        current_period_start: currentPeriodStart.toISOString().split('T')[0],
        current_period_end: currentPeriodEnd.toISOString().split('T')[0],
        next_billing_date: startDate.toISOString().split('T')[0],
        payment_provider: 'payplus',
        payment_method: 'credit_card',
        provider_subscription_id: recurringResponse.data.processId,
        provider_customer_id: null, // יתמלא מה-webhook
        started_at: now.toISOString(),
        metadata: {
          payplus_response: recurringResponse.data,
          payment_link: recurringResponse.data.pageUrl,
          trial_enabled: true,
        },
      })
      .select()
      .single();

    if (subError || !subscription) {
      console.error("❌ Failed to save subscription to DB:", subError);
      return NextResponse.json(
        { success: false, error: "Failed to save subscription" },
        { status: 500 }
      );
    }

    console.log("✅ Subscription saved to DB:", subscription.id);

    return NextResponse.json({
      success: true,
      subscription: {
        id: subscription.id,
        status: 'trial',
        trial_ends_at: trialEndsAt.toISOString(),
        trial_days: trialDays,
        first_charge_date: startDate.toISOString().split('T')[0],
        amount: amount,
        currency: 'ILS',
      },
      paymentUrl: recurringResponse.data.pageUrl,
      message: `מנוי נוצר עם ${trialDays} ימי ניסיון חינם. שלח את הלינק ללקוח למילוי פרטי תשלום.`,
      instructions: [
        `✅ תקופת ניסיון: ${trialDays} ימים (עד ${trialEndsAt.toLocaleDateString('he-IL')})`,
        `💳 חיוב ראשון: ${startDate.toLocaleDateString('he-IL')}`,
        `🔗 שלח את הלינק ללקוח`,
        `📧 לקוח ימלא פרטי כרטיס ב-PayPlus`,
        `🎉 המנוי יהפוך לפעיל אוטומטית אחרי ${trialDays} יום`,
      ]
    });

  } catch (error) {
    console.error("Error in create subscription:", error);
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

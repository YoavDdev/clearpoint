import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * API זמני להפעלת מנוי ידנית למשתמש (לבדיקות בלבד!)
 * POST /api/admin/enable-test-subscription
 */
export async function POST(req: NextRequest) {
  try {
    const { userId, monthlyPrice = 149 } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Missing userId" },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // בדיקה אם כבר יש מנוי פעיל
    const { data: existingSub } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "active")
      .single();

    if (existingSub) {
      return NextResponse.json({
        success: true,
        message: "User already has active subscription",
        subscription: existingSub,
      });
    }

    // חודש מהיום
    const nextBillingDate = new Date();
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

    // יצירת מנוי ידנית
    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .insert({
        user_id: userId,
        plan_id: "test-monthly",
        status: "active",
        billing_cycle: "monthly",
        amount: monthlyPrice,
        currency: "ILS",
        next_billing_date: nextBillingDate.toISOString().split("T")[0],
        started_at: new Date().toISOString(),
        payment_provider: "manual",
        metadata: {
          note: "Created manually for testing",
          created_at: new Date().toISOString(),
        },
      })
      .select()
      .single();

    if (subError || !subscription) {
      console.error("Failed to create subscription:", subError);
      return NextResponse.json(
        { success: false, error: "Failed to create subscription" },
        { status: 500 }
      );
    }

    // עדכון המשתמש
    await supabase
      .from("users")
      .update({
        plan_duration_days: 14,
        subscription_active: true,
      })
      .eq("id", userId);

    console.log("✅ Test subscription created:", subscription.id);

    return NextResponse.json({
      success: true,
      message: "Test subscription activated successfully!",
      subscription: {
        id: subscription.id,
        status: subscription.status,
        amount: subscription.amount,
        next_billing_date: subscription.next_billing_date,
      },
    });
  } catch (error) {
    console.error("Error enabling test subscription:", error);
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

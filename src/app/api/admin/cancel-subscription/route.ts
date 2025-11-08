import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const { subscriptionId } = await req.json();

    if (!subscriptionId) {
      return NextResponse.json(
        { success: false, error: "Subscription ID is required" },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // בדיקה שהמנוי קיים
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("id", subscriptionId)
      .single();

    if (!subscription) {
      return NextResponse.json(
        { success: false, error: "Subscription not found" },
        { status: 404 }
      );
    }

    // עדכון סטטוס המנוי
    const { error: updateError } = await supabase
      .from("subscriptions")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
      })
      .eq("id", subscriptionId);

    if (updateError) {
      console.error("Failed to cancel subscription:", updateError);
      return NextResponse.json(
        { success: false, error: "Failed to cancel subscription" },
        { status: 500 }
      );
    }

    // רישום בהיסטוריה אם הטבלה קיימת
    try {
      await supabase.from("subscription_history").insert({
        subscription_id: subscriptionId,
        user_id: subscription.user_id,
        event_type: "cancelled",
        old_status: subscription.status,
        new_status: "cancelled",
        description: "מנוי בוטל על ידי אדמין",
      });
    } catch (historyError) {
      console.log("⚠️ subscription_history table does not exist, skipping history log");
    }

    // TODO: ביטול המנוי ב-Grow אם יש provider_subscription_id
    // צריך להוסיף פונקציה ב-lib/grow.ts

    return NextResponse.json({
      success: true,
      message: "Subscription cancelled successfully",
    });
  } catch (error) {
    console.error("Cancel subscription error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

/**
 * ביטול מנוי על ידי הלקוח
 * POST /api/user/cancel-subscription
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // אימות משתמש
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { reason } = await req.json();

    console.log(`🚫 User requesting cancellation: ${session.user.email}`);

    // קבלת פרטי המשתמש
    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("email", session.user.email)
      .single();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    // קבלת המנוי הפעיל
    const { data: subscription, error: fetchError } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (fetchError || !subscription) {
      return NextResponse.json(
        { success: false, error: "No active subscription found" },
        { status: 404 }
      );
    }

    // ביטול המנוי
    const { error: updateError } = await supabase
      .from("subscriptions")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason || "User requested cancellation",
      })
      .eq("id", subscription.id);

    if (updateError) {
      console.error("Failed to cancel subscription:", updateError);
      return NextResponse.json(
        { success: false, error: "Failed to cancel subscription" },
        { status: 500 }
      );
    }

    // רישום בהיסטוריה (אם הטבלה קיימת)
    try {
      await supabase.from("subscription_history").insert({
        subscription_id: subscription.id,
        user_id: user.id,
        event_type: "cancelled",
        old_status: "active",
        new_status: "cancelled",
        description: `מנוי בוטל על ידי הלקוח - ${reason || "ללא סיבה"}`,
      });
    } catch (historyError) {
      console.log("⚠️ subscription_history table does not exist, skipping history log");
    }

    // TODO: ביטול המנוי ב-Grow אם יש provider_subscription_id
    // אם יש provider_subscription_id, צריך לשלוח בקשה ל-Grow API לביטול החיוב

    console.log(`✅ Subscription cancelled successfully for user: ${user.id}`);

    return NextResponse.json({
      success: true,
      message: "Subscription cancelled successfully",
    });
  } catch (error) {
    console.error("Cancel subscription error:", error);
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

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = 'force-dynamic';

/**
 * GET /api/user/check-subscription
 * בדיקה אם למשתמש יש subscription פעיל
 */
export async function GET(req: NextRequest) {
  try {
    const userEmail = req.headers.get('x-user-email');
    
    if (!userEmail) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // מצא משתמש
    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("email", userEmail)
      .single();

    if (!user) {
      return NextResponse.json({
        success: true,
        data: { hasActiveSubscription: false }
      });
    }

    // בדוק subscription פעיל
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("id, status, next_billing_date, grace_period_end")
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    let hasActiveSubscription = false;

    if (subscription) {
      // אם המנוי פעיל, בדוק שלא עבר מועד החיוב
      const now = new Date();
      const nextBilling = new Date(subscription.next_billing_date);
      
      // מנוי פעיל אם:
      // 1. סטטוס active
      // 2. לא עברו יותר מ-7 ימים מהחיוב הבא (grace period)
      const daysSinceExpired = Math.floor(
        (now.getTime() - nextBilling.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      hasActiveSubscription = daysSinceExpired <= 7;
    }

    // בדוק גם subscription מבוטל עם grace period
    if (!hasActiveSubscription) {
      const { data: cancelledSub } = await supabase
        .from("subscriptions")
        .select("id, grace_period_end")
        .eq("user_id", user.id)
        .eq("status", "cancelled")
        .single();

      if (cancelledSub?.grace_period_end) {
        const now = new Date();
        const graceEnd = new Date(cancelledSub.grace_period_end);
        hasActiveSubscription = now < graceEnd;
      }
    }

    return NextResponse.json({
      success: true,
      data: { hasActiveSubscription }
    });

  } catch (error) {
    console.error("Error checking subscription:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

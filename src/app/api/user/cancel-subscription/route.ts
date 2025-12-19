import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";
import { cancelSubscription } from "@/lib/payplus";

export const dynamic = 'force-dynamic';

/**
 * POST /api/user/cancel-subscription
 * ביטול מנוי עם Grace Period - המשתמש ממשיך לקבל גישה עד סוף החודש ששולם
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { reason } = body;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get user
    const { data: user } = await supabase
      .from("users")
      .select("id, email, full_name")
      .eq("email", session.user.email)
      .single();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    // Get active subscription
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (!subscription) {
      return NextResponse.json(
        { success: false, error: "No active subscription found" },
        { status: 404 }
      );
    }

    // שלב 1: בטל ב-PayPlus (עוצר חיובים עתידיים)
    let payPlusCancelled = false;
    if (subscription.recurring_uid) {
      payPlusCancelled = await cancelSubscription(subscription.recurring_uid);
      
      if (!payPlusCancelled) {
        console.warn("⚠️ Failed to cancel on PayPlus, but continuing with local cancellation");
      } else {
        console.log("✅ Successfully cancelled recurring payment on PayPlus");
      }
    }

    // שלב 2: חשב Grace Period - עד סוף החודש ששולם
    let gracePeriodEnd: Date;
    
    if (subscription.last_payment_date) {
      // יש תשלום אחרון - חשב מתי מסתיים החודש ששולם
      gracePeriodEnd = new Date(subscription.last_payment_date);
      if (subscription.billing_cycle === 'monthly') {
        gracePeriodEnd.setMonth(gracePeriodEnd.getMonth() + 1);
      } else if (subscription.billing_cycle === 'yearly') {
        gracePeriodEnd.setFullYear(gracePeriodEnd.getFullYear() + 1);
      }
    } else if (subscription.free_trial_end) {
      // עדיין בתקופת ניסיון - סיים את תקופת הניסיון
      gracePeriodEnd = new Date(subscription.free_trial_end);
    } else {
      // אין מידע - תן 30 יום מהיום
      gracePeriodEnd = new Date();
      gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 30);
    }

    // שלב 3: עדכן את המנוי ל-cancelled עם Grace Period
    const { error: updateError } = await supabase
      .from("subscriptions")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason || null,
        grace_period_end: gracePeriodEnd.toISOString(),
        auto_renew: false,
      })
      .eq("id", subscription.id);

    if (updateError) {
      console.error("Error updating subscription:", updateError);
      return NextResponse.json(
        { success: false, error: "Failed to cancel subscription" },
        { status: 500 }
      );
    }

    console.log(`✅ Subscription cancelled with grace period until: ${gracePeriodEnd.toISOString()}`);

    // שלב 4: שלח אימייל ללקוח (אופציונלי)
    // await sendCancellationEmail(user.email, gracePeriodEnd);

    return NextResponse.json({
      success: true,
      message: "המנוי בוטל בהצלחה",
      gracePeriodEnd: gracePeriodEnd.toISOString(),
      daysRemaining: Math.ceil((gracePeriodEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      payPlusCancelled,
    });
  } catch (error) {
    console.error("Error cancelling subscription:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

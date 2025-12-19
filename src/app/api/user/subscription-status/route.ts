import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";

export const dynamic = 'force-dynamic';

/**
 * GET /api/user/subscription-status
 * בדיקת סטטוס מנוי וגישה של המשתמש המחובר
 * 
 * מחזיר:
 * - hasAccess: האם יש למשתמש גישה למערכת
 * - reason: הסיבה (free_trial, active_subscription, grace_period, וכו')
 * - subscription: פרטי המנוי
 * - expiresAt: מתי פוגה הגישה
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // שלב 1: קבל את ה-user_id
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

    // שלב 2: השתמש בפונקציה שיצרנו ב-Database
    const { data: accessCheck, error: accessError } = await supabase
      .rpc('check_subscription_access', { user_id_param: user.id });

    if (accessError) {
      console.error("Error checking subscription access:", accessError);
      return NextResponse.json(
        { success: false, error: "Failed to check subscription" },
        { status: 500 }
      );
    }

    const access = accessCheck[0];

    // שלב 3: אם יש מנוי, שלוף את הפרטים המלאים
    let subscription = null;
    if (access.subscription_id) {
      const { data: subData } = await supabase
        .from("subscriptions")
        .select(`
          *,
          plan:plans(*)
        `)
        .eq("id", access.subscription_id)
        .single();

      subscription = subData;
    }

    // שלב 4: אם יש recurring_uid, בדוק את הסטטוס ב-PayPlus (אופציונלי)
    let payplusStatus = null;
    if (subscription?.recurring_uid && subscription.status === 'active') {
      try {
        // כאן ניתן להוסיף קריאה ל-PayPlus API לבדיקת סטטוס
        // const payplusResponse = await fetch(`https://restapi.payplus.co.il/api/v1.0/RecurringPayments/ViewRecurring/${subscription.recurring_uid}`, ...)
        // payplusStatus = payplusResponse.data;
      } catch (error) {
        console.warn("Failed to check PayPlus status:", error);
        // לא חשוב אם נכשל - נסמוך על ה-Database
      }
    }

    // שלב 5: בנה את התשובה
    return NextResponse.json({
      success: true,
      hasAccess: access.has_access,
      reason: access.reason,
      subscription: subscription ? {
        id: subscription.id,
        status: subscription.status,
        planName: subscription.plan?.name,
        billingCycle: subscription.billing_cycle,
        amount: subscription.amount,
        currency: subscription.currency,
        recurringUid: subscription.recurring_uid,
        paymentMethod: subscription.payment_method,
        nextPaymentDate: subscription.next_payment_date,
        lastPaymentDate: subscription.last_payment_date,
        freeTrialEnd: subscription.free_trial_end,
        gracePeriodEnd: subscription.grace_period_end,
        paymentFailures: subscription.payment_failures,
        autoRenew: subscription.auto_renew,
        cancelledAt: subscription.cancelled_at,
      } : null,
      expiresAt: access.expires_at,
      payplusStatus, // מידע נוסף מ-PayPlus אם קיים
    });
  } catch (error) {
    console.error("Error in subscription-status API:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

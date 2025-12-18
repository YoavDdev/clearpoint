import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export const dynamic = 'force-dynamic';

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

    // ביטול המנוי ב-PayPlus אם יש provider_subscription_id
    if (subscription.provider_subscription_id) {
      console.log(`🚫 Cancelling subscription in PayPlus: ${subscription.provider_subscription_id}`);
      
      const { cancelSubscription } = await import('@/lib/payplus');
      const payPlusCancelled = await cancelSubscription(subscription.provider_subscription_id);
      
      if (!payPlusCancelled) {
        console.error('❌ Failed to cancel subscription in PayPlus');
        // נמשיך בכל זאת - לפחות ביטלנו ב-DB שלנו
      } else {
        console.log('✅ Subscription cancelled in PayPlus successfully');
      }
    } else {
      console.log('⚠️ No provider_subscription_id - cancelling only in DB');
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

    console.log(`✅ Subscription cancelled successfully for user: ${user.id}`);

    // שליחת אימייל אישור ביטול
    try {
      const { sendCancellationConfirmation } = await import('@/lib/email');
      
      // קבלת פרטי המשתמש
      const { data: userData } = await supabase
        .from("users")
        .select("full_name, email")
        .eq("id", user.id)
        .single();

      if (userData) {
        await sendCancellationConfirmation({
          customerName: userData.full_name || userData.email,
          customerEmail: userData.email,
          cancellationDate: new Date().toLocaleDateString('he-IL'),
          endOfServiceDate: subscription.next_billing_date 
            ? new Date(subscription.next_billing_date).toLocaleDateString('he-IL')
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('he-IL'),
          cancellationReason: reason || undefined,
        });
        console.log('📧 Cancellation confirmation email sent');
      }
    } catch (emailError) {
      console.error('⚠️ Failed to send cancellation email:', emailError);
      // לא עוצרים את הזרימה אם המייל נכשל
    }

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

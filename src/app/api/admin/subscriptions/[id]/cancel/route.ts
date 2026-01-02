import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { payplusClient } from "@/lib/payplusClient";

export const dynamic = 'force-dynamic';

/**
 * PUT /api/admin/subscriptions/[id]/cancel
 * ביטול מנוי - תמיד בסוף תקופה נוכחית (לא מיידי)
 * 
 * Body:
 * {
 *   reason?: string - סיבת ביטול
 * }
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { reason } = await req.json();
    const subscriptionId = params.id;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. קבלת המנוי
    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .select("*, users(full_name, email)")
      .eq("id", subscriptionId)
      .single();

    if (subError || !subscription) {
      return NextResponse.json(
        { success: false, error: "Subscription not found" },
        { status: 404 }
      );
    }

    // 2. בדיקת סטטוס
    if (subscription.cancel_at_period_end) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Subscription already scheduled for cancellation",
          cancels_at: subscription.current_period_end
        },
        { status: 400 }
      );
    }

    if (!['trial', 'active'].includes(subscription.status)) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Cannot cancel subscription with status: ${subscription.status}` 
        },
        { status: 400 }
      );
    }

    // 3. חישוב תאריך סיום
    const now = new Date();
    let cancellationDate: Date;

    if (subscription.status === 'trial') {
      // אם זה trial - סיים מיידית (אין חיוב)
      cancellationDate = now;
    } else {
      // אם זה active - ביטול בסוף תקופה נוכחית
      cancellationDate = subscription.current_period_end 
        ? new Date(subscription.current_period_end)
        : new Date(subscription.next_billing_date);
    }

    // 4. ביטול ב-PayPlus
    if (subscription.provider_subscription_id) {
      console.log(`🛑 Cancelling recurring in PayPlus: ${subscription.provider_subscription_id}`);
      const cancelled = await payplusClient.cancelRecurring(
        subscription.provider_subscription_id
      );
      
      if (!cancelled) {
        console.warn("⚠️ Failed to cancel in PayPlus, but continuing with DB cancellation");
      }
    }

    // 5. עדכון ב-DB
    const updateData: any = {
      cancellation_reason: reason || 'Cancelled by admin',
      updated_at: now.toISOString(),
    };

    if (subscription.status === 'trial') {
      // Trial - ביטול מיידי
      updateData.status = 'cancelled';
      updateData.cancelled_at = now.toISOString();
    } else {
      // Active - ביטול בסוף תקופה
      updateData.cancel_at_period_end = true;
      updateData.cancelled_at = now.toISOString();
    }

    const { data: updated, error: updateError } = await supabase
      .from("subscriptions")
      .update(updateData)
      .eq("id", subscriptionId)
      .select()
      .single();

    if (updateError || !updated) {
      return NextResponse.json(
        { success: false, error: "Failed to cancel subscription" },
        { status: 500 }
      );
    }

    console.log(`❌ Subscription ${subscriptionId} cancelled`);

    // 6. הודעה למשתמש
    const message = subscription.status === 'trial'
      ? "מנוי בוטל מיידית (תקופת ניסיון)"
      : `המנוי יבוטל ב-${cancellationDate.toLocaleDateString('he-IL')} (סוף תקופת חיוב נוכחית)`;

    return NextResponse.json({
      success: true,
      subscription: updated,
      message,
      cancels_at: cancellationDate.toISOString(),
      immediate: subscription.status === 'trial',
    });

  } catch (error) {
    console.error("Error cancelling subscription:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

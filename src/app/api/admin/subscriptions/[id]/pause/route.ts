import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { payplusClient } from "@/lib/payplusClient";

export const dynamic = 'force-dynamic';

/**
 * PUT /api/admin/subscriptions/[id]/pause
 * הקפאת מנוי (רק אדמין!)
 * 
 * Body:
 * {
 *   pauseUntil?: string (date) - עד מתי להקפיא (אופציונלי)
 *   reason?: string - סיבת הקפאה
 * }
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { pauseUntil, reason } = await req.json();
    const subscriptionId = params.id;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. קבלת המנוי
    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("id", subscriptionId)
      .single();

    if (subError || !subscription) {
      return NextResponse.json(
        { success: false, error: "Subscription not found" },
        { status: 404 }
      );
    }

    // 2. בדיקת סטטוס - אפשר להקפיא רק trial/active
    if (!['trial', 'active'].includes(subscription.status)) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Cannot pause subscription with status: ${subscription.status}` 
        },
        { status: 400 }
      );
    }

    // 3. ביטול ב-PayPlus (השעיה זמנית)
    if (subscription.provider_subscription_id) {
      console.log(`🛑 Cancelling recurring in PayPlus: ${subscription.provider_subscription_id}`);
      const cancelled = await payplusClient.cancelRecurring(
        subscription.provider_subscription_id
      );
      
      if (!cancelled) {
        console.warn("⚠️ Failed to cancel in PayPlus, but continuing with DB pause");
      }
    }

    // 4. עדכון ב-DB
    const pausedAt = new Date();
    const pausedUntilDate = pauseUntil ? new Date(pauseUntil) : null;

    const { data: updated, error: updateError } = await supabase
      .from("subscriptions")
      .update({
        status: 'paused',
        paused_at: pausedAt.toISOString(),
        paused_until: pausedUntilDate?.toISOString() || null,
        pause_reason: reason || 'Admin paused',
        updated_at: pausedAt.toISOString(),
      })
      .eq("id", subscriptionId)
      .select()
      .single();

    if (updateError || !updated) {
      return NextResponse.json(
        { success: false, error: "Failed to pause subscription" },
        { status: 500 }
      );
    }

    console.log(`⏸️ Subscription ${subscriptionId} paused`);

    return NextResponse.json({
      success: true,
      subscription: updated,
      message: pausedUntilDate 
        ? `מנוי הוקפא עד ${pausedUntilDate.toLocaleDateString('he-IL')}`
        : "מנוי הוקפא ללא הגבלת זמן",
    });

  } catch (error) {
    console.error("Error pausing subscription:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

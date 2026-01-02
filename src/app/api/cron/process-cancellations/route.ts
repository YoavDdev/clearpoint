import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * GET /api/cron/process-cancellations
 * Cron Job - מעבד ביטולים מתוזמנים (cancel_at_period_end)
 * 
 * מה זה עושה:
 * 1. מוצא מנויים עם cancel_at_period_end=true שהתקופה הסתיימה
 * 2. מעדכן status ל-'cancelled'
 * 3. חוסם גישה למערכת
 * 
 * רץ אוטומטית כל יום ב-1:00 בבוקר
 */
export async function GET(req: NextRequest) {
  try {
    // אימות Cron secret
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    console.log("🤖 [CRON] Process cancellations started...");

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // מצא מנויים לביטול
    const { data: toCancel, error: fetchError } = await supabase
      .rpc("find_subscriptions_to_cancel");

    if (fetchError) {
      console.error("❌ Error fetching cancellations:", fetchError);
      return NextResponse.json(
        { success: false, error: "Failed to fetch cancellations" },
        { status: 500 }
      );
    }

    if (!toCancel || toCancel.length === 0) {
      console.log("✅ No cancellations to process");
      return NextResponse.json({
        success: true,
        message: "No cancellations to process",
        processed: 0,
      });
    }

    console.log(`📋 Found ${toCancel.length} subscriptions to cancel`);

    let processed = 0;
    let errors = 0;

    for (const item of toCancel) {
      try {
        console.log(`❌ Cancelling subscription: ${item.subscription_id}`);

        const { error: updateError } = await supabase
          .from("subscriptions")
          .update({
            status: 'cancelled',
            cancel_at_period_end: false, // כבר בוטל
            updated_at: new Date().toISOString(),
          })
          .eq("id", item.subscription_id);

        if (updateError) {
          console.error(`❌ Failed to cancel subscription ${item.subscription_id}:`, updateError);
          errors++;
          continue;
        }

        console.log(`✅ Subscription cancelled: ${item.subscription_id}`);
        
        // TODO: שלח מייל ללקוח - "המנוי שלך בוטל"

        processed++;

      } catch (error) {
        console.error(`❌ Error cancelling subscription ${item.subscription_id}:`, error);
        errors++;
      }
    }

    console.log(`✅ Process cancellations completed: ${processed} processed, ${errors} errors`);

    return NextResponse.json({
      success: true,
      message: `Processed ${processed} cancellations`,
      stats: {
        found: toCancel.length,
        processed,
        errors,
      },
    });

  } catch (error) {
    console.error("❌ Error in process-cancellations:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

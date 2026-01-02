import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * GET /api/cron/resume-paused
 * Cron Job - מחדש מנויים מוקפאים שהגיע זמן חידושם
 * 
 * מה זה עושה:
 * 1. מוצא מנויים paused עם paused_until שעבר
 * 2. מעדכן status חזרה ל-'active'
 * 3. חיובים יתחדשו אוטומטית ב-PayPlus
 * 
 * רץ אוטומטית כל יום ב-3:00 בבוקר
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

    console.log("🤖 [CRON] Resume paused subscriptions started...");

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // מצא מנויים לחידוש
    const { data: toResume, error: fetchError } = await supabase
      .rpc("find_paused_to_resume");

    if (fetchError) {
      console.error("❌ Error fetching paused subscriptions:", fetchError);
      return NextResponse.json(
        { success: false, error: "Failed to fetch paused subscriptions" },
        { status: 500 }
      );
    }

    if (!toResume || toResume.length === 0) {
      console.log("✅ No paused subscriptions to resume");
      return NextResponse.json({
        success: true,
        message: "No paused subscriptions to resume",
        processed: 0,
      });
    }

    console.log(`📋 Found ${toResume.length} paused subscriptions to resume`);

    let processed = 0;
    let errors = 0;

    for (const item of toResume) {
      try {
        console.log(`▶️ Resuming subscription: ${item.subscription_id}`);

        // חישוב תאריך חיוב הבא
        const nextBillingDate = new Date();
        nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

        const { error: updateError } = await supabase
          .from("subscriptions")
          .update({
            status: 'active',
            paused_at: null,
            paused_until: null,
            pause_reason: null,
            next_billing_date: nextBillingDate.toISOString().split('T')[0],
            updated_at: new Date().toISOString(),
          })
          .eq("id", item.subscription_id);

        if (updateError) {
          console.error(`❌ Failed to resume subscription ${item.subscription_id}:`, updateError);
          errors++;
          continue;
        }

        console.log(`✅ Subscription resumed: ${item.subscription_id}`);
        
        // TODO: שלח מייל ללקוח - "המנוי שלך חודש! החיוב הבא ב-X"

        processed++;

      } catch (error) {
        console.error(`❌ Error resuming subscription ${item.subscription_id}:`, error);
        errors++;
      }
    }

    console.log(`✅ Resume paused completed: ${processed} processed, ${errors} errors`);

    return NextResponse.json({
      success: true,
      message: `Resumed ${processed} subscriptions`,
      stats: {
        found: toResume.length,
        processed,
        errors,
      },
    });

  } catch (error) {
    console.error("❌ Error in resume-paused:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

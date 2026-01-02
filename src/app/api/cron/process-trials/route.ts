import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * GET /api/cron/process-trials
 * Cron Job - מעבד trials שמסתיימים
 * 
 * מה זה עושה:
 * 1. מוצא trials שהסתיימו
 * 2. מעדכן status ל-'active'
 * 3. PayPlus יחייב אוטומטית (start_date הגיע)
 * 
 * רץ אוטומטית כל יום ב-2:00 בבוקר (vercel.json)
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

    console.log("🤖 [CRON] Process trials started...");

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // מצא trials שהסתיימו
    const { data: expiredTrials, error: fetchError } = await supabase
      .rpc("find_expiring_trials");

    if (fetchError) {
      console.error("❌ Error fetching trials:", fetchError);
      return NextResponse.json(
        { success: false, error: "Failed to fetch trials" },
        { status: 500 }
      );
    }

    if (!expiredTrials || expiredTrials.length === 0) {
      console.log("✅ No trials to process");
      return NextResponse.json({
        success: true,
        message: "No trials to process",
        processed: 0,
      });
    }

    // סנן רק trials שכבר עברו (לא 3 ימים לפני)
    const now = new Date();
    const actuallyExpired = expiredTrials.filter((trial: any) => 
      new Date(trial.trial_ends_at) <= now
    );

    if (actuallyExpired.length === 0) {
      console.log("✅ No trials actually expired yet");
      return NextResponse.json({
        success: true,
        message: "No trials expired yet",
        processed: 0,
      });
    }

    console.log(`📋 Found ${actuallyExpired.length} expired trials`);

    let processed = 0;
    let errors = 0;

    // עבור על כל trial שהסתיים
    for (const trial of actuallyExpired) {
      try {
        console.log(`⏰ Processing expired trial: ${trial.subscription_id}`);

        // בדוק אם יש customer_uid (כרטיס מאושר)
        const { data: subscription } = await supabase
          .from("subscriptions")
          .select("*, users(full_name, email)")
          .eq("id", trial.subscription_id)
          .single();

        if (!subscription) {
          console.warn(`⚠️ Subscription not found: ${trial.subscription_id}`);
          continue;
        }

        // אם אין provider_customer_id - הלקוח לא מילא פרטי כרטיס
        if (!subscription.provider_customer_id) {
          console.warn(`⚠️ Trial expired but no payment method: ${trial.subscription_id}`);
          
          // עדכן ל-suspended
          await supabase
            .from("subscriptions")
            .update({
              status: 'suspended',
              updated_at: new Date().toISOString(),
            })
            .eq("id", trial.subscription_id);

          // TODO: שלח מייל ללקוח - "תקופת הניסיון הסתיימה, אנא הוסף פרטי תשלום"
          
          processed++;
          continue;
        }

        // יש פרטי תשלום - עבור ל-active
        const { error: updateError } = await supabase
          .from("subscriptions")
          .update({
            status: 'active',
            updated_at: new Date().toISOString(),
          })
          .eq("id", trial.subscription_id);

        if (updateError) {
          console.error(`❌ Failed to activate subscription ${trial.subscription_id}:`, updateError);
          errors++;
          continue;
        }

        console.log(`✅ Trial converted to active: ${trial.subscription_id}`);
        
        // TODO: שלח מייל ללקוח - "המנוי שלך הופעל! החיוב הראשון היום"

        processed++;

      } catch (error) {
        console.error(`❌ Error processing trial ${trial.subscription_id}:`, error);
        errors++;
      }
    }

    console.log(`✅ Process trials completed: ${processed} processed, ${errors} errors`);

    return NextResponse.json({
      success: true,
      message: `Processed ${processed} trials`,
      stats: {
        found: actuallyExpired.length,
        processed,
        errors,
      },
    });

  } catch (error) {
    console.error("❌ Error in process-trials:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

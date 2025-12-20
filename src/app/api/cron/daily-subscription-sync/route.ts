import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes max

/**
 * 🤖 Cron Job - Daily Subscription Sync & Health Check
 * רץ אוטומטית כל יום ב-3:00 בבוקר
 * 
 * GET /api/cron/daily-subscription-sync
 * 
 * מה זה עושה:
 * 1. מוצא מנויים שצריכים sync
 * 2. מנסה לסנכרן אותם מ-PayPlus
 * 3. מעדכן סטטוסים
 * 4. שולח דוח מייל לאדמין
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now();

  try {
    // Verify cron secret for security
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    console.log("🤖 Daily subscription sync started...");

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // מצא מנויים שצריכים sync
    const { data: subscriptionsNeedingSync } = await supabase.rpc(
      "find_subscriptions_needing_sync"
    );

    if (!subscriptionsNeedingSync || subscriptionsNeedingSync.length === 0) {
      console.log("✅ No subscriptions need sync");
      return NextResponse.json({
        success: true,
        message: "No subscriptions need sync",
        stats: {
          checked: 0,
          synced: 0,
          failed: 0,
          duration_ms: Date.now() - startTime,
        },
      });
    }

    console.log(`📋 Found ${subscriptionsNeedingSync.length} subscriptions needing sync`);

    let stats = {
      checked: subscriptionsNeedingSync.length,
      synced: 0,
      failed: 0,
      errors: [] as any[],
    };

    // סנכרן כל מנוי
    for (const sub of subscriptionsNeedingSync) {
      try {
        console.log(`🔄 Syncing user: ${sub.user_id} (reason: ${sub.reason})`);

        // קרא ל-sync API
        const syncResponse = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/admin/sync-subscription/${sub.user_id}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (syncResponse.ok) {
          stats.synced++;
          console.log(`✅ Successfully synced user: ${sub.user_id}`);
        } else {
          stats.failed++;
          const error = await syncResponse.text();
          console.error(`❌ Failed to sync user ${sub.user_id}:`, error);
          stats.errors.push({
            user_id: sub.user_id,
            reason: sub.reason,
            error: error,
          });
        }

        // המתן קצת בין בקשות כדי לא לעמוס על PayPlus API
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        stats.failed++;
        console.error(`❌ Error syncing user ${sub.user_id}:`, error);
        stats.errors.push({
          user_id: sub.user_id,
          reason: sub.reason,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    const duration = Date.now() - startTime;

    console.log(`
🤖 Daily Sync Complete:
   ✅ Synced: ${stats.synced}
   ❌ Failed: ${stats.failed}
   ⏱️  Duration: ${duration}ms
    `);

    // TODO: שלח מייל דוח לאדמין
    // await sendAdminReport(stats);

    return NextResponse.json({
      success: true,
      message: "Daily sync completed",
      stats: {
        ...stats,
        duration_ms: duration,
      },
    });
  } catch (error) {
    console.error("❌ Cron job error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Cron job failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

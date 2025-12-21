import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes

/**
 * 🔄 Bulk Sync - סנכרון של כל המנויים בבת אחת
 * 
 * POST /api/admin/sync-all-subscriptions
 * Body: { force?: boolean }
 * 
 * force=true → סנכרן את כולם גם אם לא צריכים
 * force=false → רק מנויים שצריכים sync
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    // בדיקת הרשאות אדמין
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Unauthorized - Admin only" },
        { status: 403 }
      );
    }

    const { force = false } = await req.json().catch(() => ({ force: false }));

    console.log(`🔄 Bulk sync started by admin: ${session.user.email} (force: ${force})`);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let subscriptionsToSync: any[] = [];

    if (force) {
      // סנכרן את כל המנויים הפעילים
      const { data } = await supabase
        .from("subscriptions")
        .select("id, user_id")
        .in("status", ["active", "payment_failed", "grace_period", "pending_first_payment"]);

      subscriptionsToSync = data || [];
      console.log(`📋 Force sync - processing ${subscriptionsToSync.length} active subscriptions`);
    } else {
      // רק מנויים שצריכים sync
      const { data } = await supabase.rpc("find_subscriptions_needing_sync");
      subscriptionsToSync = data || [];
      console.log(`📋 Smart sync - found ${subscriptionsToSync.length} subscriptions needing sync`);
    }

    if (subscriptionsToSync.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No subscriptions to sync",
        stats: {
          total: 0,
          synced: 0,
          failed: 0,
          skipped: 0,
          duration_ms: Date.now() - startTime,
        },
      });
    }

    let stats = {
      total: subscriptionsToSync.length,
      synced: 0,
      failed: 0,
      skipped: 0,
      details: [] as any[],
    };

    // סנכרן כל מנוי (parallel אבל עם limit)
    const CONCURRENT_LIMIT = 3; // סנכרן 3 בו-זמנית
    for (let i = 0; i < subscriptionsToSync.length; i += CONCURRENT_LIMIT) {
      const batch = subscriptionsToSync.slice(i, i + CONCURRENT_LIMIT);

      const batchPromises = batch.map(async (sub) => {
        try {
          const userId = sub.user_id;
          console.log(`🔄 Syncing user: ${userId}`);

          const syncResponse = await fetch(
            `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/admin/sync-subscription/${userId}`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
            }
          );

          const result = await syncResponse.json();

          if (syncResponse.ok) {
            stats.synced++;
            console.log(`✅ Synced user: ${userId}`);
            return {
              user_id: userId,
              status: "synced",
              result: result.result,
            };
          } else {
            stats.failed++;
            console.error(`❌ Failed user: ${userId}`, result.error);
            return {
              user_id: userId,
              status: "failed",
              error: result.error,
            };
          }
        } catch (error) {
          stats.failed++;
          console.error(`❌ Error syncing user:`, error);
          return {
            user_id: sub.user_id,
            status: "error",
            error: error instanceof Error ? error.message : "Unknown error",
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      stats.details.push(...batchResults);

      // המתן קצת בין batch-ים
      if (i + CONCURRENT_LIMIT < subscriptionsToSync.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    const duration = Date.now() - startTime;

    // שמור היסטוריה של bulk sync
    await supabase.from("subscription_sync_history").insert({
      subscription_id: null, // null = bulk sync
      user_id: null,
      sync_type: force ? "bulk_force" : "bulk_auto",
      sync_source: "admin_panel",
      status: stats.failed === 0 ? "success" : stats.synced > 0 ? "partial_success" : "failed",
      charges_synced: stats.synced,
      errors: stats.details.filter((d) => d.status !== "synced"),
      sync_details: {
        total: stats.total,
        synced: stats.synced,
        failed: stats.failed,
        forced: force,
        admin_email: session.user.email,
      },
      started_at: new Date(startTime).toISOString(),
      completed_at: new Date().toISOString(),
      duration_ms: duration,
    });

    console.log(`
🔄 Bulk Sync Complete:
   📊 Total: ${stats.total}
   ✅ Synced: ${stats.synced}
   ❌ Failed: ${stats.failed}
   ⏱️  Duration: ${duration}ms
   👤 Admin: ${session.user.email}
    `);

    return NextResponse.json({
      success: true,
      message: `Bulk sync completed: ${stats.synced}/${stats.total} succeeded`,
      stats: {
        ...stats,
        duration_ms: duration,
      },
    });
  } catch (error) {
    console.error("❌ Bulk sync error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Bulk sync failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

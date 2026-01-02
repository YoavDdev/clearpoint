import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { payplusClient } from "@/lib/payplusClient";

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/subscriptions/sync-all
 * סנכרון כל המנויים הפעילים עם PayPlus בזמן אמת
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    console.log("🔄 Starting sync all subscriptions...");

    // 1. קבלת כל המנויים הפעילים
    const { data: subscriptions, error: subError } = await supabase
      .from("subscriptions")
      .select("*, users(full_name, email)")
      .in("status", ["trial", "active", "paused"])
      .not("provider_subscription_id", "is", null);

    if (subError) {
      return NextResponse.json(
        { success: false, error: "Failed to fetch subscriptions" },
        { status: 500 }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No active subscriptions to sync",
        stats: { checked: 0, synced: 0, errors: 0 },
      });
    }

    console.log(`📋 Found ${subscriptions.length} subscriptions to check`);

    // 2. סנכרון כל מנוי
    const results = [];
    let stats = {
      checked: 0,
      synced: 0,
      errors: 0,
      updates: [] as any[],
    };

    for (const subscription of subscriptions) {
      stats.checked++;

      try {
        console.log(`🔍 Checking subscription ${subscription.id} (${subscription.provider_subscription_id})`);

        // קריאה ל-PayPlus API
        const payplusStatus = await payplusClient.getRecurringStatus(
          subscription.provider_subscription_id
        );

        if (!payplusStatus) {
          console.warn(`⚠️ Could not get status from PayPlus for ${subscription.id}`);
          stats.errors++;
          results.push({
            subscription_id: subscription.id,
            user: subscription.users?.full_name,
            status: "error",
            message: "Failed to get PayPlus status",
          });
          continue;
        }

        console.log(`📊 PayPlus status: ${payplusStatus.status}`);

        // 3. בדיקה אם יש שינוי
        const needsUpdate = 
          payplusStatus.status !== subscription.payplus_status ||
          payplusStatus.next_payment_date !== subscription.next_billing_date;

        if (needsUpdate) {
          // עדכון ב-DB
          const updateData: any = {
            payplus_status: payplusStatus.status,
            last_sync_with_payplus: new Date().toISOString(),
            payment_failures: payplusStatus.payment_failures || 0,
          };

          // עדכון סטטוס אם שונה
          if (payplusStatus.status === 'cancelled' && subscription.status !== 'cancelled') {
            updateData.status = 'cancelled';
            updateData.cancelled_at = new Date().toISOString();
          } else if (payplusStatus.status === 'suspended' && subscription.status !== 'suspended') {
            updateData.status = 'suspended';
          }

          // עדכון תאריך חיוב הבא
          if (payplusStatus.next_payment_date) {
            updateData.next_billing_date = payplusStatus.next_payment_date;
          }

          const { error: updateError } = await supabase
            .from("subscriptions")
            .update(updateData)
            .eq("id", subscription.id);

          if (updateError) {
            console.error(`❌ Failed to update subscription ${subscription.id}:`, updateError);
            stats.errors++;
          } else {
            console.log(`✅ Synced subscription ${subscription.id}`);
            stats.synced++;
            stats.updates.push({
              subscription_id: subscription.id,
              user: subscription.users?.full_name,
              old_status: subscription.status,
              new_status: updateData.status || subscription.status,
              payplus_status: payplusStatus.status,
            });
          }

          results.push({
            subscription_id: subscription.id,
            user: subscription.users?.full_name,
            status: "synced",
            changes: updateData,
          });
        } else {
          // עדכון רק last_sync
          await supabase
            .from("subscriptions")
            .update({ 
              last_sync_with_payplus: new Date().toISOString(),
              payplus_status: payplusStatus.status,
            })
            .eq("id", subscription.id);

          results.push({
            subscription_id: subscription.id,
            user: subscription.users?.full_name,
            status: "ok",
            message: "No changes needed",
          });
        }

      } catch (error) {
        console.error(`❌ Error syncing subscription ${subscription.id}:`, error);
        stats.errors++;
        results.push({
          subscription_id: subscription.id,
          user: subscription.users?.full_name,
          status: "error",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    console.log("✅ Sync completed");
    console.log(`📊 Stats: ${stats.checked} checked, ${stats.synced} synced, ${stats.errors} errors`);

    return NextResponse.json({
      success: true,
      message: `Synced ${stats.synced} of ${stats.checked} subscriptions`,
      stats,
      results,
    });

  } catch (error) {
    console.error("Error in sync-all:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

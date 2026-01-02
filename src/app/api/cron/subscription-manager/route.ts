import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { payplusClient } from "@/lib/payplusClient";

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * GET /api/cron/subscription-manager
 * Cron Job מרכזי - מנהל את כל פעולות המנוי האוטומטיות
 * 
 * רץ כל יום ב-2:00 בבוקר ומבצע:
 * 1. ביטול מנויים מתוזמנים (cancel_at_period_end)
 * 2. סיום trials והפיכה ל-active
 * 3. חידוש מנויים מוקפאים
 * 4. סנכרון עם PayPlus
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

    console.log("🤖 [SUBSCRIPTION MANAGER] Starting daily tasks...");

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const stats = {
      cancellations: { processed: 0, errors: 0 },
      trials: { processed: 0, errors: 0 },
      paused: { processed: 0, errors: 0 },
      sync: { checked: 0, synced: 0, errors: 0 },
    };

    // ============================================
    // 1. ביטול מנויים מתוזמנים
    // ============================================
    console.log("\n📋 [1/4] Processing scheduled cancellations...");
    
    const { data: toCancel } = await supabase.rpc("find_subscriptions_to_cancel");
    
    if (toCancel && toCancel.length > 0) {
      console.log(`Found ${toCancel.length} subscriptions to cancel`);
      
      for (const item of toCancel) {
        try {
          const { error } = await supabase
            .from("subscriptions")
            .update({
              status: 'cancelled',
              cancel_at_period_end: false,
              updated_at: new Date().toISOString(),
            })
            .eq("id", item.subscription_id);

          if (!error) {
            stats.cancellations.processed++;
            console.log(`✅ Cancelled: ${item.subscription_id}`);
          } else {
            stats.cancellations.errors++;
            console.error(`❌ Error: ${item.subscription_id}`, error);
          }
        } catch (error) {
          stats.cancellations.errors++;
          console.error(`❌ Error cancelling ${item.subscription_id}:`, error);
        }
      }
    }

    // ============================================
    // 2. סיום trials
    // ============================================
    console.log("\n📋 [2/4] Processing expired trials...");
    
    const { data: expiredTrials } = await supabase.rpc("find_expiring_trials");
    
    if (expiredTrials && expiredTrials.length > 0) {
      const now = new Date();
      const actuallyExpired = expiredTrials.filter((trial: any) => 
        new Date(trial.trial_ends_at) <= now
      );

      console.log(`Found ${actuallyExpired.length} expired trials`);

      for (const trial of actuallyExpired) {
        try {
          const { data: subscription } = await supabase
            .from("subscriptions")
            .select("provider_customer_id")
            .eq("id", trial.subscription_id)
            .single();

          if (!subscription?.provider_customer_id) {
            // אין פרטי תשלום - suspend
            await supabase
              .from("subscriptions")
              .update({
                status: 'suspended',
                updated_at: new Date().toISOString(),
              })
              .eq("id", trial.subscription_id);
            
            console.log(`⚠️ Suspended (no payment method): ${trial.subscription_id}`);
          } else {
            // יש פרטי תשלום - activate
            const { error } = await supabase
              .from("subscriptions")
              .update({
                status: 'active',
                updated_at: new Date().toISOString(),
              })
              .eq("id", trial.subscription_id);

            if (!error) {
              stats.trials.processed++;
              console.log(`✅ Activated: ${trial.subscription_id}`);
            } else {
              stats.trials.errors++;
              console.error(`❌ Error: ${trial.subscription_id}`, error);
            }
          }
        } catch (error) {
          stats.trials.errors++;
          console.error(`❌ Error processing trial ${trial.subscription_id}:`, error);
        }
      }
    }

    // ============================================
    // 3. חידוש מנויים מוקפאים
    // ============================================
    console.log("\n📋 [3/4] Resuming paused subscriptions...");
    
    const { data: toResume } = await supabase.rpc("find_paused_to_resume");
    
    if (toResume && toResume.length > 0) {
      console.log(`Found ${toResume.length} subscriptions to resume`);

      for (const item of toResume) {
        try {
          const nextBillingDate = new Date();
          nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

          const { error } = await supabase
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

          if (!error) {
            stats.paused.processed++;
            console.log(`✅ Resumed: ${item.subscription_id}`);
          } else {
            stats.paused.errors++;
            console.error(`❌ Error: ${item.subscription_id}`, error);
          }
        } catch (error) {
          stats.paused.errors++;
          console.error(`❌ Error resuming ${item.subscription_id}:`, error);
        }
      }
    }

    // ============================================
    // 4. סנכרון עם PayPlus (רק מנויים פעילים)
    // ============================================
    console.log("\n📋 [4/4] Syncing with PayPlus...");
    
    const { data: activeSubscriptions } = await supabase
      .from("subscriptions")
      .select("id, provider_subscription_id, status, payplus_status")
      .in("status", ["active", "trial"])
      .not("provider_subscription_id", "is", null)
      .limit(50); // מגביל ל-50 לחודש

    if (activeSubscriptions && activeSubscriptions.length > 0) {
      console.log(`Checking ${activeSubscriptions.length} active subscriptions`);
      stats.sync.checked = activeSubscriptions.length;

      for (const sub of activeSubscriptions) {
        try {
          const payplusStatus = await payplusClient.getRecurringStatus(
            sub.provider_subscription_id
          );

          if (payplusStatus && payplusStatus.status !== sub.payplus_status) {
            const updateData: any = {
              payplus_status: payplusStatus.status,
              last_sync_with_payplus: new Date().toISOString(),
              payment_failures: payplusStatus.payment_failures || 0,
            };

            if (payplusStatus.status === 'cancelled' && sub.status !== 'cancelled') {
              updateData.status = 'cancelled';
              updateData.cancelled_at = new Date().toISOString();
            }

            await supabase
              .from("subscriptions")
              .update(updateData)
              .eq("id", sub.id);

            stats.sync.synced++;
            console.log(`✅ Synced: ${sub.id} (${payplusStatus.status})`);
          } else {
            // עדכון last_sync בלבד
            await supabase
              .from("subscriptions")
              .update({ last_sync_with_payplus: new Date().toISOString() })
              .eq("id", sub.id);
          }
        } catch (error) {
          stats.sync.errors++;
          console.error(`❌ Sync error for ${sub.id}:`, error);
        }
      }
    }

    // ============================================
    // סיכום
    // ============================================
    console.log("\n✅ [SUBSCRIPTION MANAGER] All tasks completed");
    console.log("📊 Statistics:");
    console.log(`  Cancellations: ${stats.cancellations.processed} processed, ${stats.cancellations.errors} errors`);
    console.log(`  Trials: ${stats.trials.processed} activated, ${stats.trials.errors} errors`);
    console.log(`  Paused: ${stats.paused.processed} resumed, ${stats.paused.errors} errors`);
    console.log(`  Sync: ${stats.sync.synced}/${stats.sync.checked} synced, ${stats.sync.errors} errors`);

    return NextResponse.json({
      success: true,
      message: "Subscription management completed",
      stats,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error("❌ Fatal error in subscription-manager:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = 'force-dynamic';

const PAYPLUS_CONFIG = {
  apiKey: process.env.PAYPLUS_API_KEY!,
  secretKey: process.env.PAYPLUS_SECRET_KEY!,
  apiUrl: process.env.PAYPLUS_API_URL || 'https://restapi.payplus.co.il/api/v1.0',
};

/**
 * 🔍 API לאימות סטטוס מנוי real-time מ-PayPlus
 * בודק אם הלקוח באמת משלם ופעיל
 * 
 * GET /api/admin/verify-subscription/[userId]
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  const userId = params.userId;

  try {
    console.log(`🔍 Verifying subscription for user: ${userId}`);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // שלב 1: שלוף מנוי מהמערכת
    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (subError || !subscription) {
      return NextResponse.json(
        { 
          success: false, 
          verified: false,
          error: "No subscription found in system",
          recommendation: "CREATE_SUBSCRIPTION"
        },
        { status: 404 }
      );
    }

    // שלב 2: שלוף מ-PayPlus
    let payplusData: any = null;
    let payplusError: string | null = null;

    try {
      if (subscription.recurring_uid) {
        const response = await fetch(
          `${PAYPLUS_CONFIG.apiUrl}/RecurringPayments/ViewRecurring`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: JSON.stringify({
                api_key: PAYPLUS_CONFIG.apiKey,
                secret_key: PAYPLUS_CONFIG.secretKey,
              }),
            },
            body: JSON.stringify({
              recurring_uid: subscription.recurring_uid,
            }),
          }
        );

        const data = await response.json();
        
        if (response.ok && data.results?.status === "success") {
          payplusData = data.data;
        } else {
          payplusError = data.results?.message || "Failed to fetch from PayPlus";
        }
      } else if (subscription.payplus_customer_uid) {
        const response = await fetch(
          `${PAYPLUS_CONFIG.apiUrl}/RecurringPayments/View`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: JSON.stringify({
                api_key: PAYPLUS_CONFIG.apiKey,
                secret_key: PAYPLUS_CONFIG.secretKey,
              }),
            },
            body: JSON.stringify({
              customer_uid: subscription.payplus_customer_uid,
            }),
          }
        );

        const data = await response.json();
        
        if (response.ok && data.results?.status === "success") {
          const recurrings = data.data?.recurring_payments || [];
          if (recurrings.length > 0) {
            payplusData = recurrings[0];
          }
        } else {
          payplusError = data.results?.message || "Failed to fetch from PayPlus";
        }
      } else {
        payplusError = "Missing PayPlus identifiers (recurring_uid or customer_uid)";
      }
    } catch (fetchError) {
      payplusError = fetchError instanceof Error ? fetchError.message : "Unknown PayPlus error";
    }

    // שלב 3: ניתוח והשוואה
    const now = new Date();
    const nextPaymentDate = subscription.next_payment_date ? new Date(subscription.next_payment_date) : null;
    const lastPaymentDate = subscription.last_payment_date ? new Date(subscription.last_payment_date) : null;
    
    let verification = {
      verified: false,
      status: "unknown" as string,
      system_status: subscription.status,
      payplus_status: payplusData?.status || payplusData?.recurring_status || "unknown",
      is_synced: false,
      has_access: false,
      issues: [] as string[],
      warnings: [] as string[],
      recommendation: "NONE" as string,
      details: {} as any,
    };

    // בדיקות
    if (!payplusData) {
      verification.issues.push("Cannot connect to PayPlus API: " + payplusError);
      verification.recommendation = "CHECK_PAYPLUS_CONNECTION";
    } else {
      // בדוק התאמה בין המערכת ל-PayPlus
      const payplusStatus = payplusData.status || payplusData.recurring_status;
      const payplusNextCharge = payplusData.next_charge_date || payplusData.next_payment_date;
      const payplusLastCharge = payplusData.last_charge_date || payplusData.last_payment_date;

      verification.details = {
        payplus: {
          status: payplusStatus,
          next_charge: payplusNextCharge,
          last_charge: payplusLastCharge,
          amount: payplusData.amount || payplusData.recurring_amount,
        },
        system: {
          status: subscription.status,
          next_payment: subscription.next_payment_date,
          last_payment: subscription.last_payment_date,
          amount: subscription.amount,
          payment_failures: subscription.payment_failures,
        },
      };

      // בדוק אם PayPlus אומר שזה פעיל
      const isPayPlusActive = payplusStatus === "active" || payplusStatus === "Active";
      
      if (isPayPlusActive) {
        verification.verified = true;
        verification.has_access = true;
        
        if (subscription.status !== "active") {
          verification.warnings.push("PayPlus shows active but system shows: " + subscription.status);
          verification.recommendation = "UPDATE_SYSTEM_STATUS";
        }

        // בדוק אם התאריכים מסונכרנים
        if (payplusNextCharge && nextPaymentDate) {
          const daysDiff = Math.abs(
            (new Date(payplusNextCharge).getTime() - nextPaymentDate.getTime()) / (1000 * 60 * 60 * 24)
          );
          
          if (daysDiff > 2) {
            verification.warnings.push(`Next payment date mismatch: PayPlus=${payplusNextCharge}, System=${subscription.next_payment_date}`);
            verification.recommendation = "SYNC_DATES";
          } else {
            verification.is_synced = true;
          }
        }

        verification.status = "active_and_verified";
        
      } else if (payplusStatus === "cancelled" || payplusStatus === "Cancelled") {
        verification.verified = true;
        verification.has_access = false;
        verification.status = "cancelled_in_payplus";
        
        if (subscription.status === "active") {
          verification.issues.push("Subscription is cancelled in PayPlus but active in system");
          verification.recommendation = "CANCEL_SYSTEM_SUBSCRIPTION";
        }
        
      } else if (payplusStatus === "suspended" || payplusStatus === "Suspended") {
        verification.verified = true;
        verification.has_access = false;
        verification.status = "suspended_in_payplus";
        verification.issues.push("Subscription is suspended in PayPlus - likely payment failure");
        verification.recommendation = "UPDATE_SYSTEM_TO_SUSPENDED";
        
      } else {
        verification.warnings.push(`Unknown PayPlus status: ${payplusStatus}`);
        verification.recommendation = "MANUAL_REVIEW";
      }

      // בדוק אם יש חובות (תשלום שכשל)
      if (lastPaymentDate && nextPaymentDate && now > nextPaymentDate) {
        const daysOverdue = Math.floor((now.getTime() - nextPaymentDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysOverdue > 0) {
          verification.warnings.push(`Payment is ${daysOverdue} days overdue`);
          
          if (daysOverdue > 7) {
            verification.has_access = false;
            verification.recommendation = "SUSPEND_ACCESS";
          } else {
            verification.recommendation = "GRACE_PERIOD";
          }
        }
      }
    }

    // שלב 4: עדכן last_verification_at
    await supabase
      .from("subscriptions")
      .update({
        last_verification_at: new Date().toISOString(),
      })
      .eq("id", subscription.id);

    return NextResponse.json({
      success: true,
      verification: verification,
      actions_needed: verification.issues.length > 0 || verification.warnings.length > 0,
    });

  } catch (error) {
    console.error("❌ Verification error:", error);
    return NextResponse.json(
      {
        success: false,
        verified: false,
        error: "Verification failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * POST - אימות והחלת שינויים אוטומטיים
 * אם autoFix=true, המערכת תתקן אוטומטית אי התאמות
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  const userId = params.userId;
  const { autoFix = false } = await req.json();

  try {
    // קודם רוץ את הבדיקה
    const getResponse = await GET(req, { params });
    const data = await getResponse.json();

    if (!data.success || !data.verification) {
      return NextResponse.json(data, { status: getResponse.status });
    }

    const verification = data.verification;
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let actionsApplied = [];

    if (autoFix && verification.recommendation !== "NONE") {
      const { data: subscription } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (subscription) {
        switch (verification.recommendation) {
          case "UPDATE_SYSTEM_STATUS":
            await supabase
              .from("subscriptions")
              .update({ status: "active" })
              .eq("id", subscription.id);
            actionsApplied.push("Updated system status to active");
            break;

          case "CANCEL_SYSTEM_SUBSCRIPTION":
            await supabase
              .from("subscriptions")
              .update({ 
                status: "cancelled",
                cancelled_at: new Date().toISOString(),
              })
              .eq("id", subscription.id);
            actionsApplied.push("Cancelled subscription in system");
            break;

          case "UPDATE_SYSTEM_TO_SUSPENDED":
            await supabase
              .from("subscriptions")
              .update({ 
                status: "suspended",
                suspended_at: new Date().toISOString(),
                suspension_reason: "Payment failure detected in PayPlus",
              })
              .eq("id", subscription.id);
            actionsApplied.push("Suspended subscription in system");
            break;

          case "SYNC_DATES":
            if (verification.details?.payplus?.next_charge) {
              await supabase
                .from("subscriptions")
                .update({ 
                  next_payment_date: verification.details.payplus.next_charge,
                })
                .eq("id", subscription.id);
              actionsApplied.push("Synced next payment date from PayPlus");
            }
            break;
        }
      }
    }

    return NextResponse.json({
      success: true,
      verification: verification,
      auto_fix_applied: autoFix,
      actions_applied: actionsApplied,
    });

  } catch (error) {
    console.error("❌ Verification with auto-fix error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Verification failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

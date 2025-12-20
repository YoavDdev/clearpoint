import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendInvoiceEmail } from "@/lib/email-service";

export const dynamic = 'force-dynamic';

const PAYPLUS_CONFIG = {
  apiKey: process.env.PAYPLUS_API_KEY!,
  secretKey: process.env.PAYPLUS_SECRET_KEY!,
  apiUrl: process.env.PAYPLUS_API_URL || 'https://restapi.payplus.co.il/api/v1.0',
};

/**
 * 🔄 API לסנכרון מנוי מ-PayPlus
 * שולף חיובים שחסרים ומעדכן את המערכת
 * 
 * POST /api/admin/sync-subscription/[userId]
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  const startTime = Date.now();
  const userId = params.userId;

  try {
    console.log(`🔄 Starting sync for user: ${userId}`);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // שלב 1: מצא את המנוי הפעיל
    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .in("status", ["active", "payment_failed", "grace_period", "pending_first_payment"])
      .single();

    if (subError || !subscription) {
      return NextResponse.json(
        { 
          success: false, 
          error: "No active subscription found",
          details: subError 
        },
        { status: 404 }
      );
    }

    // צור רשומת sync
    const { data: syncRecord } = await supabase
      .from("subscription_sync_history")
      .insert({
        subscription_id: subscription.id,
        user_id: userId,
        sync_type: "manual",
        sync_source: "api",
        status: "in_progress",
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    let syncResult = {
      charges_found: 0,
      charges_synced: 0,
      invoices_created: 0,
      emails_sent: 0,
      errors: [] as any[],
      warnings: [] as any[],
    };

    try {
      // שלב 2: שלוף נתונים מ-PayPlus
      if (!subscription.payplus_customer_uid && !subscription.recurring_uid) {
        throw new Error("Missing PayPlus identifiers (customer_uid or recurring_uid)");
      }

      let payplusData: any = null;

      // נסה קודם עם recurring_uid
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
        console.log("📥 PayPlus response:", JSON.stringify(data, null, 2));

        if (response.ok && data.results?.status === "success") {
          payplusData = data.data;
        }
      }

      // אם לא עבד, נסה עם customer_uid
      if (!payplusData && subscription.payplus_customer_uid) {
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
            payplusData = recurrings[0]; // קח את הראשון
          }
        }
      }

      if (!payplusData) {
        throw new Error("Could not fetch subscription data from PayPlus");
      }

      // שלב 3: עדכן את המנוי עם נתונים מ-PayPlus
      const payplusStatus = payplusData.status || payplusData.recurring_status;
      const nextChargeDate = payplusData.next_charge_date || payplusData.next_payment_date;
      const lastChargeDate = payplusData.last_charge_date || payplusData.last_payment_date;

      await supabase
        .from("subscriptions")
        .update({
          payplus_status: payplusStatus,
          last_sync_with_payplus: new Date().toISOString(),
          recurring_uid: payplusData.recurring_uid || subscription.recurring_uid,
          next_payment_date: nextChargeDate || subscription.next_payment_date,
          last_payment_date: lastChargeDate || subscription.last_payment_date,
        })
        .eq("id", subscription.id);

      console.log("✅ Subscription updated with PayPlus data");

      // שלב 4: בדוק אם יש היסטוריית חיובים ב-PayPlus
      // (לצערנו PayPlus לא נותן API ישיר להיסטוריה, אז נעשה זאת בצורה אחרת)
      
      // נבדוק אם היה חיוב אחרון שלא קיים במערכת
      if (lastChargeDate) {
        const { data: existingCharge } = await supabase
          .from("subscription_charges")
          .select("id")
          .eq("subscription_id", subscription.id)
          .gte("charged_at", new Date(lastChargeDate).toISOString())
          .lte("charged_at", new Date(new Date(lastChargeDate).getTime() + 24*60*60*1000).toISOString())
          .single();

        if (!existingCharge) {
          // יש חיוב שחסר - ניצור אותו
          syncResult.charges_found++;
          
          try {
            // שלוף פרטי משתמש
            const { data: user } = await supabase
              .from("users")
              .select("id, full_name, email")
              .eq("id", userId)
              .single();

            if (user) {
              const amount = parseFloat(payplusData.amount || payplusData.recurring_amount || subscription.amount);

              // יצירת חיוב
              const { data: charge } = await supabase
                .from("subscription_charges")
                .insert({
                  subscription_id: subscription.id,
                  user_id: userId,
                  amount: amount,
                  currency: subscription.currency || "ILS",
                  status: "success",
                  transaction_id: `SYNC-${Date.now()}`,
                  payment_method: "credit_card",
                  charged_at: lastChargeDate,
                })
                .select()
                .single();

              if (charge) {
                syncResult.charges_synced++;

                // יצירת חשבונית
                const { data: invoiceNumber } = await supabase.rpc("generate_invoice_number");

                const { data: invoice } = await supabase
                  .from("invoices")
                  .insert({
                    user_id: userId,
                    invoice_number: invoiceNumber || `INV-SYNC-${Date.now()}`,
                    status: "paid",
                    total_amount: amount,
                    currency: subscription.currency || "ILS",
                    paid_at: lastChargeDate,
                    notes: `חיוב חודשי - סונכרן מ-PayPlus`,
                    has_subscription: true,
                  })
                  .select()
                  .single();

                if (invoice) {
                  syncResult.invoices_created++;

                  // הוסף פריט
                  await supabase
                    .from("invoice_items")
                    .insert({
                      invoice_id: invoice.id,
                      item_type: "subscription",
                      item_name: "מנוי חודשי Clearpoint Security",
                      item_description: `תקופה: ${new Date(lastChargeDate).toLocaleDateString("he-IL")}`,
                      quantity: 1,
                      unit_price: amount,
                      total_price: amount,
                      sort_order: 0,
                    });

                  // שלח מייל
                  try {
                    const invoiceUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/invoice/${invoice.id}`;
                    await sendInvoiceEmail({
                      to: user.email,
                      userName: user.full_name || user.email,
                      invoiceNumber: invoice.invoice_number,
                      amount: amount,
                      invoiceUrl: invoiceUrl,
                      paymentDate: new Date(lastChargeDate).toLocaleDateString("he-IL"),
                    });
                    syncResult.emails_sent++;
                  } catch (emailError) {
                    console.error("❌ Failed to send email:", emailError);
                    syncResult.warnings.push({
                      type: "email_failed",
                      message: "Invoice created but email failed to send",
                    });
                  }
                }
              }
            }
          } catch (chargeError) {
            console.error("❌ Failed to create missing charge:", chargeError);
            syncResult.errors.push({
              type: "charge_creation_failed",
              message: chargeError instanceof Error ? chargeError.message : "Unknown error",
            });
          }
        }
      }

      // עדכן את רשומת ה-sync להצלחה
      const duration = Date.now() - startTime;
      await supabase
        .from("subscription_sync_history")
        .update({
          status: syncResult.errors.length > 0 ? "partial_success" : "success",
          charges_found: syncResult.charges_found,
          charges_synced: syncResult.charges_synced,
          invoices_created: syncResult.invoices_created,
          emails_sent: syncResult.emails_sent,
          payplus_status: payplusStatus,
          payplus_next_charge_date: nextChargeDate,
          payplus_last_charge_date: lastChargeDate,
          errors: syncResult.errors,
          warnings: syncResult.warnings,
          completed_at: new Date().toISOString(),
          duration_ms: duration,
        })
        .eq("id", syncRecord?.id);

      return NextResponse.json({
        success: true,
        message: "Sync completed successfully",
        result: {
          subscription_id: subscription.id,
          payplus_status: payplusStatus,
          sync_summary: {
            charges_found: syncResult.charges_found,
            charges_synced: syncResult.charges_synced,
            invoices_created: syncResult.invoices_created,
            emails_sent: syncResult.emails_sent,
          },
          warnings: syncResult.warnings,
          duration_ms: duration,
        },
      });

    } catch (syncError) {
      // עדכן את רשומת ה-sync לכשלון
      const duration = Date.now() - startTime;
      await supabase
        .from("subscription_sync_history")
        .update({
          status: "failed",
          errors: [
            ...syncResult.errors,
            {
              type: "sync_failed",
              message: syncError instanceof Error ? syncError.message : "Unknown error",
            },
          ],
          completed_at: new Date().toISOString(),
          duration_ms: duration,
        })
        .eq("id", syncRecord?.id);

      throw syncError;
    }

  } catch (error) {
    console.error("❌ Sync error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Sync failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

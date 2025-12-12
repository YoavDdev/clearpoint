import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyWebhookSignature, parseWebhookData } from "@/lib/payplus";
import { enableFeaturesAfterPayment, disableFeaturesDueToNoSubscription } from "@/lib/subscription-check";

/**
 * Webhook מ-Payplus לעדכון סטטוס תשלומים ומנויים
 * POST /api/webhooks/payplus
 * 
 * Payplus שולח callback כאשר:
 * - תשלום הצליח או נכשל
 * - חיוב חוזר (recurring) בוצע
 */
export async function POST(req: NextRequest) {
  try {
    console.log("🔔 Payplus Webhook received");

    // קבלת הבאדי (יכול להיות GET או POST params)
    const contentType = req.headers.get('content-type') || '';
    let payload: any;

    if (contentType.includes('application/json')) {
      payload = await req.json();
    } else {
      // Payplus שולח לפעמים כ-URL encoded
      const body = await req.text();
      const params = new URLSearchParams(body);
      payload = Object.fromEntries(params.entries());
    }

    console.log("📦 Webhook payload:", JSON.stringify(payload, null, 2));

    // ✅ אימות חתימה (חשוב מאוד!)
    const receivedHash = req.headers.get('hash') || '';
    const userAgent = req.headers.get('user-agent') || '';

    if (!verifyWebhookSignature(payload, receivedHash, userAgent)) {
      console.error("❌ Invalid webhook signature!");
      return NextResponse.json(
        { success: false, error: "Invalid signature" },
        { status: 401 }
      );
    }

    console.log("✅ Webhook signature verified");

    // יצירת Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Parse הנתונים
    const parsedData = parseWebhookData(payload);

    console.log("💳 Payment status:", parsedData.status);
    console.log("🆔 Transaction ID:", parsedData.transactionId);
    console.log("💰 Amount:", parsedData.amount);
    console.log("🔄 Is Recurring:", parsedData.isRecurring);

    // קבלת payment ID מה-metadata (more_info)
    const paymentId = parsedData.customFields.cField1;
    const userId = parsedData.customFields.cField2;
    const planId = parsedData.customFields.cField3;

    // ===== עדכון רשומת התשלום ב-payments =====
    // אם אין payment ID ישיר, ננסה למצוא לפי transaction ID
    let payment = null;
    
    if (paymentId) {
      // אופציה 1: יש payment ID ישיר מ-more_info
      const { data: foundPayment } = await supabase
        .from("payments")
        .select("*")
        .eq("id", paymentId)
        .single();
      payment = foundPayment;
    } else {
      // אופציה 2: חיפוש לפי provider_transaction_id
      console.log("🔍 No payment ID in more_info, searching by transaction ID:", parsedData.transactionId);
      const { data: foundPayment } = await supabase
        .from("payments")
        .select("*")
        .eq("provider_transaction_id", parsedData.transactionId)
        .single();
      
      if (!foundPayment) {
        // אופציה 3: חיפוש לפי status pending וסכום
        console.log("🔍 Not found by transaction ID, searching by amount and status...");
        const { data: foundPayments } = await supabase
          .from("payments")
          .select("*")
          .eq("status", "pending")
          .eq("amount", parsedData.amount.toString())
          .order("created_at", { ascending: false })
          .limit(1);
        
        if (foundPayments && foundPayments.length > 0) {
          payment = foundPayments[0];
          console.log("✅ Found payment by amount:", payment.id);
        }
      } else {
        payment = foundPayment;
      }
    }

    if (payment) {
      console.log("📝 Updating payment:", payment.id);
      const { error: paymentError } = await supabase
        .from("payments")
        .update({
          status: parsedData.status,
          paid_at: parsedData.status === 'completed' ? new Date().toISOString() : null,
          provider_payment_id: parsedData.transactionId,
          provider_transaction_id: parsedData.transactionId,
          metadata: {
            approval_num: parsedData.asmachta,
            card_suffix: parsedData.cardDetails.suffix,
            card_type: parsedData.cardDetails.type,
          },
        })
        .eq("id", payment.id);

      if (paymentError) {
        console.error("❌ Failed to update payment:", paymentError);
      } else {
        console.log("✅ Payment updated successfully");
      }
    } else {
      console.warn("⚠️ Could not find payment to update");
    }

    // ===== אם זה תשלום חוזר (מנוי), נעדכן את המנוי =====
    if (parsedData.isRecurring && userId) {
      console.log("🔄 Processing recurring payment for subscription");

      // קבלת המנוי
      const { data: subscription } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "active")
        .single();

      if (subscription) {
        if (parsedData.status === 'completed') {
          // חישוב תאריך חיוב הבא
          const nextBillingDate = new Date(subscription.next_billing_date);
          
          if (subscription.billing_cycle === "monthly") {
            nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
          } else if (subscription.billing_cycle === "yearly") {
            nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
          }

          // עדכון המנוי
          await supabase
            .from("subscriptions")
            .update({
              last_billing_date: new Date().toISOString().split("T")[0],
              next_billing_date: nextBillingDate.toISOString().split("T")[0],
              updated_at: new Date().toISOString(),
            })
            .eq("id", subscription.id);

          console.log("✅ Subscription updated - next billing:", nextBillingDate.toISOString());

          // יצירת רשומת payment חדשה לחיוב הבא
          const { data: newPayment } = await supabase
            .from("payments")
            .insert({
              user_id: userId,
              amount: subscription.custom_price || subscription.amount,
              currency: "ILS",
              status: "completed",
              payment_type: "recurring",
              description: `חיוב חודשי אוטומטי - ${new Date().toLocaleDateString('he-IL')}`,
              payment_provider: "payplus",
              provider_payment_id: parsedData.transactionId,
              provider_transaction_id: parsedData.transactionId,
              paid_at: new Date().toISOString(),
            })
            .select()
            .single();

          console.log("✅ New payment record created for recurring charge");

          // יצירת חשבונית חודשית אוטומטית
          if (newPayment) {
            try {
              // יצירת מספר חשבונית
              const { data: invoiceNumber } = await supabase.rpc("generate_invoice_number");
              
              // יצירת החשבונית
              const { data: newInvoice, error: invoiceError } = await supabase
                .from("invoices")
                .insert({
                  user_id: userId,
                  invoice_number: invoiceNumber || `INV-${Date.now()}`,
                  status: "paid",
                  total_amount: subscription.custom_price || subscription.amount,
                  currency: "ILS",
                  payment_id: newPayment.id,
                  has_subscription: true,
                  monthly_price: subscription.custom_price || subscription.amount,
                  notes: `תשלום חודשי אוטומטי\nתאריך: ${new Date().toLocaleDateString('he-IL')}\nעסקה: ${parsedData.transactionId}`,
                  sent_at: new Date().toISOString(),
                })
                .select()
                .single();

              if (!invoiceError && newInvoice) {
                // יצירת פריט בחשבונית
                await supabase
                  .from("invoice_items")
                  .insert({
                    invoice_id: newInvoice.id,
                    item_type: "subscription",
                    item_name: "מנוי חודשי",
                    item_description: `מנוי לשירות Clearpoint Security - ${new Date().toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })}`,
                    quantity: 1,
                    unit_price: subscription.custom_price || subscription.amount,
                    total_price: subscription.custom_price || subscription.amount,
                    sort_order: 0,
                  });

                console.log(`✅ Monthly invoice created: ${newInvoice.invoice_number}`);
              } else {
                console.error("❌ Failed to create invoice:", invoiceError);
              }
            } catch (invoiceCreationError) {
              console.error("❌ Error creating monthly invoice:", invoiceCreationError);
              // לא עוצרים את הזרימה - התשלום כבר עבר
            }
          }

          // הפעלת תכונות חזרה אחרי תשלום מוצלח
          await enableFeaturesAfterPayment(userId);
          console.log("✅ Features enabled for user after successful payment");

          // שליחת אימייל אישור תשלום
          try {
            const { sendPaymentConfirmation } = await import('@/lib/email');
            await sendPaymentConfirmation({
              customerName: parsedData.payerName,
              customerEmail: parsedData.payerEmail,
              amount: parsedData.amount,
              paymentDate: new Date().toLocaleDateString('he-IL'),
              transactionId: parsedData.transactionId,
              nextBillingDate: nextBillingDate.toLocaleDateString('he-IL'),
              monthlyAmount: subscription.custom_price || subscription.amount,
            });
            console.log('📧 Payment confirmation email sent');
          } catch (emailError) {
            console.error('⚠️ Failed to send payment confirmation email:', emailError);
            // לא עוצרים את הזרימה אם המייל נכשל
          }
        } else {
          // אם התשלום נכשל, נעדכן את הסטטוס ל-past_due
          await supabase
            .from("subscriptions")
            .update({
              status: "past_due",
              updated_at: new Date().toISOString(),
            })
            .eq("id", subscription.id);

          console.log("⚠️ Subscription marked as past_due due to failed payment");

          // השבתת תכונות עקב תשלום שנכשל
          await disableFeaturesDueToNoSubscription(userId);
          console.log("🚫 Features disabled for user due to failed payment");
        }
      } else {
        console.warn("⚠️ No active subscription found for user:", userId);
      }
    }

    // ===== שליחת התראה (אופציונלי) =====
    // TODO: שלח אימייל/SMS ללקוח על תשלום שבוצע/נכשל

    return NextResponse.json({
      success: true,
      message: "Webhook processed successfully",
      paymentId,
      status: parsedData.status,
    });
  } catch (error) {
    console.error("❌ Webhook error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to process webhook",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET handler - לבדיקה שה-webhook endpoint עובד
 */
export async function GET(req: NextRequest) {
  return NextResponse.json({
    message: "Payplus webhook endpoint is active",
    timestamp: new Date().toISOString(),
  });
}

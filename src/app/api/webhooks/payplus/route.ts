import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { verifyWebhookSignature, parseWebhookData } from "@/lib/payplus";

import { apiHandler } from "@/lib/api-handler";

export const dynamic = 'force-dynamic';

/**
 * Webhook נקי מ-PayPlus - רק תשלומים חד-פעמיים
 * POST /api/webhooks/payplus
 */
export const POST = apiHandler(async (req: NextRequest) => {
  try {
    console.log("🔔 PayPlus Webhook received");

    // קבלת payload
    const contentType = req.headers.get('content-type') || '';
    let payload: any;

    if (contentType.includes('application/json')) {
      payload = await req.json();
    } else {
      const body = await req.text();
      const params = new URLSearchParams(body);
      payload = Object.fromEntries(params.entries());
    }


    // אימות signature
    const receivedHash = req.headers.get('hash') || '';
    const userAgent = req.headers.get('user-agent') || '';

    if (!verifyWebhookSignature(payload, receivedHash, userAgent)) {
      console.error("❌ Invalid webhook signature!");
      return NextResponse.json({ success: false, error: "Invalid signature" }, { status: 401 });
    }

    // Supabase client
    const supabase = getSupabaseAdmin();

    // Parse נתונים
    const parsedData = parseWebhookData(payload);

    const customerUid = parsedData.customerUid;

    // ───────────────────────────────────────────────────────
    // Handle recurring payment page completion
    // When a customer completes a Payment Page with charge_method=4,
    // PayPlus sends a callback. cField1=user_id, cField2=plan_id
    // Detect recurring by payload.type OR by checking if a pending
    // recurring_payment exists for the user_id in cField1.
    // ───────────────────────────────────────────────────────
    let isRecurringCallback = parsedData.isRecurring;

    // Fallback: if PayPlus didn't set type='recurring', check if cField1
    // matches a user with a pending recurring_payment (is_active=false, is_valid=false)
    if (!isRecurringCallback && parsedData.customFields.cField1) {
      const { data: pendingCheck } = await supabase
        .from("recurring_payments")
        .select("id")
        .eq("user_id", parsedData.customFields.cField1)
        .eq("is_active", false)
        .eq("is_valid", false)
        .limit(1)
        .maybeSingle();

      if (pendingCheck) {
        isRecurringCallback = true;
        console.log("🔍 Detected recurring callback via pending record fallback");
      }
    }

    if (isRecurringCallback && parsedData.customFields.cField1) {
      const userId = parsedData.customFields.cField1;
      const planId = parsedData.customFields.cField2;

      console.log("🔁 Recurring payment callback for user:", userId);

      if (parsedData.status === 'completed') {
        // Find the pending recurring_payment record for this user
        const { data: pendingRecurring } = await supabase
          .from("recurring_payments")
          .select("id")
          .eq("user_id", userId)
          .eq("is_active", false)
          .eq("is_valid", false)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (pendingRecurring) {
          // Activate the recurring payment
          await supabase
            .from("recurring_payments")
            .update({
              is_active: true,
              is_valid: true,
              customer_uid: customerUid || null,
              notes: `הופעל בהצלחה - ${new Date().toLocaleDateString('he-IL')}`,
              updated_at: new Date().toISOString(),
            })
            .eq("id", pendingRecurring.id);

          console.log("✅ Recurring payment activated:", pendingRecurring.id);
        } else {
          console.warn("⚠️ No pending recurring_payment found for user:", userId);
        }

        // Save customer_uid on user
        if (customerUid) {
          await supabase
            .from("users")
            .update({ customer_uid: customerUid })
            .eq("id", userId);
        }

        // Update user status to active
        await supabase
          .from("users")
          .update({ status: "active" })
          .eq("id", userId);

        return NextResponse.json({
          success: true,
          type: "recurring_activation",
          user_id: userId,
        });
      } else {
        console.warn("⚠️ Recurring payment page failed for user:", userId);
        return NextResponse.json({
          success: true,
          type: "recurring_failed",
          user_id: userId,
        });
      }
    }

    // ───────────────────────────────────────────────────────
    // Handle one-time payment callback (existing flow)
    // ───────────────────────────────────────────────────────
    const paymentId = parsedData.customFields.cField1;

    // חיפוש payment record
    let payment = null;
    
    if (paymentId) {
      const { data: foundPayment } = await supabase
        .from("payments")
        .select("*")
        .eq("id", paymentId)
        .single();
      payment = foundPayment;
    }
    
    if (!payment) {
      const { data: foundPayment } = await supabase
        .from("payments")
        .select("*")
        .eq("provider_transaction_id", parsedData.transactionId)
        .single();
      payment = foundPayment;
    }

    if (!payment) {
      console.error("❌ Payment record not found for transaction:", parsedData.transactionId);
      return NextResponse.json({ success: false, error: "Payment not found" }, { status: 404 });
    }

    console.log("✅ Payment record found:", payment.id);

    // Idempotency: if payment already in final state, skip processing
    if (payment.status === 'completed' || payment.status === 'refunded') {
      console.log("⏩ Payment already in final state:", payment.status, "— skipping duplicate webhook");
      return NextResponse.json({ success: true, payment_id: payment.id, status: payment.status, skipped: true });
    }

    // עדכון payment status
    const updateData: any = {
      status: parsedData.status, // 'completed' או 'failed' ישירות מ-parseWebhookData
      provider_transaction_id: parsedData.transactionId,
      updated_at: new Date().toISOString(),
    };

    // אם התשלום הצליח, שמור תאריך תשלום
    if (parsedData.status === 'completed') {
      updateData.paid_at = new Date().toISOString();
    }

    const { error: updateError } = await supabase
      .from("payments")
      .update(updateData)
      .eq("id", payment.id);

    if (updateError) {
      console.error("❌ Failed to update payment:", updateError);
      return NextResponse.json({ success: false, error: "Update failed" }, { status: 500 });
    }


    // שמירת customer_uid על המשתמש אם יש
    if (customerUid && payment.user_id) {
      await supabase
        .from("users")
        .update({ customer_uid: customerUid })
        .eq("id", payment.user_id);
      console.log("✅ customer_uid saved on user:", payment.user_id);
    }

    // עדכון סטטוס החשבונית - אוטומטי לפי תוצאת התשלום
    if (payment.invoice_id) {
      if (parsedData.status === 'completed') {
        // תשלום הצליח → החשבונית שולמה
        await supabase
          .from("invoices")
          .update({
            status: 'paid',
            paid_at: new Date().toISOString(),
          })
          .eq("id", payment.invoice_id);
        console.log("✅ Invoice marked as paid:", payment.invoice_id);

        try {
          const { data: invoice } = await supabase
            .from('invoices')
            .select('id, invoice_number, created_at, total_amount, email_sent_at, user:users(full_name, email)')
            .eq('id', payment.invoice_id)
            .single();

          const invoiceUser = invoice?.user as any;
          if (invoice && invoiceUser?.email && !invoice.email_sent_at) {
            const { data: items } = await supabase
              .from('invoice_items')
              .select('*')
              .eq('invoice_id', payment.invoice_id)
              .order('sort_order', { ascending: true });

            const isMonthlyRecurring = items?.length === 1 && items[0].item_type === 'subscription';

            const { sendInvoiceEmail } = await import('@/lib/email');
            await sendInvoiceEmail({
              customerName: invoiceUser.full_name || invoiceUser.email,
              customerEmail: invoiceUser.email,
              invoiceNumber: invoice.invoice_number,
              invoiceDate: new Date(invoice.created_at).toLocaleDateString('he-IL'),
              totalAmount: invoice.total_amount,
              items: (items || []).map((it: any) => ({
                name: it.item_name,
                description: it.item_description || '',
                quantity: it.quantity,
                price: it.unit_price,
              })),
              invoiceUrl: `${process.env.NODE_ENV === 'production' ? 'https://www.clearpoint.co.il' : (process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000')}/invoice/${invoice.id}`,
              isMonthlyRecurring,
            });

            await supabase
              .from('invoices')
              .update({ email_sent_at: new Date().toISOString() })
              .eq('id', invoice.id)
              .is('email_sent_at', null);
          }
        } catch (emailError) {
          console.error('⚠️ Failed to send receipt email:', emailError);
        }
      } else {
        // תשלום נכשל → החשבונית נשארת ממתין לתשלום
        console.log("⚠️ Payment failed - invoice remains pending:", payment.invoice_id);

        // שליחת email על תשלום נכשל
        try {
          const { data: user } = await supabase
            .from("users")
            .select("full_name, email")
            .eq("id", payment.user_id)
            .single();

          if (user?.email) {
            const { sendPaymentFailed } = await import('@/lib/email');
            await sendPaymentFailed({
              customerName: user.full_name || user.email,
              customerEmail: user.email,
              amount: payment.amount,
              failureReason: "התשלום נדחה על ידי חברת האשראי",
              paymentLink: `${process.env.NODE_ENV === 'production' ? 'https://www.clearpoint.co.il' : (process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000')}/dashboard/invoices`,
            });
            console.log("✅ Payment failed email sent to:", user.email);
          }
        } catch (emailError) {
          console.error("⚠️ Failed to send payment-failed email:", emailError);
        }
      }
    }

    // ───────────────────────────────────────────────────────
    // Auto-create recurring payment after setup payment succeeds
    // If metadata.create_recurring=true, generate a Payment Page
    // for the monthly subscription and save a pending record
    // ───────────────────────────────────────────────────────
    if (parsedData.status === 'completed' && payment.metadata?.create_recurring && payment.user_id) {
      try {
        const meta = payment.metadata;
        const monthlyPrice = meta.monthly_price;
        const planId = meta.plan_id;
        const planName = meta.plan_name_he || meta.plan_name || 'מנוי חודשי';

        if (monthlyPrice && monthlyPrice > 0) {
          console.log("🔁 Auto-creating recurring payment for user:", payment.user_id);

          // Get user details
          const { data: user } = await supabase
            .from("users")
            .select("id, email, full_name, phone, customer_uid")
            .eq("id", payment.user_id)
            .single();

          if (user) {
            const { createRecurringPaymentPage } = await import('@/lib/payplus');

            // Format start date as DD/MM/YYYY (start from next month)
            const startDate = new Date();
            startDate.setMonth(startDate.getMonth() + 1);
            startDate.setDate(1);
            const startDateStr = `${String(startDate.getDate()).padStart(2, '0')}/${String(startDate.getMonth() + 1).padStart(2, '0')}/${startDate.getFullYear()}`;

            const recurringResponse = await createRecurringPaymentPage({
              customer_uid: user.customer_uid || customerUid || '',
              customer_name: user.full_name || user.email,
              customer_email: user.email,
              customer_phone: user.phone || '',
              amount: monthlyPrice,
              plan_name: planName,
              start_date: startDateStr,
              recurring_type: 2,
              recurring_range: 1,
              number_of_charges: 0,
              success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/recurring-payment-success`,
              cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/payment-cancelled`,
              custom_fields: {
                cField1: user.id,
                cField2: planId,
                cField3: monthlyPrice.toString(),
              },
            });

            if (recurringResponse.status === '1' && recurringResponse.data?.pageUrl) {
              // Save pending recurring payment
              await supabase
                .from("recurring_payments")
                .insert({
                  user_id: user.id,
                  plan_id: planId,
                  customer_uid: user.customer_uid || customerUid || null,
                  recurring_uid: null,
                  recurring_type: 2,
                  recurring_range: 1,
                  number_of_charges: 0,
                  start_date: startDate.toISOString(),
                  amount: monthlyPrice,
                  currency_code: 'ILS',
                  items: [{ name: planName, quantity: 1, price: monthlyPrice }],
                  is_active: false,
                  is_valid: false,
                  notes: `ממתין להשלמת הרשמה - נוצר אוטומטית אחרי תשלום התקנה`,
                });

              // Store the recurring payment link on the payment record for admin reference
              await supabase
                .from("payments")
                .update({
                  metadata: {
                    ...meta,
                    recurring_payment_url: recurringResponse.data.pageUrl,
                  },
                })
                .eq("id", payment.id);

              console.log("✅ Recurring payment page created:", recurringResponse.data.pageUrl);

              // Send email to customer with recurring payment setup details
              try {
                const { sendUpcomingCharge } = await import('@/lib/email');
                await sendUpcomingCharge({
                  customerName: user.full_name || user.email,
                  customerEmail: user.email,
                  amount: monthlyPrice,
                  chargeDate: startDateStr,
                  subscriptionDetails: `${planName} - ₪${monthlyPrice}/חודש. נא להשלים הרשמה בלינק שנשלח אליך.`,
                });
                console.log("📧 Recurring payment setup email sent to:", user.email);
              } catch (emailErr) {
                console.error("⚠️ Failed to send recurring setup email:", emailErr);
              }
            } else {
              console.error("❌ Failed to create recurring payment page:", recurringResponse.err);
            }
          }
        }
      } catch (recurringError) {
        console.error("⚠️ Auto-create recurring payment failed:", recurringError);
        // Don't fail the webhook — setup payment is already processed
      }
    }

    return NextResponse.json({
      success: true,
      payment_id: payment.id,
      status: updateData.status,
    });

  } catch (error) {
    console.error("❌ Webhook error:", error);
    return NextResponse.json(
      { success: false, error: "Internal error" },
      { status: 500 }
    );
  }
});

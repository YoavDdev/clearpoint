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

        // Update user subscription status to active
        await supabase
          .from("users")
          .update({ subscription_status: "active", subscription_active: true })
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

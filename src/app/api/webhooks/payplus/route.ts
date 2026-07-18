import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyWebhookSignature, parseWebhookData } from "@/lib/payplus";

export const dynamic = 'force-dynamic';

/**
 * Webhook נקי מ-PayPlus - רק תשלומים חד-פעמיים
 * POST /api/webhooks/payplus
 */
export async function POST(req: NextRequest) {
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

    console.log("📦 Webhook payload:", JSON.stringify(payload, null, 2));

    // אימות signature
    const receivedHash = req.headers.get('hash') || '';
    const userAgent = req.headers.get('user-agent') || '';

    if (!verifyWebhookSignature(payload, receivedHash, userAgent)) {
      console.error("❌ Invalid webhook signature!");
      return NextResponse.json({ success: false, error: "Invalid signature" }, { status: 401 });
    }
    console.log("✅ Webhook signature verified");

    // Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Parse נתונים
    const parsedData = parseWebhookData(payload);
    console.log("💳 Payment status:", parsedData.status);
    console.log("🆔 Transaction ID:", parsedData.transactionId);
    console.log("💰 Amount:", parsedData.amount);

    // קבלת payment ID
    const paymentId = parsedData.customFields.cField1;
    const customerUid = parsedData.customerUid;

    // חיפוש payment record
    let payment = null;
    
    if (paymentId) {
      const { data: foundPayment } = await supabase
        .from("payments")
        .select("*")
        .eq("id", paymentId)
        .single();
      payment = foundPayment;
    } else {
      console.log("🔍 Searching by transaction ID:", parsedData.transactionId);
      const { data: foundPayment } = await supabase
        .from("payments")
        .select("*")
        .eq("provider_transaction_id", parsedData.transactionId)
        .single();
      payment = foundPayment;
    }

    if (!payment) {
      console.error("❌ Payment record not found");
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

    console.log("✅ Payment updated:", payment.id, "→", updateData.status);

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

          if (invoice?.user?.email && !invoice.email_sent_at) {
            const { data: items } = await supabase
              .from('invoice_items')
              .select('*')
              .eq('invoice_id', payment.invoice_id)
              .order('sort_order', { ascending: true });

            const isMonthlyRecurring = items?.length === 1 && items[0].item_type === 'subscription';

            const { sendInvoiceEmail } = await import('@/lib/email');
            await sendInvoiceEmail({
              customerName: invoice.user.full_name || invoice.user.email,
              customerEmail: invoice.user.email,
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
}

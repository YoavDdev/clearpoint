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

    // החשבונית תישאר "ממתין לתשלום" - אדמין יעדכן ידנית לאחר אישור

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

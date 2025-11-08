import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createRecurringSubscription } from "@/lib/grow";

/**
 * API לשיחזור לינק תשלום שנכשל
 * POST /api/admin/regenerate-payment-link
 */
export async function POST(req: NextRequest) {
  try {
    console.log("🔄 Regenerate payment link API called");
    const { paymentId } = await req.json();

    if (!paymentId) {
      return NextResponse.json(
        { success: false, error: "Missing paymentId" },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // קבלת פרטי התשלום
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .select(`
        *,
        user:users(id, full_name, email, phone)
      `)
      .eq("id", paymentId)
      .single();

    if (paymentError || !payment) {
      return NextResponse.json(
        { success: false, error: "Payment not found" },
        { status: 404 }
      );
    }

    // בדיקה אם כבר יש לינק
    if (payment.provider_payment_id && payment.status !== "failed") {
      return NextResponse.json(
        { 
          success: false, 
          error: "Payment already has a valid link",
          paymentLink: `https://payment.grow.co.il/process/${payment.provider_payment_id}`
        },
        { status: 400 }
      );
    }

    // קבלת פרטי המנוי
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select(`
        *,
        plan:plans(name, name_he)
      `)
      .eq("user_id", payment.user_id)
      .single();

    if (!subscription) {
      return NextResponse.json(
        { success: false, error: "Subscription not found" },
        { status: 404 }
      );
    }

    // יצירת לינק חדש ב-Grow
    console.log("🚀 Creating new Grow payment link...");
    let growSubscription;
    try {
      growSubscription = await createRecurringSubscription({
        customer_id: payment.user_id,
        amount: parseFloat(payment.amount),
        currency: "ILS",
        description: payment.description || `Clearpoint Security - ${subscription.plan?.name_he}`,
        customer_name: payment.user.full_name || payment.user.email,
        customer_email: payment.user.email,
        customer_phone: payment.user.phone || "",
        billing_cycle: subscription.billing_cycle as 'monthly' | 'yearly',
        start_date: new Date().toISOString().split("T")[0],
      });
    } catch (growError) {
      console.error("❌ Grow API error:", growError);
      return NextResponse.json(
        { 
          success: false, 
          error: "Failed to create Grow payment link",
          details: growError instanceof Error ? growError.message : "Unknown error"
        },
        { status: 500 }
      );
    }

    if (!growSubscription.data?.pageUrl) {
      return NextResponse.json(
        { success: false, error: "Grow returned no payment URL" },
        { status: 500 }
      );
    }

    // עדכון התשלום עם הלינק החדש
    const { error: updateError } = await supabase
      .from("payments")
      .update({
        provider_payment_id: growSubscription.data.processId,
        provider_transaction_id: growSubscription.data.transactionId,
        status: "pending",
        updated_at: new Date().toISOString(),
      })
      .eq("id", paymentId);

    if (updateError) {
      console.error("❌ Failed to update payment:", updateError);
      return NextResponse.json(
        { success: false, error: "Failed to update payment record" },
        { status: 500 }
      );
    }

    // עדכון המנוי עם הפרטים החדשים
    await supabase
      .from("subscriptions")
      .update({
        provider_subscription_id: growSubscription.data.processId,
        provider_customer_id: growSubscription.data.transactionId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", subscription.id);

    console.log("✅ Payment link regenerated successfully");

    return NextResponse.json({
      success: true,
      paymentLink: growSubscription.data.pageUrl,
      processId: growSubscription.data.processId,
      message: "Payment link created successfully",
    });
  } catch (error) {
    console.error("❌ Regenerate payment link error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

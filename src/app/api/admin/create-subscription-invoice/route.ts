import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createOneTimePayment } from "@/lib/payplus";

export const dynamic = 'force-dynamic';

/**
 * API ליצירת חשבונית מנוי חודשי
 * הזרימה:
 * 1. יוצר חשבונית לחודש ראשון
 * 2. לקוח משלם
 * 3. PayPlus יוצר הוראת קבע אוטומטית
 * 4. Webhook מזהה הוראת קבע ומפעיל מנוי
 */
export async function POST(req: NextRequest) {
  try {
    const { userId, monthlyPrice, planId } = await req.json();

    if (!userId || !monthlyPrice) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // קבלת פרטי משתמש
    const { data: user } = await supabase
      .from("users")
      .select("id, full_name, email, phone")
      .eq("id", userId)
      .single();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    // יצירת מספר חשבונית
    const { data: invoiceNumber } = await supabase.rpc("generate_invoice_number");

    // יצירת חשבונית מנוי
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .insert({
        user_id: userId,
        invoice_number: invoiceNumber || `INV-${Date.now()}`,
        status: "draft",
        total_amount: monthlyPrice,
        currency: "ILS",
        notes: "חשבונית מנוי חודשי - חודש ראשון. התשלום יוצר הוראת קבע אוטומטית לחיובים עתידיים.",
      })
      .select()
      .single();

    if (invoiceError || !invoice) {
      console.error("Error creating subscription invoice:", invoiceError);
      return NextResponse.json(
        { success: false, error: "Failed to create invoice" },
        { status: 500 }
      );
    }

    // הוספת פריט מנוי לחשבונית
    await supabase
      .from("invoice_items")
      .insert({
        invoice_id: invoice.id,
        item_type: "subscription",
        item_name: "מנוי חודשי Clearpoint Security",
        item_description: "גישה למערכת, אחסון הקלטות, תמיכה טכנית",
        quantity: 1,
        unit_price: monthlyPrice,
        total_price: monthlyPrice,
        sort_order: 0,
      });

    // יצירת רשומת תשלום
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .insert({
        user_id: userId,
        payment_provider: "payplus",
        payment_type: "recurring", // ⚠️ חשוב - מסמן שזה מנוי
        amount: monthlyPrice.toString(),
        currency: "ILS",
        status: "pending",
        description: `מנוי חודשי - חודש ראשון`,
        invoice_id: invoice.id,
        metadata: {
          subscription_first_payment: true,
          plan_id: planId,
        },
      })
      .select()
      .single();

    if (paymentError || !payment) {
      console.error("Error creating payment:", paymentError);
      await supabase.from("invoices").delete().eq("id", invoice.id);
      return NextResponse.json(
        { success: false, error: "Failed to create payment record" },
        { status: 500 }
      );
    }

    // יצירת לינק תשלום דרך PayPlus
    const returnUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/invoice-payment-success?invoice_id=${invoice.id}`;
    const cancelUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/payment-cancelled`;

    const payplusResponse = await createOneTimePayment({
      sum: monthlyPrice,
      description: `מנוי חודשי Clearpoint - ${user.full_name}`,
      customer_name: user.full_name,
      customer_email: user.email,
      customer_phone: user.phone || "",
      items: [
        {
          name: "מנוי חודשי Clearpoint Security",
          quantity: 1,
          price: monthlyPrice,
          description: "חודש ראשון + הוראת קבע לחיובים עתידיים",
        },
      ],
      success_url: returnUrl,
      cancel_url: cancelUrl,
      custom_fields: {
        cField1: payment.id, // Payment ID
        cField2: userId, // User ID
        cField3: "subscription", // Type marker
      },
    });

    if (payplusResponse.status !== "1" || !payplusResponse.data) {
      console.error("PayPlus payment creation failed:", payplusResponse);
      return NextResponse.json(
        { success: false, error: "Failed to create payment link" },
        { status: 500 }
      );
    }

    // עדכון רשומת התשלום עם פרטי PayPlus
    await supabase
      .from("payments")
      .update({
        provider_transaction_id: payplusResponse.data.processId,
        provider_payment_url: payplusResponse.data.pageUrl,
        provider_response: payplusResponse.data,
      })
      .eq("id", payment.id);

    // עדכון החשבונית עם פרטי התשלום
    await supabase
      .from("invoices")
      .update({
        payment_id: payment.id,
        payment_link: payplusResponse.data.pageUrl,
        status: "sent",
        sent_at: new Date().toISOString(),
      })
      .eq("id", invoice.id);

    // לינק לדף החשבונית
    const invoiceUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/invoice/${invoice.id}`;

    return NextResponse.json({
      success: true,
      invoice: {
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        total_amount: monthlyPrice,
      },
      payment: {
        id: payment.id,
        amount: monthlyPrice,
        paymentUrl: payplusResponse.data.pageUrl,
      },
      invoiceUrl: invoiceUrl,
      paymentUrl: payplusResponse.data.pageUrl,
    });
  } catch (error) {
    console.error("Error in create-subscription-invoice:", error);
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

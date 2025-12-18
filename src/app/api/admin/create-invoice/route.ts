import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createOneTimePayment, createRecurringSubscription } from "@/lib/payplus";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { 
      userId, 
      items, 
      notes, 
      customerName, 
      customerEmail
    } = await req.json();

    if (!userId || !items || items.length === 0) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // חישוב סכום כולל (ציוד + התקנה)
    const totalAmount = items.reduce(
      (sum: number, item: any) => sum + (item.total_price || 0),
      0
    );

    // יצירת מספר חשבונית
    const { data: invoiceNumber } = await supabase.rpc("generate_invoice_number");

    // יצירת חשבונית
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .insert({
        user_id: userId,
        invoice_number: invoiceNumber || `INV-${Date.now()}`,
        status: "draft",
        total_amount: totalAmount,
        currency: "ILS",
        notes: notes || null,
      })
      .select()
      .single();

    if (invoiceError || !invoice) {
      console.error("Error creating invoice:", invoiceError);
      return NextResponse.json(
        { success: false, error: "Failed to create invoice" },
        { status: 500 }
      );
    }

    // הוספת פריטים לחשבונית
    const invoiceItems = items.map((item: any, index: number) => ({
      invoice_id: invoice.id,
      item_type: item.item_type,
      item_name: item.item_name,
      item_description: item.item_description || null,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price,
      camera_type: item.camera_type || null,
      sort_order: index,
    }));

    const { error: itemsError } = await supabase
      .from("invoice_items")
      .insert(invoiceItems);

    if (itemsError) {
      console.error("Error creating invoice items:", itemsError);
      // מחיקת החשבונית אם נכשלה הוספת הפריטים
      await supabase.from("invoices").delete().eq("id", invoice.id);
      return NextResponse.json(
        { success: false, error: "Failed to create invoice items" },
        { status: 500 }
      );
    }

    // יצירת רשומת תשלום
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .insert({
        user_id: userId,
        payment_provider: "payplus",
        payment_type: "one_time",
        amount: totalAmount.toString(),
        currency: "ILS",
        status: "pending",
        description: `חשבונית #${invoice.invoice_number}`,
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number,
        items: items.map((item: any) => ({
          name: item.item_name,
          quantity: item.quantity,
          price: item.unit_price,
          description: item.item_description,
        })),
        metadata: {
          invoice_id: invoice.id,
          invoice_number: invoice.invoice_number,
        },
      })
      .select()
      .single();

    if (paymentError || !payment) {
      console.error("Error creating payment:", paymentError);
      return NextResponse.json(
        { success: false, error: "Failed to create payment record" },
        { status: 500 }
      );
    }

    // יצירת לינק תשלום דרך PayPlus
    const returnUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/invoice-payment-success?invoice_id=${invoice.id}`;
    const cancelUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/payment-cancelled`;

    const payplusResponse = await createOneTimePayment({
      sum: totalAmount,
      description: `חשבונית התקנה #${invoice.invoice_number} - ${customerName}`,
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: "", // נוסיף אם יש
      items: items.map((item: any) => ({
        name: item.item_name,
        quantity: item.quantity,
        price: item.unit_price,
        description: item.item_description || "",
      })),
      success_url: returnUrl,
      cancel_url: cancelUrl,
    });

    if (payplusResponse.status !== "1" || !payplusResponse.data) {
      console.error("PayPlus payment creation failed:", payplusResponse);
      return NextResponse.json(
        { success: false, error: "Failed to create payment link", details: payplusResponse.err },
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

    // הוסר: יצירת מנוי חודשי - מטופל בנפרד דרך SubscriptionManager

    // לינק לדף החשבונית שלנו (לא ישר ל-PayPlus)
    const invoiceUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/invoice/${invoice.id}`;

    return NextResponse.json({
      success: true,
      invoice: {
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        total_amount: totalAmount,
      },
      payment: {
        id: payment.id,
        amount: totalAmount,
        paymentUrl: payplusResponse.data.pageUrl,
        processId: payplusResponse.data.processId,
      },
      invoiceUrl: invoiceUrl, // לינק לחשבונית שלנו
      paymentUrl: payplusResponse.data.pageUrl, // לינק ל-PayPlus (לשימוש פנימי)
    });
  } catch (error) {
    console.error("Error in create-invoice:", error);
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

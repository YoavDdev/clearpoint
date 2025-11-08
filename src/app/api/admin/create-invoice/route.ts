import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createOneTimePayment } from "@/lib/grow";

export async function POST(req: NextRequest) {
  try {
    const { userId, items, notes, customerName, customerEmail } = await req.json();

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

    // חישוב סכום כולל
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
        payment_type: "one_time",
        amount: totalAmount.toString(),
        currency: "ILS",
        status: "pending",
        description: `חשבונית #${invoice.invoice_number}`,
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

    // יצירת לינק תשלום דרך Grow
    const returnUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/invoice-payment-success?invoice_id=${invoice.id}`;
    const cancelUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/payment-cancelled`;

    const growResponse = await createOneTimePayment({
      sum: totalAmount,
      description: `חשבונית #${invoice.invoice_number} - ${customerName}`,
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

    if (growResponse.status !== "1" || !growResponse.data) {
      console.error("Grow payment creation failed:", growResponse);
      return NextResponse.json(
        { success: false, error: "Failed to create payment link", details: growResponse.err },
        { status: 500 }
      );
    }

    // עדכון רשומת התשלום עם פרטי Grow
    await supabase
      .from("payments")
      .update({
        provider_transaction_id: growResponse.data.processId,
        provider_payment_url: growResponse.data.pageUrl,
        provider_response: growResponse.data,
      })
      .eq("id", payment.id);

    // עדכון החשבונית עם פרטי התשלום
    await supabase
      .from("invoices")
      .update({
        payment_id: payment.id,
        payment_link: growResponse.data.pageUrl,
        status: "sent",
        sent_at: new Date().toISOString(),
      })
      .eq("id", invoice.id);

    // לינק לדף החשבונית שלנו (לא ישר ל-Grow)
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
        paymentUrl: growResponse.data.pageUrl,
        processId: growResponse.data.processId,
      },
      invoiceUrl: invoiceUrl, // לינק לחשבונית שלנו
      paymentUrl: growResponse.data.pageUrl, // לינק ל-Grow (לשימוש פנימי)
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

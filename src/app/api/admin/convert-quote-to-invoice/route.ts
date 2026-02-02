import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createOneTimePayment } from "@/lib/payplus";

export const dynamic = 'force-dynamic';

/**
 * המרת הצעת מחיר לחשבונית עם לינק תשלום
 * API זה מופעל כשלקוח מאשר הצעת מחיר
 */
export async function POST(req: NextRequest) {
  try {
    const { quoteId } = await req.json();

    if (!quoteId) {
      return NextResponse.json(
        { success: false, error: "Missing quoteId" },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // שליפת הצעת המחיר
    const { data: quote, error: quoteError } = await supabase
      .from("invoices")
      .select(`
        *,
        user:users (
          id,
          full_name,
          email,
          phone,
          address
        )
      `)
      .eq("id", quoteId)
      .eq("document_type", "quote")
      .single();

    if (quoteError || !quote) {
      console.error("Error fetching quote:", quoteError);
      return NextResponse.json(
        { success: false, error: "Quote not found" },
        { status: 404 }
      );
    }

    // בדיקה שהסטטוס מתאים
    if (quote.status !== "quote_sent" && quote.status !== "quote_approved") {
      return NextResponse.json(
        { success: false, error: "Quote must be in sent or approved status" },
        { status: 400 }
      );
    }

    // שליפת פריטי הצעת המחיר
    const { data: items, error: itemsError } = await supabase
      .from("invoice_items")
      .select("*")
      .eq("invoice_id", quoteId);

    if (itemsError || !items) {
      console.error("Error fetching quote items:", itemsError);
      return NextResponse.json(
        { success: false, error: "Failed to fetch quote items" },
        { status: 500 }
      );
    }

    // Atomic annual invoice number (YYYY-####) with retry on duplicates
    let invoice: any = null;
    let invoiceError: any = null;
    let attempts = 0;
    const maxAttempts = 3;

    while (!invoice && attempts < maxAttempts) {
      attempts++;

      const { data: invoiceNumber, error: numberError } = await supabase.rpc(
        "generate_invoice_number"
      );

      if (numberError || !invoiceNumber) {
        console.error("Error generating invoice number:", numberError);
        return NextResponse.json(
          { success: false, error: "Failed to generate invoice number" },
          { status: 500 }
        );
      }

      const { data: createdInvoice, error: createError } = await supabase
        .from("invoices")
        .insert({
          user_id: quote.user_id,
          invoice_number: invoiceNumber,
          document_type: "invoice",
          status: "draft",
          total_amount: quote.total_amount,
          currency: quote.currency,
          notes: quote.notes,
          billing_snapshot: (quote as any).billing_snapshot ?? null,
          issuer_snapshot: (quote as any).issuer_snapshot ?? null,
        })
        .select()
        .single();

      if (!createError) {
        invoice = createdInvoice;
        invoiceError = null;
        break;
      }

      invoiceError = createError;

      if (createError.code === '23505') {
        console.log(
          `Invoice number ${invoiceNumber} already exists, retrying generation...`
        );
        continue;
      }

      break;
    }

    if (invoiceError || !invoice) {
      console.error("Error creating invoice:", invoiceError);
      return NextResponse.json(
        { success: false, error: "Failed to create invoice" },
        { status: 500 }
      );
    }

    // העתקת פריטים לחשבונית החדשה
    const invoiceItems = items.map((item: any) => ({
      invoice_id: invoice.id,
      item_type: item.item_type,
      item_name: item.item_name,
      item_description: item.item_description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price,
      camera_type: item.camera_type,
      sort_order: item.sort_order,
    }));

    const { error: itemsCopyError } = await supabase
      .from("invoice_items")
      .insert(invoiceItems);

    if (itemsCopyError) {
      console.error("Error copying invoice items:", itemsCopyError);
      await supabase.from("invoices").delete().eq("id", invoice.id);
      return NextResponse.json(
        { success: false, error: "Failed to copy invoice items" },
        { status: 500 }
      );
    }

    // יצירת רשומת תשלום
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .insert({
        user_id: quote.user_id,
        payment_provider: "payplus",
        payment_type: "one_time",
        amount: quote.total_amount.toString(),
        currency: quote.currency,
        status: "pending",
        description: `חשבונית #${invoice.invoice_number} (מהצעת מחיר #${quote.invoice_number})`,
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
          converted_from_quote_id: quoteId,
          quote_number: quote.invoice_number,
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

    // שליפת customer_uid של המשתמש (אם קיים)
    const { data: userData } = await supabase
      .from("users")
      .select("customer_uid")
      .eq("id", quote.user_id)
      .single();

    const customerUid = userData?.customer_uid || null;

    // יצירת לינק תשלום דרך PayPlus
    const returnUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/invoice-payment-success?invoice_id=${invoice.id}`;
    const cancelUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/payment-cancelled`;

    const payplusResponse = await createOneTimePayment({
      sum: quote.total_amount,
      description: `קבלה #${invoice.invoice_number} - ${quote.user.full_name}`,
      customer_uid: customerUid || undefined, // ✅ שימוש בלקוח קיים אם יש
      customer_name: quote.user.full_name || "",
      customer_email: quote.user.email || "",
      customer_phone: quote.user.phone || "",
      customer_address: quote.user.address || "",
      customer_city: "",
      customer_id_number: "",
      items: items.map((item: any) => ({
        name: item.item_name,
        quantity: item.quantity,
        price: item.unit_price,
        description: item.item_description || "",
      })),
      success_url: returnUrl,
      cancel_url: cancelUrl,
      custom_fields: {
        cField1: payment.id,
      },
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

    // עדכון הצעת המחיר - סימון שאושרה והומרה
    await supabase
      .from("invoices")
      .update({
        status: "quote_approved",
        approved_at: new Date().toISOString(),
        converted_to_invoice_id: invoice.id,
      })
      .eq("id", quoteId);

    return NextResponse.json({
      success: true,
      invoice: {
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        total_amount: quote.total_amount,
      },
      payment: {
        id: payment.id,
        amount: quote.total_amount,
        paymentUrl: payplusResponse.data.pageUrl,
      },
    });
  } catch (error) {
    console.error("Error in convert-quote-to-invoice:", error);
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

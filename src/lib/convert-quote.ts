import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { createOneTimePayment } from "@/lib/payplus";

/**
 * המרת הצעת מחיר לחשבונית עם לינק תשלום
 * פונקציה משותפת שנקראת גם מאישור לקוח וגם מהמרה ידנית של אדמין
 */
export async function convertQuoteToInvoice(quoteId: string) {
  const supabase = getSupabaseAdmin();

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
    return { success: false, error: "Quote not found", status: 404 };
  }

  // בדיקה שהסטטוס מתאים
  if (quote.status !== "quote_sent" && quote.status !== "quote_approved") {
    return { success: false, error: "Quote must be in sent or approved status", status: 400 };
  }

  // שליפת פריטי הצעת המחיר
  const { data: items, error: itemsError } = await supabase
    .from("invoice_items")
    .select("*")
    .eq("invoice_id", quoteId);

  if (itemsError || !items) {
    return { success: false, error: "Failed to fetch quote items", status: 500 };
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
      return { success: false, error: "Failed to generate invoice number", status: 500 };
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
      continue;
    }

    break;
  }

  if (invoiceError || !invoice) {
    return { success: false, error: "Failed to create invoice", status: 500 };
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
    await supabase.from("invoices").delete().eq("id", invoice.id);
    return { success: false, error: "Failed to copy invoice items", status: 500 };
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
    return { success: false, error: "Failed to create payment record", status: 500 };
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
    customer_uid: customerUid || undefined,
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
    return { success: false, error: "Failed to create payment link", status: 500 };
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

  return {
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
  };
}

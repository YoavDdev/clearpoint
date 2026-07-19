import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { createOneTimePayment } from "@/lib/payplus";
import { requireAdmin } from "@/lib/admin-auth";
import { apiHandler } from "@/lib/api-handler";

/**
 * חידוש לינק תשלום לחשבונית קיימת (כשהלינק הקודם פג תוקף)
 */
export const POST = apiHandler(async (request: NextRequest) => {
  const authResult = await requireAdmin();
  if (authResult instanceof NextResponse) return authResult;

  const { invoice_id } = await request.json();

  if (!invoice_id) {
    return NextResponse.json({ error: "Missing invoice_id" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  // שליפת החשבונית עם פרטי המשתמש
  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .select(`
      *,
      user:users (
        id,
        full_name,
        email,
        phone,
        address,
        customer_uid
      )
    `)
    .eq("id", invoice_id)
    .eq("document_type", "invoice")
    .single();

  if (invoiceError || !invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  if (invoice.status === "paid") {
    return NextResponse.json({ error: "Invoice already paid" }, { status: 400 });
  }

  if (invoice.status === "cancelled") {
    return NextResponse.json({ error: "Invoice is cancelled" }, { status: 400 });
  }

  // שליפת פריטי החשבונית
  const { data: items } = await supabase
    .from("invoice_items")
    .select("*")
    .eq("invoice_id", invoice_id);

  // יצירת לינק תשלום חדש
  const returnUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/invoice-payment-success?invoice_id=${invoice.id}`;
  const cancelUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/payment-cancelled`;

  const payplusResponse = await createOneTimePayment({
    sum: invoice.total_amount,
    description: `קבלה #${invoice.invoice_number} - ${invoice.user.full_name}`,
    customer_uid: invoice.user.customer_uid || undefined,
    customer_name: invoice.user.full_name || "",
    customer_email: invoice.user.email || "",
    customer_phone: invoice.user.phone || "",
    customer_address: invoice.user.address || "",
    customer_city: "",
    customer_id_number: "",
    items: (items || []).map((item: any) => ({
      name: item.item_name,
      quantity: item.quantity,
      price: item.unit_price,
      description: item.item_description || "",
    })),
    success_url: returnUrl,
    cancel_url: cancelUrl,
    custom_fields: {
      cField1: invoice.payment_id || "",
    },
  });

  if (payplusResponse.status !== "1" || !payplusResponse.data) {
    return NextResponse.json(
      { error: "Failed to create new payment link" },
      { status: 500 }
    );
  }

  const newPaymentUrl = payplusResponse.data.pageUrl;

  // עדכון החשבונית עם הלינק החדש
  await supabase
    .from("invoices")
    .update({
      payment_link: newPaymentUrl,
    })
    .eq("id", invoice_id);

  // עדכון רשומת התשלום אם קיימת
  if (invoice.payment_id) {
    await supabase
      .from("payments")
      .update({
        provider_transaction_id: payplusResponse.data.processId,
        provider_payment_url: newPaymentUrl,
      })
      .eq("id", invoice.payment_id);
  }

  console.log(`✅ Regenerated payment link for invoice #${invoice.invoice_number}`);

  return NextResponse.json({
    success: true,
    payment_url: newPaymentUrl,
    invoice_number: invoice.invoice_number,
  });
});

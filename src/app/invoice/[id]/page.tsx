import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { notFound, redirect } from "next/navigation";
import ModernInvoice from "@/components/ModernInvoice";

export default async function InvoiceViewPage({ params }: { params: { id: string } }) {
  const { id } = await params;

  // שליפת חשבונית עם כל המידע
  const { data: invoice, error } = await supabaseAdmin
    .from("invoices")
    .select(`
      *,
      user:users (
        full_name,
        email,
        phone,
        address
      ),
      payment:payments (
        id,
        status,
        amount,
        paid_at,
        provider_payment_id,
        provider_transaction_id,
        metadata,
        created_at,
        updated_at
      )
    `)
    .eq("id", id)
    .single();

  if (!invoice || error) {
    return notFound();
  }

  // שליפת פריטי החשבונית
  const { data: items } = await supabaseAdmin
    .from("invoice_items")
    .select("*")
    .eq("invoice_id", id)
    .order("sort_order", { ascending: true });

  // אם החשבונית כבר שולמה, נפנה לעמוד הצלחה
  if (invoice.status === "paid") {
    redirect(`/invoice-payment-success?invoice_id=${id}`);
  }

  return <ModernInvoice invoice={invoice} items={items || []} isAdmin={false} />;
}

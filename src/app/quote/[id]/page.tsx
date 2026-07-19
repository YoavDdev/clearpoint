import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { notFound } from "next/navigation";
import ModernInvoice from "@/components/ModernInvoice";

export default async function QuoteViewPage({ params }: { params: { id: string } }) {
  const { id } = await params;

  // שליפת הצעת מחיר עם כל המידע
  const { data: quote, error } = await supabaseAdmin
    .from("invoices")
    .select(`
      *,
      user:users (
        full_name,
        email,
        phone,
        address
      ),
      payment:payments!invoices_payment_id_fkey (
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
    .eq("document_type", "quote")
    .single();

  if (!quote || error) {
    return notFound();
  }

  // שליפת פריטי הצעת המחיר
  const { data: items } = await supabaseAdmin
    .from("invoice_items")
    .select("*")
    .eq("invoice_id", id)
    .order("sort_order", { ascending: true });

  return <ModernInvoice invoice={quote} items={items || []} isAdmin={false} />;
}

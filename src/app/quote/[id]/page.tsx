import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { notFound } from "next/navigation";
import QuoteView from "@/components/QuoteView";

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

  return <QuoteView quote={quote} items={items || []} />;
}

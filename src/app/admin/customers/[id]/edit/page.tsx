import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { notFound } from "next/navigation";
import EditCustomerForm from "@/app/admin/customers/[id]/edit/EditCustomerForm";

// ✅ Fix for Next.js 15 — params is now async
export default async function EditCustomerPage({ params }: { params: { id: string } }) {
  const { id } = await params;

  const { data: user, error } = await supabaseAdmin
    .from("users")
    .select("*")
    .eq("id", id)
    .single();

  if (!user || error) {
    console.error("❌ Failed to load customer:", error);
    return notFound();
  }

  return <EditCustomerForm user={user} />;
}

import { supabaseAdmin } from "@/libs/supabaseAdmin";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function CustomerViewPage({ params }: { params: { id: string } }) {
  const { id } = await params;

  const { data: user, error } = await supabaseAdmin
    .from("users")
    .select("*")
    .eq("id", id)
    .single();

  if (!user || error) {
    console.error("❌ Failed to fetch user:", error);
    return notFound();
  }

  return (
    <main className="bg-gray-100 ">
    <div className="p-6 pt-20 max-w-3xl mx-auto bg-gray-100 min-h-screen">
      <div className="mb-6 text-right">
        <Link href="/admin/customers" className="text-blue-600 hover:underline text-sm">← חזרה לרשימת לקוחות</Link>
        <h1 className="text-3xl font-bold mt-2">פרטי לקוח</h1>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6 text-right space-y-6">
        <section>
          <h2 className="text-lg font-semibold mb-2 text-gray-700">פרטי קשר</h2>
          <div className="space-y-2">
            <p><span className="font-medium text-gray-600">שם מלא:</span> {user.full_name || '-'}</p>
            <p><span className="font-medium text-gray-600">אימייל:</span> {user.email}</p>
            <p><span className="font-medium text-gray-600">טלפון:</span> {user.phone || '-'}</p>
            <p><span className="font-medium text-gray-600">כתובת:</span> {user.address || '-'}</p>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2 text-gray-700">הגדרות מנוי</h2>
          <div className="space-y-2">
            <p><span className="font-medium text-gray-600">מסלול:</span> {user.plan_type || '-'}</p>
            <p><span className="font-medium text-gray-600">הערות:</span> {user.notes || '-'}</p>
          </div>
        </section>
      </div>
    </div>
    </main>
  );
}
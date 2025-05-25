import { supabaseAdmin } from "@/libs/supabaseAdmin";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function CustomerViewPage({ params }: { params: { id: string } }) {
  const { id } = await params;

  const { data: user, error } = await supabaseAdmin
    .from("users")
    .select(`
      *,
      plan:plans (
        name,
        monthly_price,
        retention_days,
        connection_type
      )
    `)
    .eq("id", id)
    .single();

  if (!user || error) {
    console.error("❌ Failed to fetch user:", error);
    return notFound();
  }

  return (
    <div dir="rtl" className="max-w-xl mx-auto px-4 py-12">
      <Link href="/admin/customers" className="text-blue-600 hover:underline text-sm">
        ← חזרה לרשימת לקוחות
      </Link>

      <h1 className="text-2xl font-bold mt-4 mb-6 text-center">פרטי לקוח</h1>

      <div className="space-y-6 bg-white rounded-xl shadow-md p-6 border">
        <section className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">שם מלא</label>
            <input disabled className="w-full border p-2 rounded bg-gray-100" value={user.full_name || "-"} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">אימייל</label>
            <input disabled className="w-full border p-2 rounded bg-gray-100" value={user.email} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">טלפון</label>
            <input disabled className="w-full border p-2 rounded bg-gray-100" value={user.phone || "-"} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">כתובת</label>
            <input disabled className="w-full border p-2 rounded bg-gray-100" value={user.address || "-"} />
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">מסלול</label>
            <input disabled className="w-full border p-2 rounded bg-gray-100" value={user.plan?.name || "-"} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">מחיר חודשי</label>
            <input disabled className="w-full border p-2 rounded bg-gray-100" value={`₪${user.custom_price ?? user.plan?.monthly_price}`} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">שימור קבצים</label>
            <input disabled className="w-full border p-2 rounded bg-gray-100" value={`${user.plan_duration_days ?? user.plan?.retention_days} ימים`} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">סוג חיבור</label>
            <input disabled className="w-full border p-2 rounded bg-gray-100" value={user.plan?.connection_type || "-"} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">הערות</label>
            <textarea disabled className="w-full border p-2 rounded bg-gray-100" rows={2} value={user.notes || "-"} />
          </div>
        </section>
      </div>
    </div>
  );
}
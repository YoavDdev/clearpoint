import { createClient } from "@supabase/supabase-js";
import { format } from "date-fns";
import Link from "next/link";

export default async function AdminRequestsPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const [{ data: requests, error }, { data: users }] = await Promise.all([
    supabase.from("subscription_requests").select("*").order("created_at", { ascending: false }),
    supabase.from("users").select("email")
  ]);

  if (error) {
    return <p className="text-center text-red-600">שגיאה בטעינת נתונים</p>;
  }

  const userEmails = new Set(users?.map((u) => u.email));

  async function updateStatus(id: string, status: string) {
    await fetch("/api/update-request-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status })
    });
    location.reload();
  }

  async function updateNote(id: string, note: string) {
    await fetch("/api/update-request-note", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, note })
    });
  }

  return (
    <main className="min-h-screen bg-gray-100 p-6 pt-14">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-right">בקשות להרשמה</h1>

        {requests?.length === 0 ? (
          <p className="text-center text-gray-600">אין בקשות כרגע</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full bg-white rounded shadow text-right">
              <thead className="bg-gray-100 text-sm text-gray-600">
                <tr>
                  <th className="p-3">סטטוס</th>
                  <th className="p-3">שם מלא</th>
                  <th className="p-3">אימייל</th>
                  <th className="p-3">טלפון</th>
                  <th className="p-3">כתובת</th>
                  <th className="p-3">חבילה</th>
                  <th className="p-3">תאריך מועדף</th>
                  <th className="p-3">נשלח בתאריך</th>
                  <th className="p-3">הערות</th>
                  <th className="p-3">צור לקוח</th>
                </tr>
              </thead>
              <tbody>
                {requests?.map((req) => (
                  <tr key={req.id} className="border-t align-top">
                    <td className="p-3">
                      {req.status === 'new' && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">חדש</span>}
                      {req.status === 'handled' && <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">טופל</span>}
                      {req.status === 'deleted' && <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">נמחק</span>}
                      <div className="space-y-1 mt-2">
                        <button onClick={() => updateStatus(req.id, 'new')} className="text-xs text-blue-600 hover:underline">חדש</button><br />
                        <button onClick={() => updateStatus(req.id, 'handled')} className="text-xs text-green-600 hover:underline">טופל</button><br />
                        <button onClick={() => updateStatus(req.id, 'deleted')} className="text-xs text-red-600 hover:underline">מחק</button>
                      </div>
                    </td>
                    <td className="p-3 whitespace-nowrap">{req.full_name}</td>
                    <td className="p-3 whitespace-nowrap">
                      {req.email} {userEmails.has(req.email) && <span className="text-green-600 text-xs font-semibold">(לקוח קיים)</span>}
                    </td>
                    <td className="p-3 whitespace-nowrap">{req.phone}</td>
                    <td className="p-3 whitespace-nowrap">{req.address}</td>
                    <td className="p-3 whitespace-nowrap">{req.selected_plan}</td>
                    <td className="p-3 whitespace-nowrap">{req.preferred_date || '-'}</td>
                    <td className="p-3 whitespace-nowrap">{format(new Date(req.created_at), "yyyy-MM-dd HH:mm")}</td>
                    <td className="p-3 whitespace-nowrap text-sm max-w-[200px]">
                      <textarea
                        defaultValue={req.admin_notes || ''}
                        className="w-full p-1 border rounded"
                        onBlur={(e) => updateNote(req.id, e.target.value)}
                      />
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <Link
                        href={`/admin/customers/new?fullName=${encodeURIComponent(req.full_name)}&email=${encodeURIComponent(req.email)}&phone=${encodeURIComponent(req.phone)}&address=${encodeURIComponent(req.address)}&plan=${encodeURIComponent(req.selected_plan)}`}
                        className="text-blue-600 hover:underline font-semibold"
                      >
                        צור לקוח
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/libs/supabaseClient";
import Link from "next/link";
import { useSession } from "next-auth/react";

interface Customer {
  id: string;
  email: string;
  full_name: string;
  plan_type: string;
  billing_status?: string;
  camera_status?: string;
  custom_price?: number;
  plan_duration_days?: number;
  needs_support?: boolean;
  has_pending_support?: boolean;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const { data: session } = useSession();

  useEffect(() => {
    async function fetchCustomers() {
      if (!session?.user?.access_token) return;

      try {
        const response = await fetch("/api/admin-get-users");
        const result = await response.json();

        if (!response.ok) {
          console.error("❌ Failed to fetch users:", result.error);
          return;
        }

        setCustomers(result.users || []);
      } catch (err) {
        console.error("❌ Unexpected error:", err);
      }

      setLoading(false);
    }

    fetchCustomers();
  }, [session]);

  const filteredCustomers = customers.filter((customer) => {
    const searchText = search.toLowerCase();
    return (
      customer.full_name?.toLowerCase().includes(searchText) ||
      customer.email?.toLowerCase().includes(searchText)
    );
  });

  return (
    <main dir="rtl" className="pt-20 p-6 bg-gray-100 min-h-screen">
      <div className="mb-4">
        <h1 className="text-3xl font-bold">ניהול לקוחות</h1>
        <span className="text-sm text-gray-500">
          סה"כ {customers.length} לקוחות
        </span>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-6">
        <input
          type="text"
          placeholder="חיפוש לפי שם או אימייל..."
          className="w-full max-w-sm p-2 border rounded"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <p className="text-center text-gray-500">טוען נתונים...</p>
      ) : filteredCustomers.length === 0 ? (
        <p className="text-center text-gray-500">לא נמצאו לקוחות תואמים.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl shadow border bg-white">
          <table className="min-w-full text-sm text-right">
            <thead className="bg-gray-100 text-gray-700 font-semibold">
              <tr>
                <th className="px-4 py-3">שם</th>
                <th className="px-4 py-3">אימייל</th>
                <th className="px-4 py-3">מסלול</th>
                <th className="px-4 py-3">מחיר</th>
                <th className="px-4 py-3">שימור</th>
                <th className="px-4 py-3">מצלמות</th>
                <th className="px-4 py-3">תשלום</th>
                <th className="px-4 py-3">סטטוס מערכת</th>
                <th className="px-4 py-3">בקשת תמיכה</th>
                <th className="px-4 py-3">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((customer) => (
                <tr key={customer.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2">{customer.full_name || "-"}</td>
                  <td className="px-4 py-2">{customer.email}</td>
                  <td className="px-4 py-2">{customer.plan_type || "-"}</td>
                  <td className="px-4 py-2">₪{customer.custom_price ?? "-"}</td>
                  <td className="px-4 py-2">{customer.plan_duration_days ?? "-"} ימים</td>
                  <td className="px-4 py-2">{customer.camera_status ?? "4/4 פעילות"}</td>
                  <td className="px-4 py-2">{customer.billing_status ?? "פעיל"}</td>
                  <td className="px-4 py-2">
                    {customer.needs_support ? (
                      <span className="text-red-600 font-semibold">זקוק לתמיכה</span>
                    ) : (
                      <span className="text-green-600">אין בעיות</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {customer.has_pending_support && (
                      <Link
                        href="/admin/support"
                        className="text-yellow-600 font-semibold hover:underline"
                      >
                        📩 ממתינה לטיפול
                      </Link>
                    )}
                  </td>
                  <td className="px-4 py-2 space-y-1">
                    <div className="space-x-2">
                      <Link
                        href={`/admin/customers/${customer.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        צפייה
                      </Link>
                      <Link
                        href={`/admin/customers/${customer.id}/edit`}
                        className="text-green-600 hover:underline"
                      >
                        עריכה
                      </Link>
                      <button
                        onClick={async () => {
                          const confirmDelete = confirm("למחוק את המשתמש?");
                          if (!confirmDelete) return;

                          const response = await fetch("/api/admin-delete-user", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ userId: customer.id }),
                          });

                          const result = await response.json();
                          if (!result.success) {
                            alert("שגיאה במחיקה: " + result.error);
                          } else {
                            alert("המשתמש נמחק בהצלחה");
                            location.reload();
                          }
                        }}
                        className="text-red-600 hover:underline"
                      >
                        מחיקה
                      </button>
                    </div>
                    <button
                      onClick={async () => {
                        const response = await fetch("/api/admin-mark-support", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            userId: customer.id,
                            needs_support: !customer.needs_support,
                          }),
                        });

                        const result = await response.json();
                        if (result.success) {
                          alert("עודכן סטטוס התמיכה");
                          location.reload();
                        } else {
                          alert("שגיאה: " + result.error);
                        }
                      }}
                      className="text-yellow-600 hover:underline text-xs block"
                    >
                      {customer.needs_support
                        ? "הסר סימון תמיכה"
                        : "סמן כזקוק לתמיכה"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

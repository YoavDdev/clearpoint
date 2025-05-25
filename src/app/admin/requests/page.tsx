"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { format } from "date-fns";
import Link from "next/link";

type SubscriptionRequest = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  address: string;
  selected_plan: string;
  preferred_date: string | null;
  created_at: string;
  admin_notes: string;
  status: string;
  isCustomer?: boolean;
};

export default function AdminRequestsPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [requests, setRequests] = useState<SubscriptionRequest[]>([]);
  const [userEmails, setUserEmails] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  async function fetchData() {
    const { data: requestsData } = await supabase
      .from("subscription_requests")
      .select("*");

    const usersRes = await fetch("/api/admin-get-users");
    const usersJson = await usersRes.json();
    const emails = new Set<string>(
      usersJson.users?.map((u: any) => u.email?.trim().toLowerCase()) || []
    );

    const enrichedRequests = (requestsData || []).map((req) => ({
      ...req,
      isCustomer: emails.has(req.email?.trim().toLowerCase()),
    }));

    const statusOrder: Record<"new" | "handled" | "deleted", number> = {
      new: 0,
      handled: 1,
      deleted: 2,
    };

    const sortedRequests = enrichedRequests.sort(
      (a, b) =>
        statusOrder[a.status as keyof typeof statusOrder] -
        statusOrder[b.status as keyof typeof statusOrder]
    );

    setUserEmails(emails);
    setRequests(sortedRequests);
    setLoading(false);
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from("subscription_requests").update({ status }).eq("id", id);
    fetchData();
  }

  async function updateNote(id: string, note: string) {
    await supabase.from("subscription_requests").update({ admin_notes: note }).eq("id", id);
    fetchData();
  }

  async function deleteRequest(id: string) {
    const confirmed = confirm("האם אתה בטוח שברצונך למחוק את הבקשה לצמיתות?");
    if (!confirmed) return;

    await supabase.from("subscription_requests").delete().eq("id", id);
    fetchData();
  }

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) return <p className="text-center">טוען נתונים...</p>;

  return (
    <main dir="rtl" className="min-h-screen bg-gray-100 py-10 px-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-right">בקשות להרשמה</h1>

        {requests.length === 0 ? (
          <p className="text-center text-gray-600">אין בקשות כרגע</p>
        ) : (
          <div className="overflow-x-auto bg-white shadow rounded-xl border">
            <table className="min-w-full text-sm text-right">
              <thead className="bg-gray-100 text-gray-700 font-semibold">
                <tr>
                  <th className="px-4 py-3">סטטוס</th>
                  <th className="px-4 py-3">שם מלא</th>
                  <th className="px-4 py-3">אימייל</th>
                  <th className="px-4 py-3">טלפון</th>
                  <th className="px-4 py-3">כתובת</th>
                  <th className="px-4 py-3">חבילה</th>
                  <th className="px-4 py-3">תאריך מועדף</th>
                  <th className="px-4 py-3">נשלח בתאריך</th>
                  <th className="px-4 py-3">הערות</th>
                  <th className="px-4 py-3">פעולות</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req) => (
                  <tr
                    key={req.id}
                    className={`border-t hover:bg-gray-50 ${
                      req.status === "handled" && req.isCustomer
                        ? "bg-green-50"
                        : req.status === "handled"
                        ? "bg-blue-50"
                        : req.isCustomer
                        ? "bg-green-50"
                        : ""
                    }`}
                  >
                    <td className="px-4 py-2">
                      {req.status === "new" && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                          חדש
                        </span>
                      )}
                      {req.status === "handled" && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                          טופל
                        </span>
                      )}
                      {req.status === "deleted" && (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">
                          נמחק
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 font-medium whitespace-nowrap">{req.full_name}</td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <div className="flex flex-col items-end">
                        <span>{req.email}</span>
                        {req.isCustomer && (
                          <span className="text-green-600 text-xs font-semibold">
                            לקוח קיים
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">{req.phone}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{req.address}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{req.selected_plan}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{req.preferred_date || "-"}</td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      {format(new Date(req.created_at), "yyyy-MM-dd HH:mm")}
                    </td>
                    <td className="px-4 py-2">
                      <textarea
                        className="w-full text-sm border rounded p-1 bg-gray-50"
                        defaultValue={req.admin_notes || ""}
                        onBlur={(e) => updateNote(req.id, e.target.value)}
                      />
                    </td>
                    <td className="px-4 py-2 space-y-1 text-sm">
                      {!req.isCustomer && (
                        <Link
                          href={`/admin/customers/new?fullName=${encodeURIComponent(
                            req.full_name
                          )}&email=${encodeURIComponent(
                            req.email
                          )}&phone=${encodeURIComponent(
                            req.phone
                          )}&address=${encodeURIComponent(
                            req.address
                          )}&plan=${encodeURIComponent(req.selected_plan)}`}
                          className="block text-blue-600 hover:underline font-semibold"
                        >
                          צור לקוח
                        </Link>
                      )}
                      {req.status === "new" ? (
                        <button
                          onClick={() => updateStatus(req.id, "handled")}
                          className="block text-green-600 hover:underline"
                        >
                          סמן כטופל
                        </button>
                      ) : req.status === "handled" ? (
                        <button
                          onClick={() => updateStatus(req.id, "new")}
                          className="block text-blue-600 hover:underline"
                        >
                          סמן כחדש
                        </button>
                      ) : null}
                      <button
                        onClick={() => deleteRequest(req.id)}
                        className="block text-red-600 hover:underline"
                      >
                        מחק
                      </button>
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
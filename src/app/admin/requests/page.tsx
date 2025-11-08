"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { format } from "date-fns";
import Link from "next/link";
import {
  FileText,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Trash2,
  UserPlus,
  Edit,
  Eye,
  MessageSquare,
  Send,
  DollarSign,
  Copy,
  ExternalLink,
} from "lucide-react";

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
  payment_link?: string | null;
  user_id?: string | null;
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
  const [sendingPaymentLink, setSendingPaymentLink] = useState<string | null>(null);
  const [showPaymentLink, setShowPaymentLink] = useState<{id: string, link: string} | null>(null);

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

  async function sendPaymentLink(requestId: string, selectedPlan: string) {
    setSendingPaymentLink(requestId);
    try {
      // המרת selected_plan לformat של plan_id
      const planMap: Record<string, string> = {
        "SIM Cloud - sim": "sim-cloud",
        "Wi-Fi Cloud - wifi": "wifi-cloud",
      };
      const planId = planMap[selectedPlan] || "sim-cloud";

      const response = await fetch("/api/admin/create-user-and-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, planId }),
      });

      const data = await response.json();

      if (data.success) {
        alert("✅ לינק תשלום נוצר בהצלחה!");
        setShowPaymentLink({ id: requestId, link: data.payment.paymentUrl });
        fetchData();
      } else {
        alert("❌ שגיאה: " + data.error);
      }
    } catch (error) {
      console.error("Error sending payment link:", error);
      alert("❌ שגיאה ביצירת לינק תשלום");
    } finally {
      setSendingPaymentLink(null);
    }
  }

  function copyPaymentLink(link: string) {
    navigator.clipboard.writeText(link);
    alert("✅ הלינק הועתק ללוח!");
  }

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white p-12 rounded-2xl shadow-sm border border-slate-200 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-slate-600">טוען בקשות הצטרפות...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main dir="rtl" className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="text-right">
              <h1 className="text-4xl font-bold text-slate-800 mb-2">בקשות הצטרפות</h1>
              <p className="text-slate-600">ניהול בקשות מאתר האינטרנט</p>
            </div>
            <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl flex items-center justify-center shadow-lg">
              <FileText size={32} className="text-white" />
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <div className="text-right">
                <p className="text-slate-600 text-sm font-medium">סה"כ בקשות</p>
                <p className="text-3xl font-bold text-slate-800">{requests.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <FileText size={24} className="text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <div className="text-right">
                <p className="text-slate-600 text-sm font-medium">בקשות חדשות</p>
                <p className="text-3xl font-bold text-purple-600">
                  {requests.filter(r => r.status === 'new').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <AlertCircle size={24} className="text-purple-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <div className="text-right">
                <p className="text-slate-600 text-sm font-medium">בקשות מטופלות</p>
                <p className="text-3xl font-bold text-green-600">
                  {requests.filter(r => r.status === 'handled').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <CheckCircle size={24} className="text-green-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <div className="text-right">
                <p className="text-slate-600 text-sm font-medium">לקוחות קיימים</p>
                <p className="text-3xl font-bold text-orange-600">
                  {requests.filter(r => r.isCustomer).length}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <User size={24} className="text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Requests Table */}
        {requests.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl shadow-sm border border-slate-200 text-center">
            <FileText size={48} className="mx-auto mb-4 text-slate-400" />
            <h3 className="text-xl font-semibold text-slate-800 mb-2">אין בקשות כרגע</h3>
            <p className="text-slate-600">כל הבקשות מאתר האינטרנט יופיעו כאן</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-slate-700">סטטוס</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-slate-700">פרטי לקוח</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-slate-700">יצירת קשר</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-slate-700">מסלול</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-slate-700">תאריכים</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-slate-700">הערות</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-slate-700">פעולות</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {requests.map((req) => (
                    <tr
                      key={req.id}
                      className={`hover:bg-slate-50 transition-colors ${
                        req.status === "handled" && req.isCustomer
                          ? "bg-green-50"
                          : req.status === "handled"
                          ? "bg-blue-50"
                          : req.status === "new"
                          ? "bg-purple-50"
                          : "bg-red-50"
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 justify-end">
                          {req.status === "new" && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium">
                              <AlertCircle size={14} />
                              חדש
                            </span>
                          )}
                          {req.status === "payment_link_sent" && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium">
                              <Send size={14} />
                              לינק נשלח
                            </span>
                          )}
                          {req.status === "paid" && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-lg text-sm font-medium">
                              <DollarSign size={14} />
                              שולם
                            </span>
                          )}
                          {req.status === "handled" && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-teal-100 text-teal-700 rounded-lg text-sm font-medium">
                              <CheckCircle size={14} />
                              מותקן
                            </span>
                          )}
                          {req.status === "deleted" && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-lg text-sm font-medium">
                              <Trash2 size={14} />
                              נמחק
                            </span>
                          )}
                          {req.isCustomer && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-medium">
                              <User size={12} />
                              לקוח קיים
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-right">
                          <div className="font-semibold text-slate-800">{req.full_name}</div>
                          <div className="text-sm text-slate-600">{req.address}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-right space-y-1">
                          <div className="flex items-center gap-2 justify-end">
                            <span className="text-slate-700">{req.email}</span>
                            <Mail size={16} className="text-slate-400" />
                          </div>
                          <div className="flex items-center gap-2 justify-end">
                            <span className="text-slate-600 text-sm">{req.phone}</span>
                            <Phone size={16} className="text-slate-400" />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-lg text-sm font-medium">
                          <FileText size={16} />
                          <span>{req.selected_plan}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-right space-y-1">
                          <div className="flex items-center gap-2 justify-end text-sm text-slate-600">
                            <span>{req.preferred_date || "ללא תאריך"}</span>
                            <Calendar size={16} className="text-slate-400" />
                          </div>
                          <div className="flex items-center gap-2 justify-end text-xs text-slate-500">
                            <span>{format(new Date(req.created_at), "yyyy-MM-dd HH:mm")}</span>
                            <Clock size={14} className="text-slate-400" />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="relative">
                          <MessageSquare size={16} className="absolute right-3 top-3 text-slate-400" />
                          <textarea
                            className="w-full pr-10 pl-3 py-2 text-sm border border-slate-300 rounded-lg bg-slate-50 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-right resize-none"
                            rows={2}
                            placeholder="הערות מנהל..."
                            defaultValue={req.admin_notes || ""}
                            onBlur={(e) => updateNote(req.id, e.target.value)}
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 justify-end flex-wrap">
                          {/* כפתור יצירת לקוח - הדרך היחידה להמשיך */}
                          {!req.isCustomer && req.status === "new" && (
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
                              className="px-3 py-2 text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors group font-medium text-sm flex items-center gap-2"
                              title="צור לקוח חדש"
                            >
                              <UserPlus size={16} className="group-hover:scale-110 transition-transform" />
                              צור לקוח
                            </Link>
                          )}
                          
                          {/* לינק ללקוח קיים */}
                          {req.isCustomer && req.user_id && (
                            <Link
                              href={`/admin/customers/${req.user_id}`}
                              className="px-3 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors group font-medium text-sm flex items-center gap-2"
                              title="צפה בלקוח"
                            >
                              <Eye size={16} className="group-hover:scale-110 transition-transform" />
                              צפה בלקוח
                            </Link>
                          )}
                          
                          {/* שינוי סטטוס */}
                          {req.status === "payment_link_sent" || req.status === "paid" ? (
                            <button
                              onClick={() => updateStatus(req.id, "handled")}
                              className="p-2 text-teal-600 hover:bg-teal-100 rounded-lg transition-colors group"
                              title="סמן כמותקן"
                            >
                              <CheckCircle size={16} className="group-hover:scale-110 transition-transform" />
                            </button>
                          ) : req.status === "handled" ? (
                            <button
                              onClick={() => updateStatus(req.id, "new")}
                              className="p-2 text-purple-600 hover:bg-purple-100 rounded-lg transition-colors group"
                              title="סמן כחדש"
                            >
                              <AlertCircle size={16} className="group-hover:scale-110 transition-transform" />
                            </button>
                          ) : null}
                          
                          {/* מחיקה */}
                          <button
                            onClick={() => deleteRequest(req.id)}
                            className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors group"
                            title="מחק בקשה"
                          >
                            <Trash2 size={16} className="group-hover:scale-110 transition-transform" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
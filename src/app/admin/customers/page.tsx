"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/libs/supabaseClient";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Users,
  Search,
  Plus,
  Eye,
  Edit,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Camera,
  CreditCard,
  Clock,
  UserPlus,
  Filter,
} from "lucide-react";

interface Customer {
  id: string;
  email: string;
  full_name: string;
  plan_id: string;
  billing_status?: string;
  custom_price?: number;
  plan_duration_days?: number;
  needs_support?: boolean;
  has_pending_support?: boolean;
  camera_count?: number;
  initial_camera_count?: number;
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
    <main dir="rtl" className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="text-right">
              <h1 className="text-4xl font-bold text-slate-800 mb-2">ניהול לקוחות</h1>
              <p className="text-slate-600">סה"כ {customers.length} לקוחות רשומים במערכת</p>
            </div>
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center shadow-lg">
              <Users size={32} className="text-white" />
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <div className="text-right">
                <p className="text-slate-600 text-sm font-medium">סה"כ לקוחות</p>
                <p className="text-3xl font-bold text-blue-600">{customers.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Users size={24} className="text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <div className="text-right">
                <p className="text-slate-600 text-sm font-medium">זקוקים לתמיכה</p>
                <p className="text-3xl font-bold text-orange-600">
                  {customers.filter(c => c.needs_support).length}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <AlertTriangle size={24} className="text-orange-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <div className="text-right">
                <p className="text-slate-600 text-sm font-medium">פניות פתוחות</p>
                <p className="text-3xl font-bold text-red-600">
                  {customers.filter(c => c.has_pending_support).length}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <Clock size={24} className="text-red-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <div className="text-right">
                <p className="text-slate-600 text-sm font-medium">מצלמות פעילות</p>
                <p className="text-3xl font-bold text-green-600">
                  {customers.reduce((sum, c) => sum + (c.camera_count || 0), 0)}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <Camera size={24} className="text-green-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-8">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 w-full lg:w-auto">
              <div className="relative flex-1 lg:w-80">
                <Search size={20} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="חיפוש לפי שם או אימייל..."
                  className="w-full pr-10 pl-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            
            <Link
              href="/admin/customers/new"
              className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-all hover:shadow-lg group"
            >
              <Plus size={20} className="group-hover:scale-110 transition-transform" />
              <span>לקוח חדש</span>
            </Link>
          </div>
        </div>

        {/* Customers Table */}
        {loading ? (
          <div className="bg-white p-12 rounded-2xl shadow-sm border border-slate-200 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-slate-600">טוען נתוני לקוחות...</p>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl shadow-sm border border-slate-200 text-center">
            <Users size={48} className="mx-auto mb-4 text-slate-400" />
            <h3 className="text-xl font-semibold text-slate-800 mb-2">לא נמצאו לקוחות</h3>
            <p className="text-slate-600 mb-6">לא נמצאו לקוחות התואמים לחיפוש</p>
            <Link
              href="/admin/customers/new"
              className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-all"
            >
              <Plus size={20} />
              <span>הוסף לקוח ראשון</span>
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-slate-700">לקוח</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-slate-700">מסלול</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-slate-700">מחיר</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-slate-700">מצלמות</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-slate-700">סטטוס</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-slate-700">פעולות</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredCustomers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <Link 
                          href={`/admin/customers/${customer.id}`}
                          className="text-right block hover:bg-blue-50 rounded-lg px-2 py-1 -mx-2 transition-colors"
                        >
                          <div className="font-semibold text-blue-700 hover:text-blue-900 underline-offset-2 hover:underline">
                            {customer.full_name || "ללא שם"}
                          </div>
                          <div className="text-sm text-slate-600">{customer.email}</div>
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-lg text-sm font-medium">
                          <CreditCard size={16} />
                          <span>{customer.plan_id || "ללא מסלול"}</span>
                        </div>
                        <div className="text-xs text-slate-500 mt-1 text-right">
                          {customer.plan_duration_days ? `${customer.plan_duration_days} ימים` : "ללא שימור"}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="font-semibold text-slate-800">
                          ₪{customer.custom_price || "ללא מחיר"}
                        </div>
                        <div className="text-xs text-slate-500">לחודש</div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/admin/cameras?user=${customer.id}`}
                          className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 hover:bg-green-200 text-green-800 rounded-lg text-sm font-medium transition-colors"
                        >
                          <Camera size={16} />
                          <span>{customer.camera_count || 0}</span>
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="space-y-2">
                          <div className="inline-flex items-center gap-2">
                            {customer.needs_support ? (
                              <>
                                <AlertTriangle size={16} className="text-red-600" />
                                <span className="text-red-600 font-medium text-sm">זקוק לתמיכה</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle size={16} className="text-green-600" />
                                <span className="text-green-600 font-medium text-sm">תקין</span>
                              </>
                            )}
                          </div>
                          {customer.has_pending_support && (
                            <Link
                              href="/admin/support"
                              className="inline-flex items-center gap-1 text-orange-600 hover:text-orange-700 text-xs font-medium"
                            >
                              <Clock size={14} />
                              <span>פניה פתוחה</span>
                            </Link>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 justify-end">
                          <Link
                            href={`/admin/customers/${customer.id}`}
                            className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                            title="צפייה"
                          >
                            <Eye size={16} />
                          </Link>
                          <Link
                            href={`/admin/customers/${customer.id}/edit`}
                            className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                            title="עריכה"
                          >
                            <Edit size={16} />
                          </Link>
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
                            className="p-2 text-orange-600 hover:bg-orange-100 rounded-lg transition-colors"
                            title={customer.needs_support ? "הסר סימון תמיכה" : "סמן כזקוק לתמיכה"}
                          >
                            <AlertTriangle size={16} />
                          </button>
                          <button
                            onClick={async () => {
                              const confirmDelete = confirm("האם אתה בטוח שברצונך למחוק את הלקוח?");
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
                                alert("הלקוח נמחק בהצלחה");
                                location.reload();
                              }
                            }}
                            className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                            title="מחיקת לקוח"
                          >
                            <Trash2 size={16} />
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

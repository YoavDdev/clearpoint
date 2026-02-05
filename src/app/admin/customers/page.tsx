"use client";

import { forwardRef, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { FixedSizeList as List } from "react-window";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { AdminPageTop } from "@/components/admin/AdminPageTop";
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
  Calendar,
  XCircle,
  DollarSign,
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
  subscription_active?: boolean;
  subscription_status?: string;
  subscription?: {
    status: string;
    amount: number;
    next_billing_date: string;
    last_billing_date: string;
    billing_cycle: string;
  } | null;
  latest_payment?: {
    amount: number;
    status: string;
    paid_at: string;
    payment_type: string;
  } | null;
}
export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const ListOuterElement = forwardRef<HTMLDivElement, any>((props, ref) => {
    return (
      <div
        ref={ref}
        {...props}
        style={{
          ...(props.style || {}),
          scrollbarGutter: 'stable',
        }}
      />
    );
  });
  ListOuterElement.displayName = 'ListOuterElement';

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

  const Row = ({ index, style }: { index: number; style: any }) => {
    const customer = filteredCustomers[index];
    if (!customer) return null;

    const subscriptionStatus = customer.subscription?.status;

    return (
      <div
        style={style}
        dir="rtl"
        className={`grid grid-cols-[3.2fr_2fr_1fr_1.1fr_1.6fr_1.4fr_2fr] gap-3 items-center px-4 border-b border-slate-100 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}
      >
        <div className="min-w-0" dir="rtl">
          <Link href={`/admin/customers/${customer.id}`} className="block min-w-0">
            <div
              className="font-bold text-slate-900 truncate text-right"
              title={customer.full_name || ''}
            >
              {customer.full_name || 'ללא שם'}
            </div>
            <div
              className="text-xs text-slate-600 truncate text-right"
              title={customer.email}
            >
              {customer.email}
            </div>
          </Link>
        </div>

        <div className="min-w-0" dir="rtl">
          <div
            className="text-sm text-slate-900 truncate text-right"
            title={customer.plan_id || ''}
          >
            {customer.plan_id || '—'}
          </div>
          <div className="text-xs text-slate-500 truncate text-right">
            {customer.plan_duration_days ? `${customer.plan_duration_days} ימים` : 'ללא שימור'}
          </div>
        </div>

        <div className="min-w-0" dir="rtl">
          <div className="font-bold text-slate-900 text-right">₪{customer.custom_price || '—'}</div>
        </div>

        <div className="min-w-0 text-right" dir="rtl">
          <Link
            href={`/admin/cameras?user=${customer.id}`}
            className="inline-flex items-center gap-1 px-3 py-1 rounded-full border text-xs font-medium bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
          >
            <Camera className="w-3 h-3" />
            {customer.camera_count || 0}
          </Link>
        </div>

        <div className="min-w-0" dir="rtl">
          {customer.subscription ? (
            <div className="flex flex-col gap-1 items-start">
              <div className="w-full flex justify-start">
                <span
                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-full border text-xs font-medium ${
                    subscriptionStatus === 'active'
                      ? 'bg-green-50 text-green-700 border-green-200'
                      : subscriptionStatus === 'cancelled'
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : 'bg-orange-50 text-orange-700 border-orange-200'
                  }`}
                >
                  {subscriptionStatus === 'active' ? (
                    <CheckCircle className="w-3 h-3" />
                  ) : subscriptionStatus === 'cancelled' ? (
                    <XCircle className="w-3 h-3" />
                  ) : (
                    <AlertTriangle className="w-3 h-3" />
                  )}
                  {subscriptionStatus === 'active' ? 'פעילה' : subscriptionStatus === 'cancelled' ? 'בוטלה' : subscriptionStatus}
                </span>
              </div>
              <div className="text-xs text-slate-500 text-right">
                ₪{customer.subscription.amount}/{customer.subscription.billing_cycle === 'monthly' ? 'חודש' : 'שנה'}
              </div>
            </div>
          ) : (
            <div className="w-full flex justify-start">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full border text-xs font-medium bg-slate-50 text-slate-700 border-slate-200">
                <XCircle className="w-3 h-3" />
                אין מנוי
              </span>
            </div>
          )}
        </div>

        <div className="min-w-0" dir="rtl">
          <div className="flex flex-col gap-1 items-start">
            <div className="w-full flex justify-start">
              {customer.needs_support ? (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full border text-xs font-medium bg-red-50 text-red-700 border-red-200">
                  <AlertTriangle className="w-3 h-3" />
                  זקוק לתמיכה
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full border text-xs font-medium bg-green-50 text-green-700 border-green-200">
                  <CheckCircle className="w-3 h-3" />
                  תקין
                </span>
              )}
            </div>
            {customer.has_pending_support && (
              <Link href="/admin/support" className="text-xs text-orange-600 hover:text-orange-700">
                פניה פתוחה
              </Link>
            )}
          </div>
        </div>

        <div className="min-w-0" dir="ltr">
          <div className="flex gap-1 justify-start" dir="ltr">
            <Link
              href={`/admin/customers/${customer.id}`}
              className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-all"
              title="צפייה"
            >
              <Eye size={16} />
            </Link>
            <Link
              href={`/admin/customers/${customer.id}/edit`}
              className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-all"
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
              className="p-2 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 transition-all"
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
              className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-all"
              title="מחיקת לקוח"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <AdminPageShell>
      <AdminPageTop
        spacing="compact"
        scrollMode="single"
        header={(
          <AdminPageHeader
            title="ניהול לקוחות"
            subtitle={`סה"כ ${customers.length} לקוחות רשומים במערכת`}
            icon={Users}
            tone="blue"
          />
        )}
        stats={(
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
                  <p className="text-slate-600 text-sm font-medium">מנויים פעילים</p>
                  <p className="text-3xl font-bold text-green-600">
                    {customers.filter(c => c.subscription?.status === 'active').length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <CreditCard size={24} className="text-green-600" />
                </div>
              </div>
            </div>
          </div>
        )}
        controls={(
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
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
        )}
      />

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
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto lg:overflow-x-visible">
            <div className="w-full min-w-[980px] lg:min-w-0">
              <div dir="rtl" className="grid grid-cols-[3.2fr_2fr_1fr_1.1fr_1.6fr_1.4fr_2fr] gap-3 items-center px-4 py-3 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700">
                <div className="min-w-0 text-right">לקוח</div>
                <div className="min-w-0 text-right">מסלול</div>
                <div className="min-w-0 text-right">מחיר</div>
                <div className="min-w-0 text-right">מצלמות</div>
                <div className="min-w-0 text-right">הוראת קבע</div>
                <div className="min-w-0 text-right">תמיכה</div>
                <div className="min-w-0 text-right">פעולות</div>
              </div>

              <List
                height={520}
                itemCount={filteredCustomers.length}
                itemSize={56}
                width={'100%'}
                outerElementType={ListOuterElement as any}
              >
                {Row as any}
              </List>
            </div>
          </div>
        </div>
      )}
    </AdminPageShell>
  );
}

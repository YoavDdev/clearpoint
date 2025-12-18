"use client";

import { useState, useEffect } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";

export const dynamic = 'force-dynamic';

type Payment = {
  id: string;
  payment_type: string;
  amount: string;
  currency: string;
  status: string;
  description: string;
  created_at: string;
  paid_at: string | null;
  items: any[];
  metadata: any;
};

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const router = useRouter();
  const [supabase, setSupabase] = useState<any>(null);

  useEffect(() => {
    setSupabase(createClientComponentClient());
  }, []);

  useEffect(() => {
    if (!supabase) return;
    loadPayments();
  }, [supabase]);

  async function loadPayments() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }

      const { data: user } = await supabase
        .from("users")
        .select("id")
        .eq("email", session.user.email)
        .single();

      if (!user) return;

      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (data && !error) {
        setPayments(data);
      }
    } catch (error) {
      console.error("Error loading payments:", error);
    } finally {
      setLoading(false);
    }
  }

  const filteredPayments = payments.filter((payment) => {
    if (filter === "all") return true;
    return payment.status === filter;
  });

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
      completed: "bg-green-100 text-green-800 border-green-200",
      failed: "bg-red-100 text-red-800 border-red-200",
      cancelled: "bg-gray-100 text-gray-800 border-gray-200",
    };

    const labels = {
      pending: "⏳ בהמתנה",
      completed: "✅ הושלם",
      failed: "❌ נכשל",
      cancelled: "🚫 בוטל",
    };

    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium border ${styles[status as keyof typeof styles] || styles.pending}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  };

  const getPaymentTypeLabel = (type: string) => {
    return type === "one_time" ? "תשלום חד-פעמי" : "מנוי חודשי";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-6" dir="rtl">
        <div className="max-w-6xl mx-auto flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-600">טוען היסטוריית תשלומים...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-6" dir="rtl">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">💰 היסטוריית תשלומים</h1>
          <p className="text-slate-600">כל התשלומים והעסקאות שביצעת במערכת</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setFilter("all")}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filter === "all"
                  ? "bg-blue-600 text-white shadow-md"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              הכל ({payments.length})
            </button>
            <button
              onClick={() => setFilter("completed")}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filter === "completed"
                  ? "bg-green-600 text-white shadow-md"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              ✅ הושלמו ({payments.filter((p) => p.status === "completed").length})
            </button>
            <button
              onClick={() => setFilter("pending")}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filter === "pending"
                  ? "bg-yellow-600 text-white shadow-md"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              ⏳ בהמתנה ({payments.filter((p) => p.status === "pending").length})
            </button>
            <button
              onClick={() => setFilter("failed")}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filter === "failed"
                  ? "bg-red-600 text-white shadow-md"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              ❌ נכשלו ({payments.filter((p) => p.status === "failed").length})
            </button>
          </div>
        </div>

        {/* Payments List */}
        {filteredPayments.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
            <div className="text-6xl mb-4">💳</div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">אין תשלומים להצגה</h3>
            <p className="text-slate-600">
              {filter === "all"
                ? "עדיין לא ביצעת תשלומים במערכת"
                : `אין תשלומים בסטטוס "${filter}"`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPayments.map((payment) => (
              <div
                key={payment.id}
                className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-all"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  {/* Right Side - Main Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {getStatusBadge(payment.status)}
                      <span className="text-sm text-slate-600">
                        {new Date(payment.created_at).toLocaleDateString("he-IL", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-1">
                      {payment.description || getPaymentTypeLabel(payment.payment_type)}
                    </h3>
                    <p className="text-sm text-slate-600">
                      {getPaymentTypeLabel(payment.payment_type)} • מזהה: {payment.id.slice(0, 8)}...
                    </p>
                  </div>

                  {/* Left Side - Amount */}
                  <div className="text-left md:text-right">
                    <div className="text-3xl font-bold text-slate-900">
                      ₪{parseFloat(payment.amount).toLocaleString()}
                    </div>
                    {payment.paid_at && (
                      <div className="text-sm text-green-600 font-medium mt-1">
                        שולם ב-{new Date(payment.paid_at).toLocaleDateString("he-IL")}
                      </div>
                    )}
                  </div>
                </div>

                {/* Items Details */}
                {payment.items && payment.items.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <div className="text-sm font-medium text-slate-700 mb-2">פריטים:</div>
                    <div className="space-y-2">
                      {payment.items.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span className="text-slate-600">
                            {item.name} {item.quantity > 1 && `× ${item.quantity}`}
                          </span>
                          <span className="font-medium text-slate-900">
                            ₪{(item.price * item.quantity).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Metadata */}
                {payment.metadata && (
                  <div className="mt-3 pt-3 border-t border-slate-200">
                    <div className="flex flex-wrap gap-2 text-xs">
                      {payment.metadata.plan_name_he && (
                        <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded">
                          {payment.metadata.plan_name_he}
                        </span>
                      )}
                      {payment.metadata.connection_type && (
                        <span className="bg-purple-50 text-purple-700 px-2 py-1 rounded">
                          {payment.metadata.connection_type === "wifi" ? "Wi-Fi" : "SIM"}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* View Invoice Button */}
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <button
                    onClick={() => {
                      if (payment.payment_type === "recurring") {
                        router.push(`/subscription-invoice/${payment.id}`);
                      } else {
                        // לתשלום חד-פעמי אין עדיין חשבונית, אבל אפשר להוסיף בעתיד
                        alert("חשבונית זמינה בקרוב");
                      }
                    }}
                    className="w-full py-2 text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors font-medium"
                  >
                    📄 צפה בחשבונית
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Summary Stats */}
        {payments.length > 0 && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-6 border border-blue-100">
              <div className="text-sm text-blue-700 font-medium mb-1">סה"כ תשלומים</div>
              <div className="text-2xl font-bold text-blue-900">{payments.length}</div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-100">
              <div className="text-sm text-green-700 font-medium mb-1">סה"כ שולם</div>
              <div className="text-2xl font-bold text-green-900">
                ₪
                {payments
                  .filter((p) => p.status === "completed")
                  .reduce((sum, p) => sum + parseFloat(p.amount), 0)
                  .toLocaleString()}
              </div>
            </div>
            <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl p-6 border border-yellow-100">
              <div className="text-sm text-yellow-700 font-medium mb-1">בהמתנה</div>
              <div className="text-2xl font-bold text-yellow-900">
                ₪
                {payments
                  .filter((p) => p.status === "pending")
                  .reduce((sum, p) => sum + parseFloat(p.amount), 0)
                  .toLocaleString()}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

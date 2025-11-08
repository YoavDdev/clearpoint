"use client";

import { useState, useEffect } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import { Calendar, CreditCard, AlertCircle, CheckCircle, TrendingUp, XCircle } from "lucide-react";

type Subscription = {
  id: string;
  plan_id: string;
  status: string;
  billing_cycle: string;
  amount: string;
  next_billing_date: string;
  created_at: string;
  plan?: {
    name: string;
    name_he: string;
    monthly_price: number;
    setup_price: number;
    retention_days: number;
    camera_limit: number;
    connection_type: string;
  };
};

type Payment = {
  id: string;
  amount: string;
  status: string;
  created_at: string;
  paid_at: string | null;
};

export default function SubscriptionPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [recentPayments, setRecentPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const router = useRouter();
  const supabase = createClientComponentClient();

  useEffect(() => {
    loadSubscriptionData();
  }, []);

  async function loadSubscriptionData() {
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

      // Load active subscription
      const { data: subData } = await supabase
        .from("subscriptions")
        .select(`
          *,
          plan:plans(*)
        `)
        .eq("user_id", user.id)
        .eq("status", "active")
        .single();

      if (subData) {
        setSubscription(subData as any);
      }

      // Load recent payments
      const { data: paymentsData } = await supabase
        .from("payments")
        .select("id, amount, status, created_at, paid_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (paymentsData) {
        setRecentPayments(paymentsData);
      }
    } catch (error) {
      console.error("Error loading subscription:", error);
    } finally {
      setLoading(false);
    }
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      active: "bg-green-100 text-green-800 border-green-200",
      cancelled: "bg-red-100 text-red-800 border-red-200",
      past_due: "bg-yellow-100 text-yellow-800 border-yellow-200",
    };

    const labels = {
      active: "✅ פעיל",
      cancelled: "❌ בוטל",
      past_due: "⚠️ איחור בתשלום",
    };

    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium border ${styles[status as keyof typeof styles] || styles.active}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  };

  const getDaysUntilNextBilling = () => {
    if (!subscription?.next_billing_date) return null;
    const next = new Date(subscription.next_billing_date);
    const now = new Date();
    const diff = Math.ceil((next.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  async function handleCancelSubscription() {
    if (!cancelReason.trim()) {
      alert("אנא הזן סיבה לביטול המנוי");
      return;
    }

    setCancelling(true);
    try {
      const res = await fetch("/api/user/cancel-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: cancelReason }),
      });

      const data = await res.json();

      if (data.success) {
        alert("✅ המנוי בוטל בהצלחה");
        setShowCancelConfirm(false);
        loadSubscriptionData(); // רענון הנתונים
      } else {
        alert("❌ שגיאה: " + data.error);
      }
    } catch (error) {
      console.error("Error cancelling subscription:", error);
      alert("❌ שגיאה בביטול מנוי");
    } finally {
      setCancelling(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-6" dir="rtl">
        <div className="max-w-6xl mx-auto flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-600">טוען פרטי מנוי...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-6" dir="rtl">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
            <div className="text-6xl mb-4">📋</div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">אין מנוי פעיל</h2>
            <p className="text-slate-600 mb-6">נראה שעדיין אין לך מנוי פעיל במערכת</p>
            <button
              onClick={() => router.push("/subscribe")}
              className="px-6 py-3 bg-gradient-to-l from-blue-600 to-cyan-600 text-white rounded-xl font-bold hover:from-blue-700 hover:to-cyan-700 transition-all shadow-lg"
            >
              בחר תוכנית והירשם
            </button>
          </div>
        </div>
      </div>
    );
  }

  const daysUntilBilling = getDaysUntilNextBilling();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-6" dir="rtl">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">📋 ניהול מנוי</h1>
          <p className="text-slate-600">כל המידע על המנוי והתוכנית שלך</p>
        </div>

        {/* Active Subscription Card */}
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl shadow-lg border-2 border-blue-200 p-8 mb-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold text-slate-900">
                  {subscription.plan?.name_he || subscription.plan?.name}
                </h2>
                {getStatusBadge(subscription.status)}
              </div>
              <p className="text-slate-600">
                {subscription.plan?.connection_type === "wifi" ? "חיבור Wi-Fi" : "חיבור SIM"}
              </p>
            </div>
            <div className="text-left">
              <div className="text-4xl font-bold text-blue-900">₪{subscription.plan?.monthly_price}</div>
              <div className="text-sm text-slate-600">לחודש</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl p-4">
              <div className="text-sm text-slate-600 mb-1">מצלמות</div>
              <div className="text-2xl font-bold text-slate-900">{subscription.plan?.camera_limit}</div>
            </div>
            <div className="bg-white rounded-xl p-4">
              <div className="text-sm text-slate-600 mb-1">ימי שמירה</div>
              <div className="text-2xl font-bold text-slate-900">{subscription.plan?.retention_days}</div>
            </div>
            <div className="bg-white rounded-xl p-4">
              <div className="text-sm text-slate-600 mb-1">סוג מנוי</div>
              <div className="text-lg font-bold text-slate-900">
                {subscription.billing_cycle === "monthly" ? "חודשי" : "שנתי"}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-slate-700">
            <Calendar className="w-4 h-4" />
            <span>
              תאריך הצטרפות: {new Date(subscription.created_at).toLocaleDateString("he-IL", {
                year: "numeric",
                month: "long",
                day: "numeric"
              })}
            </span>
          </div>
        </div>

        {/* Next Billing */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
              <CreditCard className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-slate-900 mb-2">החיוב הבא</h3>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <p className="text-slate-600">
                    {subscription.next_billing_date && (
                      <>
                        תאריך: {new Date(subscription.next_billing_date).toLocaleDateString("he-IL", {
                          year: "numeric",
                          month: "long",
                          day: "numeric"
                        })}
                      </>
                    )}
                  </p>
                  {daysUntilBilling !== null && daysUntilBilling > 0 && (
                    <p className="text-sm text-slate-500 mt-1">
                      בעוד {daysUntilBilling} ימים
                    </p>
                  )}
                  {daysUntilBilling !== null && daysUntilBilling < 0 && (
                    <p className="text-sm text-red-600 mt-1 font-medium">
                      ⚠️ איחור של {Math.abs(daysUntilBilling)} ימים
                    </p>
                  )}
                </div>
                <div className="text-2xl font-bold text-slate-900">
                  ₪{parseFloat(subscription.amount).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Payments */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4">חיובים אחרונים</h3>
          {recentPayments.length === 0 ? (
            <p className="text-slate-600 text-center py-8">אין חיובים להצגה</p>
          ) : (
            <div className="space-y-3">
              {recentPayments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
                  <div className="flex items-center gap-3">
                    {payment.status === "completed" ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : payment.status === "failed" ? (
                      <AlertCircle className="w-5 h-5 text-red-600" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-yellow-600" />
                    )}
                    <div>
                      <div className="font-medium text-slate-900">
                        {new Date(payment.created_at).toLocaleDateString("he-IL")}
                      </div>
                      <div className="text-sm text-slate-600">
                        {payment.status === "completed" ? "שולם בהצלחה" : 
                         payment.status === "failed" ? "נכשל" : "ממתין לתשלום"}
                      </div>
                    </div>
                  </div>
                  <div className="font-bold text-slate-900">₪{parseFloat(payment.amount).toLocaleString()}</div>
                </div>
              ))}
            </div>
          )}
          <button
            onClick={() => router.push("/dashboard/payments")}
            className="mt-4 w-full py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-medium"
          >
            צפה בכל התשלומים →
          </button>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => router.push("/subscribe")}
            className="flex items-center justify-center gap-3 p-6 bg-gradient-to-l from-green-600 to-emerald-600 text-white rounded-xl font-bold hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg"
          >
            <TrendingUp className="w-5 h-5" />
            שדרג תוכנית
          </button>
          <button
            onClick={() => setShowCancelConfirm(true)}
            className="flex items-center justify-center gap-3 p-6 bg-white border-2 border-red-200 text-red-600 rounded-xl font-bold hover:bg-red-50 transition-all"
          >
            <XCircle className="w-5 h-5" />
            בטל מנוי
          </button>
        </div>

        {/* Cancel Confirmation Modal */}
        {showCancelConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" dir="rtl">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
              <div className="text-center mb-6">
                <div className="text-6xl mb-4">😢</div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">בטל מנוי</h2>
                <p className="text-slate-600">
                  האם אתה בטוח שברצונך לבטל את המנוי? 
                </p>
                <p className="text-sm text-slate-500 mt-2">
                  המנוי יישאר פעיל עד תום תקופת החיוב הנוכחית
                </p>
              </div>

              {/* Cancellation Reason */}
              <div className="mb-6 text-right">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  מה הסיבה לביטול? (חובה)
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="לדוגמה: מצאתי פתרון חלופי, המחיר יקר מדי, לא מרוצה מהשירות..."
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                  rows={3}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowCancelConfirm(false);
                    setCancelReason("");
                  }}
                  disabled={cancelling}
                  className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-all disabled:opacity-50"
                >
                  ביטול
                </button>
                <button
                  onClick={handleCancelSubscription}
                  disabled={cancelling || !cancelReason.trim()}
                  className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {cancelling ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      <span>מבטל...</span>
                    </>
                  ) : (
                    "אישור ביטול"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Help Text */}
        <div className="mt-6 text-center text-sm text-slate-600">
          <p>שאלות לגבי המנוי? <button onClick={() => router.push("/dashboard/support")} className="text-blue-600 hover:underline font-medium">צור קשר עם התמיכה</button></p>
        </div>
      </div>
    </div>
  );
}

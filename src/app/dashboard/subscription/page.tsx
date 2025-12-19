"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Calendar, CreditCard, AlertCircle, CheckCircle, TrendingUp, XCircle, FileText, HelpCircle } from "lucide-react";

export const dynamic = 'force-dynamic';

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

  useEffect(() => {
    loadSubscriptionData();
  }, []);

  async function loadSubscriptionData() {
    try {
      const response = await fetch("/api/user/subscription");
      
      if (!response.ok) {
        if (response.status === 401) {
          router.push("/login");
          return;
        }
        throw new Error("Failed to fetch subscription");
      }

      const data = await response.json();
      
      if (data.success) {
        setSubscription(data.subscription);
        setRecentPayments(data.payments || []);
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
            <div className="text-6xl mb-4">📹</div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">צפייה חיה בלבד</h2>
            <p className="text-slate-600 mb-6">
              שילמת על המערכת (ציוד והתקנה) ויש לך גישה לצפייה חיה במצלמות
            </p>
            <p className="text-slate-500 text-sm mb-6">
              כרגע אין לך מנוי פעיל לשמירת הקלטות. רוצה להוסיף מנוי?
            </p>
            <button
              onClick={() => router.push("/subscribe")}
              className="px-6 py-3 bg-gradient-to-l from-blue-600 to-cyan-600 text-white rounded-xl font-bold hover:from-blue-700 hover:to-cyan-700 transition-all shadow-lg"
            >
              הוסף מנוי לשמירת הקלטות
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
          <h1 className="text-3xl font-bold text-slate-900 mb-2">📋 המנוי שלי</h1>
          <p className="text-slate-600">פרטי התוכנית והשירותים שלך</p>
        </div>

        {/* Active Subscription Card */}
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl shadow-lg border-2 border-blue-200 p-8 mb-6">
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-3">
              <h2 className="text-3xl font-bold text-slate-900">
                {subscription.plan?.name_he || subscription.plan?.name}
              </h2>
              {getStatusBadge(subscription.status)}
            </div>
            <p className="text-lg text-slate-700">
              {subscription.plan?.connection_type === "wifi" ? "🌐 חיבור Wi-Fi" : "📡 חיבור SIM"}
            </p>
          </div>

          {/* What's Included */}
          <div className="bg-white rounded-2xl p-6 mb-6 shadow-sm">
            <h3 className="text-xl font-bold text-slate-900 mb-4">✨ מה כלול בתוכנית?</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-xl">📹</span>
                </div>
                <div>
                  <div className="font-semibold text-slate-900">עד {subscription.plan?.camera_limit} מצלמות</div>
                  <div className="text-sm text-slate-600">ניטור וצפייה חיה בכל המצלמות במקביל</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-xl">💾</span>
                </div>
                <div>
                  <div className="font-semibold text-slate-900">שמירת הקלטות {subscription.plan?.retention_days} ימים</div>
                  <div className="text-sm text-slate-600">גישה מלאה להקלטות שנשמרו בענן</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-xl">🔄</span>
                </div>
                <div>
                  <div className="font-semibold text-slate-900">הקלטה רציפה 24/7</div>
                  <div className="text-sm text-slate-600">כל המצלמות מקליטות באופן אוטומטי ללא הפסקה</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-xl">☁️</span>
                </div>
                <div>
                  <div className="font-semibold text-slate-900">גיבוי בענן מאובטח</div>
                  <div className="text-sm text-slate-600">כל ההקלטות מגובות באופן אוטומטי</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-xl">📱</span>
                </div>
                <div>
                  <div className="font-semibold text-slate-900">גישה מכל מקום</div>
                  <div className="text-sm text-slate-600">צפייה מהמחשב, טאבלט או סמארטפון</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-4">
            <div className="flex items-center gap-2 text-sm text-slate-700">
              <Calendar className="w-4 h-4" />
              <span>
                מנוי פעיל מאז: {new Date(subscription.created_at).toLocaleDateString("he-IL", {
                  year: "numeric",
                  month: "long",
                  day: "numeric"
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Info Card */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
          <div className="flex items-start gap-3">
            <div className="text-2xl">ℹ️</div>
            <div>
              <h3 className="font-bold text-blue-900 mb-2">לגבי החיובים</h3>
              <p className="text-sm text-blue-800 leading-relaxed">
                החיוב החודשי מתבצע אוטומטית באמצעות הוראת קבע.
                כל החשבוניות והחיובים זמינים בלשונית "חשבוניות" בתפריט הצד.
              </p>
            </div>
          </div>
        </div>

        {/* Help Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4">צריך עזרה?</h3>
          <div className="space-y-3">
            <button
              onClick={() => router.push("/dashboard/invoices")}
              className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-slate-600" />
                <span className="font-medium text-slate-900">צפה בכל החשבוניות שלי</span>
              </div>
              <span className="text-slate-400">←</span>
            </button>
            <button
              onClick={() => router.push("/dashboard/support")}
              className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-3">
                <HelpCircle className="w-5 h-5 text-slate-600" />
                <span className="font-medium text-slate-900">פנה לתמיכה הטכנית</span>
              </div>
              <span className="text-slate-400">←</span>
            </button>
          </div>
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

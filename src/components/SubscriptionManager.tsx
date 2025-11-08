"use client";

import { useState, useEffect } from "react";
import { Calendar, CreditCard, Power, XCircle, CheckCircle, Loader2, AlertCircle, DollarSign } from "lucide-react";

interface Subscription {
  id: string;
  plan_id: string;
  status: string;
  amount: number;
  next_billing_date: string;
  started_at: string;
}

interface SubscriptionManagerProps {
  userId: string;
  userEmail: string;
  userName: string;
  userMonthlyPrice: number;
  userPlanId: string;
  userPlanName?: string;
}

export default function SubscriptionManager({
  userId,
  userEmail,
  userName,
  userMonthlyPrice,
  userPlanId,
  userPlanName,
}: SubscriptionManagerProps) {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);

  useEffect(() => {
    loadSubscription();
  }, [userId]);

  async function loadSubscription() {
    try {
      const res = await fetch(`/api/admin/get-subscription?userId=${userId}`);
      const data = await res.json();
      if (data.success && data.subscription) {
        setSubscription(data.subscription);
      }
    } catch (error) {
      console.error("Error loading subscription:", error);
    } finally {
      setLoading(false);
    }
  }

  async function activateSubscription() {
    if (!confirm(`האם להפעיל חיוב חודשי אוטומטי של ₪${userMonthlyPrice}?`)) {
      return;
    }

    setActivating(true);
    try {
      const res = await fetch("/api/admin/activate-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          planId: userPlanId,
          billingCycle: "monthly",
          userEmail,
          userName,
          customPrice: userMonthlyPrice, // שולח את המחיר המותאם אישית
        }),
      });

      const data = await res.json();

      if (data.success) {
        alert(`✅ חיוב חודשי אוטומטי הופעל!\n\nמחיר: ₪${userMonthlyPrice}/חודש\nחיוב ראשון: ${new Date(data.subscription.nextBillingDate).toLocaleDateString("he-IL")}`);
        loadSubscription();
      } else {
        alert("❌ שגיאה: " + data.error);
      }
    } catch (error) {
      console.error("Error activating subscription:", error);
      alert("❌ שגיאה בהפעלת חיוב אוטומטי");
    } finally {
      setActivating(false);
    }
  }

  async function cancelSubscription() {
    if (!confirm("❓ האם אתה בטוח שברצונך לבטל את החיוב האוטומטי?")) {
      return;
    }

    try {
      const res = await fetch("/api/admin/cancel-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId: subscription?.id }),
      });

      const data = await res.json();

      if (data.success) {
        alert("✅ החיוב האוטומטי בוטל");
        loadSubscription();
      } else {
        alert("❌ שגיאה: " + data.error);
      }
    } catch (error) {
      console.error("Error cancelling subscription:", error);
      alert("❌ שגיאה בביטול חיוב");
    }
  }

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; icon: any; label: string }> = {
      active: { bg: "bg-green-100", text: "text-green-800", icon: CheckCircle, label: "פעיל" },
      cancelled: { bg: "bg-red-100", text: "text-red-800", icon: XCircle, label: "מבוטל" },
      past_due: { bg: "bg-yellow-100", text: "text-yellow-800", icon: AlertCircle, label: "באיחור" },
    };

    const badge = badges[status] || badges.active;
    const Icon = badge.icon;

    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg ${badge.bg} ${badge.text} font-medium`}>
        <Icon size={16} />
        <span>{badge.label}</span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-8">
        <div className="flex items-center justify-center gap-3">
          <Loader2 className="animate-spin text-blue-600" size={24} />
          <span className="text-slate-600">טוען נתוני חיוב חודשי...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-6 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div className="text-right">
            <h3 className="text-xl font-bold text-slate-800 mb-1">🔄 חיוב חודשי אוטומטי</h3>
            <p className="text-slate-600 text-sm">תשלום חוזר עבור שירות הענן</p>
          </div>
          <CreditCard size={32} className="text-purple-600" />
        </div>
      </div>

      <div className="p-6">
        {subscription && subscription.status === "active" ? (
          /* מנוי פעיל */
          <div className="space-y-6">
            {/* סטטוס */}
            <div className="flex items-center justify-between">
              <div className="text-right">
                <div className="text-sm text-slate-600 mb-1">סטטוס חיוב</div>
                {getStatusBadge(subscription.status)}
              </div>
            </div>

            {/* פרטי חיוב */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green-50 rounded-xl p-5 text-right border border-green-200">
                <div className="flex items-center gap-2 justify-end mb-2">
                  <span className="text-sm text-slate-600">מחיר חודשי</span>
                  <DollarSign size={18} className="text-green-600" />
                </div>
                <div className="font-bold text-2xl text-green-800">₪{subscription.amount}</div>
                <div className="text-xs text-slate-500 mt-1">מדי חודש</div>
              </div>

              <div className="bg-purple-50 rounded-xl p-5 text-right border border-purple-200">
                <div className="flex items-center gap-2 justify-end mb-2">
                  <span className="text-sm text-slate-600">חיוב הבא</span>
                  <Calendar size={18} className="text-purple-600" />
                </div>
                <div className="font-bold text-lg text-purple-800">
                  {new Date(subscription.next_billing_date).toLocaleDateString("he-IL")}
                </div>
                <div className="text-xs text-slate-500 mt-1">תאריך</div>
              </div>
            </div>

            {/* תאריך הפעלה */}
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-200 text-right">
              <div className="flex items-center gap-2 justify-end mb-1">
                <span className="font-semibold text-slate-800">תאריך הפעלה</span>
                <CheckCircle size={18} className="text-blue-600" />
              </div>
              <div className="text-slate-700">
                {new Date(subscription.started_at).toLocaleDateString("he-IL")}
              </div>
            </div>

            {/* מידע נוסף */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-right">
              <div className="text-sm text-slate-600 mb-2">💡 החיוב מתבצע אוטומטית דרך Grow</div>
              <div className="text-xs text-slate-500">הלקוח יקבל הודעה לפני כל חיוב</div>
            </div>

            {/* כפתור ביטול */}
            <button
              onClick={cancelSubscription}
              className="w-full px-6 py-3 bg-red-100 text-red-700 rounded-xl hover:bg-red-200 transition-colors font-medium border-2 border-red-300 flex items-center justify-center gap-2"
            >
              <XCircle size={20} />
              <span>ביטול חיוב אוטומטי</span>
            </button>
          </div>
        ) : (
          /* אין מנוי פעיל */
          <div className="space-y-6">
            {/* פרטי החיוב המתוכנן */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border-2 border-blue-200">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <DollarSign size={32} className="text-blue-600" />
                </div>
                <h4 className="text-xl font-bold text-slate-800 mb-2">מחיר חודשי מוגדר</h4>
                <div className="text-4xl font-bold text-blue-700 mb-2">₪{userMonthlyPrice}</div>
                <div className="text-slate-600 mb-4">לחודש</div>
                
                {userPlanName && (
                  <div className="inline-block px-4 py-2 bg-white rounded-lg border border-blue-200 text-sm text-slate-700">
                    תוכנית: {userPlanName}
                  </div>
                )}
              </div>
            </div>

            {/* הסבר */}
            <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200 text-right">
              <div className="flex items-start gap-3">
                <AlertCircle size={20} className="text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-slate-700">
                  <p className="font-semibold mb-1">ℹ️ איך זה עובד?</p>
                  <ul className="space-y-1 text-xs">
                    <li>• הלקוח ישלם ₪{userMonthlyPrice} כל חודש</li>
                    <li>• החיוב הראשון יתבצע בעוד חודש מהיום</li>
                    <li>• החיוב אוטומטי דרך Grow Payment</li>
                    <li>• ניתן לבטל בכל עת</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* כפתור הפעלה */}
            <button
              onClick={activateSubscription}
              disabled={activating}
              className="w-full px-8 py-5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              {activating ? (
                <>
                  <Loader2 className="animate-spin" size={24} />
                  <span>מפעיל חיוב אוטומטי...</span>
                </>
              ) : (
                <>
                  <Power size={24} />
                  <span>הפעל חיוב חודשי אוטומטי</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

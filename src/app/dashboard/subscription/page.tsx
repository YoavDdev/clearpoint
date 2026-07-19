'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Calendar, CreditCard, Wifi, Smartphone, HardDrive, Clock, AlertCircle, Loader2, HeadphonesIcon } from 'lucide-react';

interface SubscriptionData {
  subscription: {
    status: 'none' | 'active' | 'suspended' | 'pending';
    is_active: boolean;
    is_valid: boolean;
    amount: number;
    currency: string;
    last_charge_date: string | null;
    next_charge_date: string | null;
    start_date: string | null;
    notes: string | null;
    payment_link: string | null;
  };
  plan: {
    id: string;
    name: string;
    name_he: string;
    monthly_price: number;
    retention_days: number;
    connection_type: string;
    camera_limit: number;
  } | null;
  has_active_subscription: boolean;
  has_pending_subscription: boolean;
}

export default function SubscriptionPage() {
  const [data, setData] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSubscription() {
      try {
        const res = await fetch('/api/user/subscription');
        const result = await res.json();
        if (result.success) {
          setData(result);
        }
      } catch (error) {
        console.error('Error loading subscription:', error);
      } finally {
        setLoading(false);
      }
    }

    loadSubscription();
  }, []);

  if (loading) {
    return (
      <div dir="rtl" className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
          <p className="text-slate-600 text-lg">טוען מידע על המנוי...</p>
        </div>
      </div>
    );
  }

  const sub = data?.subscription;
  const plan = data?.plan;
  const hasActive = data?.has_active_subscription || false;
  const isSuspended = sub?.status === 'suspended';
  const isPending = sub?.status === 'pending';

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">ניהול מנוי</h1>
          <p className="text-slate-600">צפה וניהל את פרטי המנוי שלך למערכת האבטחה</p>
        </div>

        {/* Suspended Warning */}
        {isSuspended && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <AlertCircle className="w-6 h-6 text-red-600" />
              <h3 className="text-lg font-bold text-red-800">התשלום נכשל</h3>
            </div>
            <p className="text-red-700 mb-4">
              החיוב החודשי האחרון נדחה. הגישה להקלטות מוגבלת עד לעדכון אמצעי התשלום.
            </p>
            <button
              onClick={() => window.location.href = '/dashboard/support'}
              className="px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors"
            >
              צור קשר לעדכון כרטיס
            </button>
          </div>
        )}

        {/* Pending Subscription - Waiting for card entry */}
        {isPending && sub?.payment_link && (
          <div className="bg-gradient-to-br from-amber-50 to-yellow-50 border-2 border-amber-300 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-gradient-to-br from-amber-500 to-orange-500">
                <CreditCard className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">הוראת קבע ממתינה להפעלה</h2>
                <p className="text-slate-600">נא להשלים את הרשמת כרטיס האשראי להפעלת המנוי</p>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 mb-4 border border-amber-200">
              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-amber-600" />
                <div>
                  <p className="text-sm text-slate-600">סכום חיוב חודשי</p>
                  <p className="font-bold text-slate-900 text-lg">₪{sub.amount}</p>
                </div>
              </div>
            </div>
            <a
              href={sub.payment_link}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-l from-green-600 to-emerald-600 text-white rounded-xl hover:scale-105 transition-all shadow-lg font-bold text-lg"
            >
              <CreditCard className="w-6 h-6" />
              <span>השלם הרשמה והפעל מנוי</span>
            </a>
          </div>
        )}

        {/* Subscription Status Card */}
        <div className={`rounded-2xl shadow-lg border overflow-hidden ${
          hasActive 
            ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200' 
            : isPending
              ? 'bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200'
              : 'bg-gradient-to-br from-orange-50 to-red-50 border-orange-200'
        }`}>
          <div className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                hasActive 
                  ? 'bg-gradient-to-br from-green-500 to-emerald-500' 
                  : isPending
                    ? 'bg-gradient-to-br from-amber-500 to-orange-500'
                    : 'bg-gradient-to-br from-orange-500 to-red-500'
              }`}>
                {hasActive ? (
                  <CheckCircle className="w-8 h-8 text-white" />
                ) : isPending ? (
                  <Clock className="w-8 h-8 text-white" />
                ) : (
                  <XCircle className="w-8 h-8 text-white" />
                )}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  {hasActive ? 'המנוי שלך פעיל' : isSuspended ? 'המנוי מושהה' : isPending ? 'ממתין להפעלה' : 'אין מנוי פעיל'}
                </h2>
                <p className="text-slate-600">
                  {hasActive 
                    ? 'המערכת זמינה לשימוש מלא' 
                    : isSuspended
                      ? 'נא לעדכן את אמצעי התשלום'
                      : isPending
                        ? 'השלם את הרשמת כרטיס האשראי למעלה'
                        : 'הפעל מנוי כדי לקבל גישה מלאה למערכת'}
                </p>
              </div>
            </div>

            {sub && sub.status !== 'none' && (
              <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-green-200/50">
                <div className="flex items-center gap-3">
                  <CreditCard className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm text-slate-600">מחיר חודשי</p>
                    <p className="font-bold text-slate-900">₪{sub.amount}</p>
                  </div>
                </div>
                {sub.next_charge_date && (
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="text-sm text-slate-600">חיוב הבא</p>
                      <p className="font-bold text-slate-900">
                        {new Date(sub.next_charge_date).toLocaleDateString('he-IL')}
                      </p>
                    </div>
                  </div>
                )}
                {sub.last_charge_date && (
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-slate-400" />
                    <div>
                      <p className="text-sm text-slate-600">חיוב אחרון</p>
                      <p className="font-bold text-slate-900">
                        {new Date(sub.last_charge_date).toLocaleDateString('he-IL')}
                      </p>
                    </div>
                  </div>
                )}
                {sub.start_date && (
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-slate-400" />
                    <div>
                      <p className="text-sm text-slate-600">תחילת מנוי</p>
                      <p className="font-bold text-slate-900">
                        {new Date(sub.start_date).toLocaleDateString('he-IL')}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Plan Details */}
        {plan && (
          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6">
            <h3 className="text-xl font-bold text-slate-900 mb-4">פרטי התוכנית</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-100">
                <div className="flex items-center gap-3 mb-2">
                  {plan.connection_type === 'sim' ? (
                    <Smartphone className="w-6 h-6 text-blue-600" />
                  ) : (
                    <Wifi className="w-6 h-6 text-blue-600" />
                  )}
                  <span className="font-bold text-slate-900">סוג חיבור</span>
                </div>
                <p className="text-slate-700">
                  {plan.connection_type === 'sim' ? 'אינטרנט סלולרי (SIM)' : 'חיבור Wi-Fi'}
                </p>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-100">
                <div className="flex items-center gap-3 mb-2">
                  <HardDrive className="w-6 h-6 text-purple-600" />
                  <span className="font-bold text-slate-900">ימי שמירה</span>
                </div>
                <p className="text-slate-700">{plan.retention_days} ימים</p>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100">
                <div className="flex items-center gap-3 mb-2">
                  <Clock className="w-6 h-6 text-green-600" />
                  <span className="font-bold text-slate-900">תוכנית</span>
                </div>
                <p className="text-slate-700">{plan.name_he || plan.name}</p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6">
          <div className="space-y-4">
            {hasActive && (
              <p className="text-sm text-slate-500 text-center">
                המנוי מתחדש אוטומטית בכל חודש
              </p>
            )}

            {!hasActive && !isSuspended && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                <p className="text-sm text-orange-800">
                  ללא מנוי פעיל, הגישה להקלטות מוגבלת. צור קשר עם התמיכה להפעלת מנוי.
                </p>
              </div>
            )}

            <button
              onClick={() => window.location.href = '/dashboard/support'}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors"
            >
              <HeadphonesIcon className="w-5 h-5" />
              <span>צור קשר לתמיכה</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Calendar, CreditCard, Wifi, Smartphone, HardDrive, Clock, AlertCircle, Loader2, HeadphonesIcon } from 'lucide-react';

interface Subscription {
  id: string;
  status: string;
  created_at: string;
  next_billing_date: string;
  plan: {
    name: string;
    price: number;
    connection_type: string;
    retention_days: number;
  };
}

export default function SubscriptionPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSubscription() {
      try {
        const res = await fetch('/api/user-cameras');
        const result = await res.json();
        
        if (result.success && result.subscription_active) {
          // TODO: צריך API ייעודי לשליפת פרטי מנוי מלאים
          // כרגע זה placeholder
          setSubscription({
            id: '1',
            status: result.subscription_status,
            created_at: new Date().toISOString(),
            next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            plan: {
              name: 'Basic',
              price: 199,
              connection_type: result.connection_type || 'wifi',
              retention_days: result.plan_duration_days || 14
            }
          });
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

  const hasActiveSubscription = subscription && subscription.status === 'active';

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">ניהול מנוי</h1>
          <p className="text-slate-600">צפה וניהל את פרטי המנוי שלך למערכת האבטחה</p>
        </div>

        {/* Subscription Status Card */}
        <div className={`rounded-2xl shadow-lg border overflow-hidden ${
          hasActiveSubscription 
            ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200' 
            : 'bg-gradient-to-br from-orange-50 to-red-50 border-orange-200'
        }`}>
          <div className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                hasActiveSubscription 
                  ? 'bg-gradient-to-br from-green-500 to-emerald-500' 
                  : 'bg-gradient-to-br from-orange-500 to-red-500'
              }`}>
                {hasActiveSubscription ? (
                  <CheckCircle className="w-8 h-8 text-white" />
                ) : (
                  <XCircle className="w-8 h-8 text-white" />
                )}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  {hasActiveSubscription ? 'המנוי שלך פעיל' : 'אין מנוי פעיל'}
                </h2>
                <p className="text-slate-600">
                  {hasActiveSubscription 
                    ? 'המערכת זמינה לשימוש מלא' 
                    : 'הפעל מנוי כדי לקבל גישה מלאה למערכת'}
                </p>
              </div>
            </div>

            {hasActiveSubscription && subscription && (
              <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-green-200">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm text-slate-600">תאריך חידוש</p>
                    <p className="font-bold text-slate-900">
                      {new Date(subscription.next_billing_date).toLocaleDateString('he-IL')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <CreditCard className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm text-slate-600">מחיר חודשי</p>
                    <p className="font-bold text-slate-900">₪{subscription.plan.price}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Plan Details */}
        {hasActiveSubscription && subscription && (
          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6">
            <h3 className="text-xl font-bold text-slate-900 mb-4">פרטי התוכנית</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-100">
                <div className="flex items-center gap-3 mb-2">
                  {subscription.plan.connection_type === 'sim' ? (
                    <Smartphone className="w-6 h-6 text-blue-600" />
                  ) : (
                    <Wifi className="w-6 h-6 text-blue-600" />
                  )}
                  <span className="font-bold text-slate-900">סוג חיבור</span>
                </div>
                <p className="text-slate-700">
                  {subscription.plan.connection_type === 'sim' ? 'אינטרנט סלולרי (SIM)' : 'חיבור Wi-Fi'}
                </p>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-100">
                <div className="flex items-center gap-3 mb-2">
                  <HardDrive className="w-6 h-6 text-purple-600" />
                  <span className="font-bold text-slate-900">ימי שמירה</span>
                </div>
                <p className="text-slate-700">{subscription.plan.retention_days} ימים</p>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100">
                <div className="flex items-center gap-3 mb-2">
                  <Clock className="w-6 h-6 text-green-600" />
                  <span className="font-bold text-slate-900">תוכנית</span>
                </div>
                <p className="text-slate-700">{subscription.plan.name}</p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6">
          <div className="space-y-4">
            {hasActiveSubscription ? (
              <>
                <button
                  onClick={() => alert('חידוש מנוי - TODO: אינטגרציה עם מערכת התשלומים')}
                  className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-l from-blue-600 to-cyan-600 text-white rounded-xl font-bold text-lg hover:scale-105 transition-all shadow-lg"
                >
                  <CreditCard className="w-6 h-6" />
                  <span>חדש מנוי</span>
                </button>
                <p className="text-sm text-slate-500 text-center">
                  המנוי יתחדש אוטומטית בתאריך החידוש
                </p>
              </>
            ) : (
              <>
                <button
                  onClick={() => alert('הפעלת מנוי - TODO: אינטגרציה עם מערכת התשלומים')}
                  className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-l from-orange-600 to-red-600 text-white rounded-xl font-bold text-lg hover:scale-105 transition-all shadow-lg"
                >
                  <AlertCircle className="w-6 h-6" />
                  <span>הפעל מנוי עכשיו</span>
                </button>
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                  <p className="text-sm text-orange-800">
                    ללא מנוי פעיל, הגישה להקלטות מוגבלת. חדש את המנוי כדי לקבל גישה מלאה למערכת.
                  </p>
                </div>
              </>
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

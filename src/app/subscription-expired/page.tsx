"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, XCircle, CheckCircle, CreditCard, Building2, AlertCircle } from "lucide-react";

export default function SubscriptionExpiredPage() {
  const router = useRouter();
  const [subscriptionInfo, setSubscriptionInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSubscriptionInfo();
  }, []);

  async function loadSubscriptionInfo() {
    try {
      const response = await fetch("/api/user/subscription-status");
      if (response.ok) {
        const data = await response.json();
        setSubscriptionInfo(data);
        
        // אם יש גישה, הפנה חזרה לדשבורד
        if (data.hasAccess) {
          router.push("/dashboard");
        }
      }
    } catch (error) {
      console.error("Error loading subscription:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">טוען...</p>
        </div>
      </div>
    );
  }

  const reason = subscriptionInfo?.reason;
  const subscription = subscriptionInfo?.subscription;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100" dir="rtl">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-4">
              <XCircle className="w-10 h-10 text-red-600" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              {reason === 'expired' ? 'המנוי שלך פג תוקף' : 'אין גישה למערכת'}
            </h1>
            <p className="text-slate-600">
              {getReasonMessage(reason)}
            </p>
          </div>

          {/* Status Card */}
          <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
            <div className="space-y-6">
              {/* Subscription Details */}
              {subscription && (
                <>
                  <div className="flex items-start gap-4 pb-6 border-b border-slate-200">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-slate-900 mb-2">
                        פרטי המנוי
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-600">תוכנית:</span>
                          <span className="font-medium">{subscription.planName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">סטטוס:</span>
                          <span className={`font-medium ${
                            subscription.status === 'active' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {getStatusText(subscription.status)}
                          </span>
                        </div>
                        {subscription.lastPaymentDate && (
                          <div className="flex justify-between">
                            <span className="text-slate-600">תשלום אחרון:</span>
                            <span className="font-medium">
                              {new Date(subscription.lastPaymentDate).toLocaleDateString('he-IL')}
                            </span>
                          </div>
                        )}
                        {subscription.gracePeriodEnd && (
                          <div className="flex justify-between">
                            <span className="text-slate-600">גישה עד:</span>
                            <span className="font-medium text-orange-600">
                              {new Date(subscription.gracePeriodEnd).toLocaleDateString('he-IL')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Payment Failures */}
                  {subscription.paymentFailures > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-semibold text-red-900 mb-1">
                            כשלון בחיוב
                          </h4>
                          <p className="text-sm text-red-700">
                            היו {subscription.paymentFailures} ניסיונות חיוב כושלים. 
                            אנא וודא שיש יתרה מספקת בכרטיס האשראי או בחשבון הבנק.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Renewal Options */}
              <div className="pt-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">
                  איך לחדש את המנוי?
                </h3>
                
                <div className="space-y-4">
                  {/* Option 1: Contact Admin */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-blue-900 mb-1">
                          צור קשר לחידוש מנוי
                        </h4>
                        <p className="text-sm text-blue-700 mb-3">
                          פנה אלינו וניצור עבורך הוראת קבע חדשה (כרטיס אשראי או הוראת קבע בנקאית)
                        </p>
                        <button
                          onClick={() => router.push("/dashboard/support")}
                          className="text-sm font-medium text-blue-700 hover:text-blue-800 underline"
                        >
                          פתח פנייה לתמיכה
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Option 2: Payment Methods */}
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                    <h4 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                      <CreditCard className="w-5 h-5" />
                      שיטות תשלום זמינות
                    </h4>
                    <ul className="space-y-2 text-sm text-slate-700">
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                        <span>הוראת קבע בכרטיס אשראי (ויזה, מאסטרקארד, ישראכרט)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                        <span>הוראת קבע בנקאית דרך הבנק שלך</span>
                      </li>
                    </ul>
                  </div>

                  {/* Important Note */}
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Calendar className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-amber-900 mb-1">
                          חשוב לדעת
                        </h4>
                        <p className="text-sm text-amber-700">
                          חידוש מנוי נעשה בתוך 1-2 ימי עסקים. 
                          לאחר יצירת הוראת הקבע החדשה, הגישה למערכת תופעל אוטומטית.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-6 border-t border-slate-200">
                <button
                  onClick={() => router.push("/dashboard/support")}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  צור קשר לחידוש
                </button>
                <button
                  onClick={() => router.push("/dashboard/subscription")}
                  className="px-6 py-3 border border-slate-300 hover:bg-slate-50 rounded-lg font-medium transition-colors"
                >
                  חזרה לדף המנוי
                </button>
              </div>
            </div>
          </div>

          {/* FAQ */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              שאלות נפוצות
            </h3>
            <div className="space-y-4 text-sm">
              <div>
                <h4 className="font-medium text-slate-900 mb-1">
                  למה המנוי שלי בוטל?
                </h4>
                <p className="text-slate-600">
                  המנוי יכול להתבטל עקב כשלון בחיוב (חוסר יתרה, כרטיס פג תוקף) או ביטול ידני שביקשת.
                </p>
              </div>
              <div>
                <h4 className="font-medium text-slate-900 mb-1">
                  האם אני מקבל החזר כספי?
                </h4>
                <p className="text-slate-600">
                  אם ביטלת את המנוי, הגישה שלך תמשיך עד סוף התקופה ששולמה. לא ניתן החזר כספי עבור ימים שלא נוצלו.
                </p>
              </div>
              <div>
                <h4 className="font-medium text-slate-900 mb-1">
                  כמה זמן לוקח לחדש מנוי?
                </h4>
                <p className="text-slate-600">
                  לאחר יצירת הוראת קבע חדשה, המערכת תזהה אותה תוך 1-2 ימי עסקים והגישה תופעל אוטומטית.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getReasonMessage(reason: string): string {
  switch (reason) {
    case 'no_subscription':
      return 'לא נמצא מנוי פעיל עבור החשבון שלך';
    case 'expired':
      return 'תקופת המנוי הסתיימה. חדש את המנוי כדי להמשיך להשתמש במערכת';
    case 'payment_failed':
      return 'החיוב האחרון נכשל. אנא עדכן את פרטי התשלום';
    case 'grace_period':
      return 'המנוי בוטל אך עדיין יש לך גישה עד סוף התקופה ששולמה';
    default:
      return 'אין לך גישה למערכת כרגע';
  }
}

function getStatusText(status: string): string {
  switch (status) {
    case 'active':
      return 'פעיל';
    case 'cancelled':
      return 'מבוטל';
    case 'suspended':
      return 'מושעה';
    case 'expired':
      return 'פג תוקף';
    default:
      return status;
  }
}

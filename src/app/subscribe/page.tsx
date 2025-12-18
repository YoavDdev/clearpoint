"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

export const dynamic = 'force-dynamic';

export default function SubscribeFormPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState(""); // ✅ new
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [selectedPlan, setSelectedPlan] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [supabase, setSupabase] = useState<any>(null);

  useEffect(() => {
    setSupabase(createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    ));
  }, []);

  // טעינת תוכניות מהטבלה - רק תוכניות פעילות ללקוחות
  useEffect(() => {
    if (!supabase) return;
    async function loadPlans() {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .eq('is_active', true) // רק תוכניות פעילות
        .order('monthly_price', { ascending: true });
      
      if (data && !error) {
        setPlans(data);
      }
      setLoading(false);
    }
    loadPlans();
  }, [supabase]);

  useEffect(() => {
    const plan = searchParams.get("plan");
    if (plan) {
      setSelectedPlan(plan);
    }
  }, [searchParams]);

  const handleShowConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) {
      setError("אנא בחר תוכנית");
      return;
    }
    setError("");
    setShowConfirm(true);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");

    const currentPlan = plans.find(p => p.id === selectedPlan);
    
    const { error: insertError } = await supabase.from("subscription_requests").insert({
      full_name: fullName,
      email,
      phone,
      address,
      preferred_date: preferredDate,
      selected_plan: currentPlan ? `${currentPlan.name_he} - ₪${currentPlan.setup_price} התקנה + ₪${currentPlan.monthly_price}/חודש` : selectedPlan,
      admin_notes: notes || null,
    });

    setSubmitting(false);

    if (!insertError) {
      router.push("/thanks");
    } else {
      setError("אירעה שגיאה בשליחת הבקשה. אנא נסה שוב או צור קשר טלפוני.");
      setShowConfirm(false);
    }
  };

  const currentPlan = plans.find(p => p.id === selectedPlan);

  if (loading) {
    return (
      <div dir="rtl" className="min-h-screen bg-gradient-to-b from-slate-50 to-white pt-28 pb-12 px-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">טוען תוכניות...</p>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-b from-slate-50 to-white pt-28 pb-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">
            בקשה להתקנת מערכת Clearpoint
          </h1>
          <p className="text-slate-600">
            מלא את הפרטים ונחזור אליך בהקדם לתיאום התקנה
          </p>
        </div>

        {/* Plan Selection or Summary */}
        {!selectedPlan ? (
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-8 border border-slate-100">
            <h2 className="text-xl font-bold text-slate-900 mb-6 text-center">בחר תוכנית</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {plans.map((plan, index) => {
                const isPopular = plan.monthly_price === 149; // Wi-Fi Cloud הכי פופולרי
                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setSelectedPlan(plan.id)}
                    className={`relative p-6 border-2 rounded-xl hover:shadow-lg transition-all text-right ${
                      isPopular 
                        ? 'border-blue-400 hover:border-blue-600 bg-blue-50' 
                        : 'border-orange-200 hover:border-orange-500'
                    }`}
                  >
                    {isPopular && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <span className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-4 py-1 rounded-full text-xs font-bold shadow-lg">
                          🔥 הכי פופולרי
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xl font-bold text-slate-900">{plan.name_he || plan.name}</h3>
                      <div className={`text-2xl font-bold ${isPopular ? 'text-blue-600' : 'text-orange-600'}`}>
                        ₪{plan.monthly_price}/חודש
                      </div>
                    </div>
                    <div className="text-sm text-slate-600 mb-3">
                      התקנה חד-פעמית: <span className="font-bold text-slate-900">₪{plan.setup_price?.toLocaleString()}</span>
                    </div>
                    {plan.description_he && (
                      <p className="text-xs text-slate-700 mb-3 leading-relaxed">{plan.description_he}</p>
                    )}
                    <div className="mt-4 pt-4 border-t border-slate-200">
                      <div className="text-xs text-slate-600 space-y-1">
                        <div>✅ {plan.camera_limit} מצלמות HD</div>
                        {plan.connection_type === 'wifi_cloud' && <div>✅ Mini PC חכם</div>}
                        {plan.connection_type === 'sim' && <div>✅ Mini PC + ראוטר SIM</div>}
                        {plan.data_allowance_gb && <div>✅ חבילת {plan.data_allowance_gb}GB גלישה</div>}
                        {!plan.data_allowance_gb && <div>✅ חיבור Wi-Fi קיים</div>}
                        <div>✅ צפייה חיה + הקלטות</div>
                        <div>✅ {plan.retention_days} ימי שמירה בענן</div>
                        <div>✅ התקנה מלאה + הדרכה</div>
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className={`w-full py-2 rounded-lg font-bold text-white ${
                        isPopular ? 'bg-blue-600' : 'bg-orange-600'
                      }`}>
                        בקש התקנה עכשיו
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-6 mb-8 border border-blue-100">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-slate-900 mb-2">{currentPlan?.name_he || currentPlan?.name}</h3>
              <p className="text-slate-600 text-sm mb-4">{currentPlan?.description_he}</p>
              <div className="flex justify-center gap-6">
                <div className="bg-white rounded-xl px-6 py-3 shadow-sm">
                  <div className="text-xs text-slate-600 mb-1">התקנה חד-פעמית</div>
                  <div className="text-2xl font-bold text-blue-600">₪{currentPlan?.setup_price?.toLocaleString() || '0'}</div>
                </div>
                <div className="bg-white rounded-xl px-6 py-3 shadow-sm">
                  <div className="text-xs text-slate-600 mb-1">מנוי חודשי</div>
                  <div className="text-2xl font-bold text-green-600">₪{currentPlan?.monthly_price || '0'}/חודש</div>
                </div>
              </div>
              <div className="mt-4 text-sm text-slate-600">
                ✅ עד {currentPlan?.camera_limit || 4} מצלמות • ✅ {currentPlan?.retention_days || 14} ימי שמירה בענן • ✅ התקנה מלאה
              </div>
              <button
                type="button"
                onClick={() => setSelectedPlan("")}
                className="mt-4 text-sm text-blue-600 hover:text-blue-700 underline"
              >
                שנה תוכנית
              </button>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-6">
            <p className="text-red-700 font-medium text-center">{error}</p>
          </div>
        )}

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
          <h2 className="text-xl font-bold text-slate-900 mb-6">פרטי ההתקנה</h2>
          <form onSubmit={handleShowConfirm} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                שם מלא *
              </label>
              <input
                required
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="הכנס שם מלא"
                className="w-full border border-slate-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                אימייל *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
                className="w-full border border-slate-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                טלפון *
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="05X-XXX-XXXX"
                className="w-full border border-slate-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                כתובת מלאה להתקנה *
              </label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="רחוב, מספר בית, עיר"
                className="w-full border border-slate-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                תאריך מועדף להתקנה (אופציונלי)
              </label>
              <input
                type="date"
                value={preferredDate}
                onChange={(e) => setPreferredDate(e.target.value)}
                className="w-full border border-slate-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                הערות מיוחדות (אופציונלי)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="למשל: קירות בטון, מרחקים גדולים, דרישות מיוחדות..."
                className="w-full border border-slate-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
              />
            </div>

            <button
              type="submit"
              disabled={submitting || !selectedPlan}
              className="w-full py-4 bg-gradient-to-l from-blue-600 to-cyan-600 text-white rounded-xl font-bold hover:from-blue-700 hover:to-cyan-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              המשך לאישור
            </button>
          </form>
        </div>

        {/* Confirmation Modal */}
        {showConfirm && currentPlan && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" dir="rtl">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8 max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold text-slate-900 mb-6 text-center">
                ✅ אישור פרטי הבקשה
              </h2>

              <div className="space-y-4 mb-8">
                {/* Plan */}
                <div className="bg-blue-50 rounded-xl p-4">
                  <div className="text-sm text-slate-600 mb-1">תוכנית שנבחרה</div>
                  <div className="text-lg font-bold text-slate-900">{currentPlan?.name_he || currentPlan?.name || 'לא נבחרה'}</div>
                  <div className="text-sm text-slate-600 mt-2">
                    💰 התקנה: ₪{currentPlan?.setup_price?.toLocaleString() || '0'} + חודשי: ₪{currentPlan?.monthly_price || '0'}
                  </div>
                </div>

                {/* Personal Info */}
                <div className="border border-slate-200 rounded-xl p-4 space-y-2">
                  <div><span className="text-slate-600">שם:</span> <span className="font-medium">{fullName}</span></div>
                  <div><span className="text-slate-600">אימייל:</span> <span className="font-medium">{email}</span></div>
                  <div><span className="text-slate-600">טלפון:</span> <span className="font-medium">{phone}</span></div>
                  <div><span className="text-slate-600">כתובת:</span> <span className="font-medium">{address}</span></div>
                  {preferredDate && (
                    <div><span className="text-slate-600">תאריך מועדף:</span> <span className="font-medium">{new Date(preferredDate).toLocaleDateString('he-IL')}</span></div>
                  )}
                  {notes && (
                    <div><span className="text-slate-600">הערות:</span> <span className="font-medium">{notes}</span></div>
                  )}
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
                <p className="text-sm text-yellow-800 text-center">
                  💡 <strong>שים לב:</strong> לאחר שליחת הבקשה, נציג מטעמנו יצור איתך קשר תוך 24 שעות לתיאום התקנה ותשלום.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  disabled={submitting}
                  className="flex-1 py-3 border-2 border-slate-300 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-all disabled:opacity-50"
                >
                  חזור לעריכה
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-1 py-3 bg-gradient-to-l from-green-600 to-emerald-600 text-white rounded-xl font-bold hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg disabled:opacity-50"
                >
                  {submitting ? "שולח..." : "✅ אשר ושלח"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer Note */}
        <div className="mt-6 text-center text-sm text-slate-600">
          <p>📞 שאלות? צרו קשר: 054-813-2603</p>
          <p className="mt-2">נחזור אליכם תוך 24 שעות לתיאום ההתקנה</p>
        </div>
      </div>
    </div>
  );
}

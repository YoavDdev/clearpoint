"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

// Supabase client setup
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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
  
  // Plan details
  const planDetails = {
    "wifi-cloud": {
      name: "Wi-Fi Cloud",
      setupPrice: 2990,
      monthlyPrice: 149,
      description: "חיבור לאינטרנט קיים של הלקוח"
    },
    "sim-cloud": {
      name: "SIM Cloud",
      setupPrice: 3290,
      monthlyPrice: 189,
      description: "כולל ראוטר SIM + 500GB גלישה"
    }
  };

  useEffect(() => {
    const plan = searchParams.get("plan");
    if (plan && (plan === "wifi-cloud" || plan === "sim-cloud")) {
      setSelectedPlan(plan);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const planInfo = selectedPlan ? planDetails[selectedPlan as keyof typeof planDetails] : null;
    
    const { error } = await supabase.from("subscription_requests").insert({
      full_name: fullName,
      email,
      phone,
      address,
      preferred_date: preferredDate,
      selected_plan: planInfo ? `${planInfo.name} - ₪${planInfo.setupPrice} התקנה + ₪${planInfo.monthlyPrice}/חודש` : selectedPlan,
      admin_notes: notes || null,
    });

    setSubmitting(false);

    if (!error) {
      router.push("/thanks");
    } else {
      alert("אירעה שגיאה. נסה שוב.");
    }
  };

  const currentPlan = selectedPlan ? planDetails[selectedPlan as keyof typeof planDetails] : null;

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
              {/* Wi-Fi Cloud */}
              <button
                type="button"
                onClick={() => setSelectedPlan("wifi-cloud")}
                className="p-6 border-2 border-blue-200 rounded-xl hover:border-blue-500 hover:shadow-lg transition-all text-right"
              >
                <h3 className="text-xl font-bold text-slate-900 mb-2">Wi-Fi Cloud</h3>
                <p className="text-sm text-slate-600 mb-3">חיבור לאינטרנט קיים של הלקוח</p>
                <div className="flex gap-4 mb-3">
                  <div>
                    <div className="text-xs text-slate-600">התקנה</div>
                    <div className="text-lg font-bold text-blue-600">₪2,990</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-600">חודשי</div>
                    <div className="text-lg font-bold text-green-600">₪149</div>
                  </div>
                </div>
                <div className="text-xs text-slate-600">✅ 4 מצלמות • 14 ימים בענן</div>
              </button>
              
              {/* SIM Cloud */}
              <button
                type="button"
                onClick={() => setSelectedPlan("sim-cloud")}
                className="p-6 border-2 border-orange-200 rounded-xl hover:border-orange-500 hover:shadow-lg transition-all text-right"
              >
                <h3 className="text-xl font-bold text-slate-900 mb-2">SIM Cloud</h3>
                <p className="text-sm text-slate-600 mb-3">כולל ראוטר SIM + 500GB גלישה</p>
                <div className="flex gap-4 mb-3">
                  <div>
                    <div className="text-xs text-slate-600">התקנה</div>
                    <div className="text-lg font-bold text-orange-600">₪3,290</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-600">חודשי</div>
                    <div className="text-lg font-bold text-green-600">₪189</div>
                  </div>
                </div>
                <div className="text-xs text-slate-600">✅ 4 מצלמות • 14 ימים בענן</div>
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-6 mb-8 border border-blue-100">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-slate-900 mb-2">{currentPlan?.name}</h3>
              <p className="text-slate-600 text-sm mb-4">{currentPlan?.description}</p>
              <div className="flex justify-center gap-6">
                <div className="bg-white rounded-xl px-6 py-3 shadow-sm">
                  <div className="text-xs text-slate-600 mb-1">התקנה חד-פעמית</div>
                  <div className="text-2xl font-bold text-blue-600">₪{currentPlan?.setupPrice.toLocaleString()}</div>
                </div>
                <div className="bg-white rounded-xl px-6 py-3 shadow-sm">
                  <div className="text-xs text-slate-600 mb-1">מנוי חודשי</div>
                  <div className="text-2xl font-bold text-green-600">₪{currentPlan?.monthlyPrice}/חודש</div>
                </div>
              </div>
              <div className="mt-4 text-sm text-slate-600">
                ✅ 4 מצלמות HD • ✅ Mini PC חכם • ✅ 14 ימי שמירה בענן • ✅ התקנה מלאה
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

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
          <h2 className="text-xl font-bold text-slate-900 mb-6">פרטי ההתקנה</h2>
          <form onSubmit={handleSubmit} className="space-y-5">
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
              disabled={submitting}
              className="w-full py-4 bg-gradient-to-l from-blue-600 to-cyan-600 text-white rounded-xl font-bold hover:from-blue-700 hover:to-cyan-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "שולח..." : "שלח בקשה להתקנה"}
            </button>
          </form>
        </div>

        {/* Footer Note */}
        <div className="mt-6 text-center text-sm text-slate-600">
          <p>📞 שאלות? צרו קשר: 054-813-2603</p>
          <p className="mt-2">נחזור אליכם תוך 24 שעות לתיאום ההתקנה</p>
        </div>
      </div>
    </div>
  );
}

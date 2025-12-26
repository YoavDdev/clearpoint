"use client";

import { useRouter } from "next/navigation";
import { XCircle, Mail, Phone } from "lucide-react";

export default function NoSubscriptionPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-6 flex items-center justify-center" dir="rtl">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-2xl shadow-xl border border-red-200 p-12 text-center">
          <div className="text-8xl mb-6">🚫</div>
          
          <h1 className="text-3xl font-bold text-slate-900 mb-4">
            אין מנוי פעיל
          </h1>
          
          <p className="text-lg text-slate-600 mb-8">
            כרגע אין לך מנוי פעיל למערכת Clearpoint Security.
            <br />
            כדי להמשיך להשתמש במערכת, אנא צור קשר עם התמיכה.
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8 text-right">
            <h3 className="font-bold text-blue-900 mb-3 text-lg">💡 למה אני רואה את זה?</h3>
            <ul className="space-y-2 text-sm text-blue-800">
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>המנוי שלך הסתיים או בוטל</span>
              </li>
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>החיוב החודשי האחרון נכשל</span>
              </li>
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>הוראת הקבע בוטלה</span>
              </li>
            </ul>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-8">
            <a
              href="mailto:support@clearpoint.co.il"
              className="flex items-center justify-center gap-3 p-4 bg-gradient-to-l from-blue-600 to-cyan-600 text-white rounded-xl font-bold hover:scale-105 transition-all shadow-lg"
            >
              <Mail className="w-5 h-5" />
              <span>שלח מייל לתמיכה</span>
            </a>
            
            <a
              href="tel:+972-XX-XXX-XXXX"
              className="flex items-center justify-center gap-3 p-4 bg-gradient-to-l from-green-600 to-emerald-600 text-white rounded-xl font-bold hover:scale-105 transition-all shadow-lg"
            >
              <Phone className="w-5 h-5" />
              <span>התקשר לתמיכה</span>
            </a>
          </div>

          <button
            onClick={() => router.push("/")}
            className="text-slate-600 hover:text-slate-900 font-medium text-sm"
          >
            ← חזור לדף הבית
          </button>
        </div>
      </div>
    </div>
  );
}

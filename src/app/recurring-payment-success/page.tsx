'use client';

import { CheckCircle, CreditCard, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function RecurringPaymentSuccessPage() {
  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-6">
      <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl border border-green-100 p-8 text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>

        <h1 className="text-3xl font-bold text-slate-900 mb-3">
          הוראת הקבע הופעלה בהצלחה!
        </h1>

        <p className="text-slate-600 text-lg mb-6">
          פרטי הכרטיס נשמרו והחיוב החודשי יתבצע אוטומטית.
        </p>

        <div className="bg-green-50 rounded-xl p-4 mb-8 border border-green-200">
          <div className="flex items-center justify-center gap-2 text-green-700">
            <CreditCard className="w-5 h-5" />
            <span className="font-medium">המנוי שלך פעיל</span>
          </div>
          <p className="text-green-600 text-sm mt-1">
            תקבל/י קבלה במייל לאחר כל חיוב חודשי
          </p>
        </div>

        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
        >
          <ArrowLeft className="w-5 h-5" />
          חזרה לדשבורד
        </Link>
      </div>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { XCircle, Home, RotateCcw } from 'lucide-react';

export default function PaymentCancelledPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full">
        {/* Cancel Icon */}
        <div className="flex justify-center mb-6">
          <div className="bg-gradient-to-br from-red-500 to-orange-500 rounded-full p-6">
            <XCircle className="w-16 h-16 text-white" />
          </div>
        </div>

        {/* Cancel Message */}
        <h1 className="text-3xl font-bold text-center text-slate-900 mb-2">
          התשלום בוטל
        </h1>
        <p className="text-center text-slate-600 mb-8">
          התשלום לא הושלם. לא חויבת בכרטיס האשראי שלך.
        </p>

        {/* Info Box */}
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6">
          <p className="text-sm text-orange-800 text-center">
            💡 אם נתקלת בבעיה או שיש לך שאלות,
            <br />
            אנחנו כאן כדי לעזור!
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <Link 
            href="/dashboard"
            className="flex-1 bg-gradient-to-l from-slate-600 to-slate-700 text-white px-6 py-3 rounded-xl font-bold hover:scale-105 transition-all shadow-lg flex items-center justify-center gap-2"
          >
            <Home className="w-5 h-5" />
            חזרה לדשבורד
          </Link>
          
          <button
            onClick={() => window.history.back()}
            className="flex-1 bg-gradient-to-l from-blue-600 to-cyan-600 text-white px-6 py-3 rounded-xl font-bold hover:scale-105 transition-all shadow-lg flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-5 h-5" />
            נסה שוב
          </button>
        </div>

        {/* Support Link */}
        <div className="mt-6 text-center">
          <Link 
            href="/dashboard/support"
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            צריך עזרה? צור קשר עם התמיכה →
          </Link>
        </div>
      </div>
    </div>
  );
}

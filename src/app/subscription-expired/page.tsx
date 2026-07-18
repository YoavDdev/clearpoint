'use client';

import { AlertCircle, CreditCard, HeadphonesIcon } from 'lucide-react';

export default function SubscriptionExpiredPage() {
  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-lg w-full space-y-6">
        {/* Warning Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-red-200 overflow-hidden">
          <div className="bg-gradient-to-r from-red-500 to-orange-500 p-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">המנוי אינו פעיל</h1>
                <p className="text-white/80 text-sm">הגישה למערכת המצלמות מוגבלת</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <p className="text-slate-700 leading-relaxed">
              החיוב החודשי האחרון נכשל או שאין מנוי פעיל במערכת.
              כדי לחדש את הגישה למצלמות ולהקלטות, נא לעדכן את אמצעי התשלום.
            </p>

            <div className="space-y-3">
              <button
                onClick={() => window.location.href = '/dashboard/subscription'}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
              >
                <CreditCard className="w-5 h-5" />
                <span>צפה בפרטי המנוי</span>
              </button>

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
    </div>
  );
}

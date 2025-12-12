'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, Home, CreditCard } from 'lucide-react';
import { Suspense } from 'react';

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  
  const transactionUid = searchParams.get('transaction_uid');
  const amount = searchParams.get('amount');
  const approvalNum = searchParams.get('approval_num');
  const voucherNum = searchParams.get('voucher_num');
  const date = searchParams.get('date');
  const fourDigits = searchParams.get('four_digits');
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full">
        {/* Success Icon */}
        <div className="flex justify-center mb-6">
          <div className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-full p-6">
            <CheckCircle className="w-16 h-16 text-white" />
          </div>
        </div>

        {/* Success Message */}
        <h1 className="text-3xl font-bold text-center text-slate-900 mb-2">
          התשלום בוצע בהצלחה! 🎉
        </h1>
        <p className="text-center text-slate-600 mb-8">
          תודה רבה! התשלום שלך התקבל ועובד.
        </p>

        {/* Transaction Details */}
        <div className="bg-slate-50 rounded-xl p-6 mb-6 space-y-4">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            פרטי העסקה
          </h2>
          
          {amount && (
            <div className="flex justify-between items-center py-2 border-b border-slate-200">
              <span className="text-slate-600">סכום:</span>
              <span className="text-2xl font-bold text-green-600">₪{amount}</span>
            </div>
          )}
          
          {approvalNum && (
            <div className="flex justify-between items-center py-2 border-b border-slate-200">
              <span className="text-slate-600">מספר אישור:</span>
              <span className="font-mono text-slate-900">{approvalNum}</span>
            </div>
          )}
          
          {voucherNum && (
            <div className="flex justify-between items-center py-2 border-b border-slate-200">
              <span className="text-slate-600">מספר שובר:</span>
              <span className="font-mono text-slate-900">{voucherNum}</span>
            </div>
          )}
          
          {transactionUid && (
            <div className="flex justify-between items-center py-2 border-b border-slate-200">
              <span className="text-slate-600">מזהה עסקה:</span>
              <span className="font-mono text-xs text-slate-700">{transactionUid}</span>
            </div>
          )}
          
          {fourDigits && (
            <div className="flex justify-between items-center py-2 border-b border-slate-200">
              <span className="text-slate-600">כרטיס:</span>
              <span className="font-mono text-slate-900">****{fourDigits}</span>
            </div>
          )}
          
          {date && (
            <div className="flex justify-between items-center py-2">
              <span className="text-slate-600">תאריך:</span>
              <span className="text-slate-900">{new Date(date).toLocaleString('he-IL')}</span>
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <p className="text-sm text-blue-800 text-center">
            📧 קבלה נשלחה לכתובת המייל שלך
            <br />
            💳 התשלום יופיע בחשבון הבנק שלך בימים הקרובים
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <Link 
            href="/dashboard"
            className="flex-1 bg-gradient-to-l from-blue-600 to-cyan-600 text-white px-6 py-3 rounded-xl font-bold hover:scale-105 transition-all shadow-lg flex items-center justify-center gap-2"
          >
            <Home className="w-5 h-5" />
            חזרה לדשבורד
          </Link>
        </div>

        {/* Debug Info (only in development) */}
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-6 bg-slate-100 rounded-xl p-4">
            <summary className="cursor-pointer text-sm text-slate-600 font-bold">
              🔍 Debug Info (Development Only)
            </summary>
            <pre className="mt-2 text-xs text-slate-700 overflow-auto">
              {JSON.stringify(Object.fromEntries(searchParams.entries()), null, 2)}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">טוען...</div>}>
      <PaymentSuccessContent />
    </Suspense>
  );
}

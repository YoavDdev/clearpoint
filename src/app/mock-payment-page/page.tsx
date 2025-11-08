'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState } from 'react';

/**
 * Mock Payment Page - מדמה את דף התשלום של Grow
 * זה מה שהלקוח היה רואה באתר של Grow
 */
export default function MockPaymentPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [processing, setProcessing] = useState(false);

  const amount = searchParams.get('amount') || '0';
  const customer = searchParams.get('customer') || 'לקוח';

  const handlePaymentSuccess = async () => {
    setProcessing(true);
    
    // סימולציה של תשלום (2 שניות)
    await new Promise(resolve => setTimeout(resolve, 2000));

    // סימולציה של קריאה ל-webhook
    console.log('🔔 Simulating webhook call...');
    
    // הפניה חזרה לאפליקציה
    router.push('/dashboard?payment=success');
  };

  const handlePaymentFail = () => {
    router.push('/dashboard?payment=failed');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full mx-auto mb-4 flex items-center justify-center">
            <span className="text-4xl">💳</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            🧪 Mock Payment Page
          </h1>
          <p className="text-slate-600 text-sm">
            זה דף סימולציה של Grow
          </p>
        </div>

        {/* Payment Details */}
        <div className="bg-slate-50 rounded-xl p-6 mb-6">
          <div className="flex justify-between items-center mb-3">
            <span className="text-slate-600">לקוח:</span>
            <span className="font-bold text-slate-900">{customer}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-600">סכום:</span>
            <span className="font-bold text-2xl text-blue-600">₪{amount}</span>
          </div>
        </div>

        {/* Info */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-yellow-800">
            <strong>⚠️ זוהי סימולציה!</strong><br/>
            בפרודקשן, זה יהיה דף התשלום האמיתי של Grow.
            כאן אתה יכול לבחור אם התשלום "מצליח" או "נכשל".
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handlePaymentSuccess}
            disabled={processing}
            className="w-full bg-gradient-to-l from-green-600 to-emerald-600 text-white py-4 rounded-xl font-bold text-lg hover:scale-105 transition-all disabled:opacity-50 shadow-lg"
          >
            {processing ? '⏳ מעבד תשלום...' : '✅ תשלום מצליח'}
          </button>
          
          <button
            onClick={handlePaymentFail}
            disabled={processing}
            className="w-full bg-gradient-to-l from-red-600 to-red-700 text-white py-4 rounded-xl font-bold text-lg hover:scale-105 transition-all disabled:opacity-50 shadow-lg"
          >
            ❌ תשלום נכשל
          </button>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-xs text-slate-500">
            Mock Payment Gateway v1.0<br/>
            Development Mode Only
          </p>
        </div>
      </div>
    </div>
  );
}

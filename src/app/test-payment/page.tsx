'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function TestPaymentPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const router = useRouter();

  const testOneTimePayment = async () => {
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch('/api/payments/create-one-time', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: 'sim-cloud',
          items: [
            { name: 'Router SIM', quantity: 1, price: 3290, description: 'התקנה + ציוד' }
          ],
          returnUrl: window.location.origin + '/dashboard'
        })
      });

      const data = await response.json();
      console.log('Response received:', data);
      setResult({ status: response.status, data });

      // אם יש URL תשלום - נפתח אותו
      if (data.success && data.payment?.paymentUrl) {
        console.log('Redirecting to:', data.payment.paymentUrl);
        window.location.href = data.payment.paymentUrl;
      } else {
        console.log('No redirect - success:', data.success, 'paymentUrl:', data.payment?.paymentUrl);
      }
    } catch (error) {
      console.error('Payment error:', error);
      setResult({ error: String(error) });
    } finally {
      setLoading(false);
    }
  };

  const testSubscription = async () => {
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch('/api/payments/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: 'wifi-cloud',
          billingCycle: 'monthly',
          returnUrl: window.location.origin + '/dashboard'
        })
      });

      const data = await response.json();
      setResult({ status: response.status, data });

      if (data.success && data.paymentUrl) {
        console.log('Redirecting to:', data.paymentUrl);
        window.location.href = data.paymentUrl;
      }
    } catch (error) {
      console.error('Subscription error:', error);
      setResult({ error: String(error) });
    } finally {
      setLoading(false);
    }
  };

  const testWebhook = async () => {
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch('/api/payments/webhook/grow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: '1',
          data: {
            customFields: {
              cField1: 'test-payment-id-12345',
              cField2: 'test-user-id-67890'
            },
            transactionId: '999888777',
            sum: '100.00',
            asmachta: '123456789'
          }
        })
      });

      const data = await response.json();
      setResult({ status: response.status, data });
    } catch (error) {
      console.error('Webhook error:', error);
      setResult({ error: String(error) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8" dir="rtl">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
              <span className="text-3xl">🧪</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">בדיקת מערכת תשלומים</h1>
              <p className="text-slate-600">בדיקת API routes ואינטגרציה עם Grow</p>
            </div>
          </div>
        </div>

        {/* Test Buttons */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
          <h2 className="text-xl font-bold text-slate-900 mb-6">בדיקות API:</h2>
          
          <div className="space-y-4">
            {/* Test One-Time Payment */}
            <div className="border border-slate-200 rounded-xl p-4">
              <h3 className="font-bold text-slate-900 mb-2">1️⃣ תשלום חד-פעמי</h3>
              <p className="text-sm text-slate-600 mb-4">
                בדיקת API route: <code className="bg-slate-100 px-2 py-1 rounded">/api/payments/create-one-time</code>
              </p>
              <button
                onClick={testOneTimePayment}
                disabled={loading}
                className="w-full bg-gradient-to-l from-blue-600 to-cyan-600 text-white px-6 py-3 rounded-xl hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100 font-bold shadow-lg"
              >
                {loading ? '⏳ טוען...' : '💳 בדיקת תשלום חד-פעמי'}
              </button>
            </div>

            {/* Test Subscription */}
            <div className="border border-slate-200 rounded-xl p-4">
              <h3 className="font-bold text-slate-900 mb-2">2️⃣ מנוי חודשי</h3>
              <p className="text-sm text-slate-600 mb-4">
                בדיקת API route: <code className="bg-slate-100 px-2 py-1 rounded">/api/payments/create-subscription</code>
              </p>
              <button
                onClick={testSubscription}
                disabled={loading}
                className="w-full bg-gradient-to-l from-green-600 to-emerald-600 text-white px-6 py-3 rounded-xl hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100 font-bold shadow-lg"
              >
                {loading ? '⏳ טוען...' : '🔄 בדיקת מנוי חודשי'}
              </button>
            </div>

            {/* Test Webhook */}
            <div className="border border-slate-200 rounded-xl p-4">
              <h3 className="font-bold text-slate-900 mb-2">3️⃣ Webhook (סימולציה)</h3>
              <p className="text-sm text-slate-600 mb-4">
                בדיקת API route: <code className="bg-slate-100 px-2 py-1 rounded">/api/payments/webhook/grow</code>
              </p>
              <button
                onClick={testWebhook}
                disabled={loading}
                className="w-full bg-gradient-to-l from-purple-600 to-pink-600 text-white px-6 py-3 rounded-xl hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100 font-bold shadow-lg"
              >
                {loading ? '⏳ טוען...' : '📡 בדיקת Webhook'}
              </button>
            </div>
          </div>
        </div>

        {/* Result Display */}
        {result && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-xl font-bold text-slate-900 mb-4">📊 תוצאה:</h2>
            
            {/* Status Badge */}
            <div className="mb-4">
              <span className={`inline-block px-4 py-2 rounded-lg font-bold ${
                result.status === 200 ? 'bg-green-100 text-green-700' :
                result.status === 401 ? 'bg-yellow-100 text-yellow-700' :
                result.status === 400 ? 'bg-orange-100 text-orange-700' :
                'bg-red-100 text-red-700'
              }`}>
                Status: {result.status || 'Error'}
              </span>
            </div>

            {/* JSON Result */}
            <div className="bg-slate-900 text-green-400 p-4 rounded-lg overflow-auto max-h-96 font-mono text-sm">
              <pre>{JSON.stringify(result, null, 2)}</pre>
            </div>
          </div>
        )}

        {/* Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 mt-6">
          <h3 className="font-bold text-blue-900 mb-4">📋 הערות חשובות:</h3>
          <ul className="text-sm text-blue-800 space-y-2">
            <li>✅ <strong>משתמש חייב להיות מחובר</strong> (Supabase Auth) לבדיקת תשלומים</li>
            <li>✅ <strong>משתני סביבה</strong> של Grow צריכים להיות מוגדרים ב-<code>.env.local</code></li>
            <li>✅ <strong>Webhook</strong> ציבורי - לא דורש authentication (Grow שולח אליו)</li>
            <li>⚠️ <strong>Status 401</strong> = משתמש לא מחובר או חסרים משתני סביבה</li>
            <li>⚠️ <strong>Status 400</strong> = נתונים שגויים בבקשה</li>
            <li>⚠️ <strong>Status 404</strong> = משתמש או תוכנית לא נמצאו במסד הנתונים</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

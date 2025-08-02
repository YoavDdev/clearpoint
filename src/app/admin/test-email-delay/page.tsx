"use client";

import { useState } from 'react';

export default function TestEmailDelayPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const resetAlert = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/diagnostics/reset-alert-notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          alertId: "38e6effe-2ee8-4076-9522-8cfc32baa455" 
        })
      });
      
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ success: false, error: 'Network error' });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8" dir="rtl">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">
          🧪 בדיקת מערכת התראות אימייל
        </h1>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h2 className="font-semibold text-blue-800 mb-2">מה הבעיה?</h2>
          <p className="text-blue-700 text-sm">
            ההתראה של מצלמת "כניסה" מסומנת כ-notification_sent: true, 
            לכן המערכת חושבת שכבר נשלח אימייל ולא שולחת עוד.
          </p>
        </div>
        
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <h2 className="font-semibold text-green-800 mb-2">הפתרון:</h2>
          <p className="text-green-700 text-sm">
            איפוס הדגל notification_sent ל-false כדי שהמערכת תשלח אימייל אחרי 3 דקות.
          </p>
        </div>
        
        <button
          onClick={resetAlert}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'מאפס...' : '🔄 איפוס התראה לבדיקת אימייל'}
        </button>
        
        {result && (
          <div className={`mt-6 p-4 rounded-lg ${
            result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
          }`}>
            <h3 className={`font-semibold mb-2 ${
              result.success ? 'text-green-800' : 'text-red-800'
            }`}>
              {result.success ? '✅ הצלחה!' : '❌ שגיאה'}
            </h3>
            <pre className="text-xs overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
        
        {result?.success && (
          <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="font-semibold text-yellow-800 mb-2">🎯 מה קורה עכשיו?</h3>
            <ul className="text-yellow-700 text-sm space-y-1">
              <li>• ההתראה עכשיו מסומנת כ-notification_sent: false</li>
              <li>• במחזור הבדיקה הבא (תוך 5 דקות), המערכת תמצא את ההתראה</li>
              <li>• מכיוון שההתראה בת 14+ דקות (יותר מ-3 דקות), תישלח התראת אימייל</li>
              <li>• תוכל לראות את זה בלוגים של הטרמינל</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

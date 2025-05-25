'use client';

import { useState } from 'react';

export default function SupportPage() {
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!message) return alert("נא למלא את תוכן הבקשה");

    setLoading(true);
    const res = await fetch("/api/submit-support", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });

    const result = await res.json();
    setLoading(false);

    if (result.success) {
      setSubmitted(true);
    } else {
      alert("שגיאה בשליחה: " + result.error);
    }
  };

  if (submitted) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen text-center">
        <h1 className="text-2xl font-bold mb-4">✅ הבקשה נשלחה</h1>
        <p className="text-gray-600">ניצור איתך קשר בהקדם</p>
      </main>
    );
  }

  return (
    <div dir="rtl" className="pt-32 px-4 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-right">תמיכה</h1>
      <p className="text-right text-gray-700 mb-6">
        זקוק לעזרה? מלא את הטופס ונחזור אליך בהקדם.
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">מה הבעיה?</label>
          <textarea
            rows={5}
            className="w-full p-2 border rounded"
            placeholder="תאר את הבעיה שלך..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          {loading ? "שולח..." : "שלח בקשה"}
        </button>
      </div>
    </div>
  );
}

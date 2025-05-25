'use client';

import { useState } from 'react';

export default function SupportPage() {
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!message || !category) return alert("נא למלא את כל השדות");

    const formData = new FormData();
    formData.append('message', message);
    formData.append('category', category);
    if (file) formData.append('file', file);

    setLoading(true);
    const res = await fetch("/api/submit-support", {
      method: "POST",
      body: formData,
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
        {/* Category */}
        <div>
          <label className="block text-sm font-medium mb-1">סוג הבקשה</label>
          <select
            className="w-full p-2 border rounded"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">בחר קטגוריה</option>
            <option value="question">שאלה</option>
            <option value="technical">בעיה טכנית</option>
            <option value="billing">בקשת תשלום</option>
            <option value="other">אחר</option>
          </select>
        </div>

        {/* Message */}
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

        {/* File Upload */}
        <div>
          <label className="block text-sm font-medium mb-1">צרף קובץ (לא חובה)</label>
          <input
            type="file"
            accept="image/*,.pdf"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="w-full"
          />
        </div>

        {/* Submit */}
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

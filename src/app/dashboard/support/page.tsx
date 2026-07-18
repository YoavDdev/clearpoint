'use client';

import { useState } from 'react';
import { HelpCircle, MessageCircle, Phone, Mail, CheckCircle2, Upload, Send } from 'lucide-react';

export const dynamic = 'force-dynamic';

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
    const res = await fetch("/api/user/support", {
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
      <div dir="rtl" className="min-h-screen bg-slate-50 p-6 flex items-center justify-center">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl p-12 shadow-xl border border-green-200 text-center">
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-12 h-12 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-4">הבקשה נשלחה בהצלחה!</h1>
            <p className="text-xl text-slate-600 mb-8">
              תודה שפניתם אלינו. אנו נחזור אליכם בהקדם האפשרי.
            </p>
            <a 
              href="/dashboard"
              className="inline-block px-8 py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
            >
              חזרה לדף הבית
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="bg-white rounded-xl p-8 shadow-lg border border-slate-200">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center">
              <HelpCircle className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">עזרה ותמיכה</h1>
              <p className="text-lg text-slate-600">אנחנו כאן כדי לעזור לכם!</p>
            </div>
          </div>
        </div>

        {/* Quick Contact */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a href="tel:0548132603" className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border-2 border-green-200 hover:shadow-lg transition-all">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center">
                <Phone className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="font-bold text-slate-900 text-lg">התקשרו אלינו</p>
                <p className="text-slate-600">054-813-2603</p>
              </div>
            </div>
          </a>
          <a href="mailto:support@clearpoint.co.il" className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-6 border-2 border-blue-200 hover:shadow-lg transition-all">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                <Mail className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="font-bold text-slate-900 text-lg">שלחו לנו אימייל</p>
                <p className="text-slate-600">support@clearpoint.co.il</p>
              </div>
            </div>
          </a>
        </div>

        {/* Support Form */}
        <div className="bg-white rounded-xl p-8 shadow-lg border border-slate-200">
          <div className="flex items-center gap-3 mb-6">
            <MessageCircle className="w-6 h-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-slate-900">שלחו לנו הודעה</h2>
          </div>
          <p className="text-lg text-slate-600 mb-8">
            מלאו את הטופס ונחזור אליכם בהקדם האפשרי.
          </p>

          <div className="space-y-6">
            {/* Category */}
            <div>
              <label className="block text-lg font-bold text-slate-900 mb-3">
                מה סוג העזרה שאתם צריכים?
              </label>
              <select
                className="w-full p-4 border-2 border-slate-300 rounded-xl text-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">בחרו סוג בקשה</option>
                <option value="question">❓ שאלה כללית</option>
                <option value="technical">🔧 בעיה טכנית</option>
                <option value="billing">💳 שאלה על תשלום</option>
                <option value="other">💬 אחר</option>
              </select>
            </div>

            {/* Message */}
            <div>
              <label className="block text-lg font-bold text-slate-900 mb-3">
                תארו את הבעיה או השאלה
              </label>
              <textarea
                rows={6}
                className="w-full p-4 border-2 border-slate-300 rounded-xl text-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors resize-none"
                placeholder="כתבו כאן את ההודעה שלכם..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-lg font-bold text-slate-900 mb-3">
                צרפו תמונה או קובץ (לא חובה)
              </label>
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-blue-400 transition-colors">
                <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <input
                  type="file"
                  accept="image/*,.pdf,.png,.jpg,.jpeg"
                  onChange={(e) => {
                    const selected = e.target.files?.[0] || null;
                    if (selected && selected.size > 5 * 1024 * 1024) {
                      alert("הקובץ גדול מידי. אנא בחרו קובץ עד 5MB");
                      e.target.value = "";
                      setFile(null);
                      return;
                    }
                    setFile(selected);
                  }}
                  className="block w-full text-lg file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:font-medium file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100 cursor-pointer"
                />
                {file && (
                  <p className="mt-2 text-sm text-green-600">✅ קובץ נבחר: {file.name}</p>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={loading || !message || !category}
              className={`w-full py-5 rounded-xl font-bold text-xl transition-all flex items-center justify-center gap-3 ${
                loading || !message || !category
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-l from-blue-600 to-cyan-600 text-white hover:from-blue-700 hover:to-cyan-700 shadow-lg hover:shadow-xl hover:scale-105'
              }`}
            >
              {loading ? (
                <>
                  <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>שולח את ההודעה...</span>
                </>
              ) : (
                <>
                  <Send className="w-6 h-6" />
                  <span>שלחו הודעה</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

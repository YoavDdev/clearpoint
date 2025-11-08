"use client";

import { useState } from "react";
import { CreditCard, CheckCircle, XCircle, AlertCircle, Copy } from "lucide-react";

export default function TestPaymentsPage() {
  const [copied, setCopied] = useState<string | null>(null);

  const testCards = [
    {
      type: "success",
      name: "ויזה - מצליח",
      number: "4580 4580 4580 4580",
      expiry: "12/25",
      cvv: "123",
      icon: CheckCircle,
      color: "green",
      description: "עסקה תעבור בהצלחה",
    },
    {
      type: "mastercard",
      name: "מאסטרקארד - מצליח",
      number: "5326 1234 5678 9010",
      expiry: "12/25",
      cvv: "123",
      icon: CheckCircle,
      color: "green",
      description: "עסקה תעבור בהצלחה",
    },
    {
      type: "isracard",
      name: "ישראכרט - מצליח",
      number: "3742 0000 0000 004",
      expiry: "12/25",
      cvv: "1234",
      icon: CheckCircle,
      color: "green",
      description: "עסקה תעבור בהצלחה",
    },
    {
      type: "invalid",
      name: "כרטיס לא תקין",
      number: "4580 0000 0000 0000",
      expiry: "12/25",
      cvv: "123",
      icon: XCircle,
      color: "red",
      description: "יחזיר: 'כרטיס לא תקין'",
    },
    {
      type: "insufficient",
      name: "יתרה לא מספיקה",
      number: "4580 1111 1111 1111",
      expiry: "12/25",
      cvv: "123",
      icon: XCircle,
      color: "red",
      description: "יחזיר: 'יתרה לא מספיקה'",
    },
    {
      type: "blocked",
      name: "כרטיס חסום",
      number: "4580 2222 2222 2222",
      expiry: "12/25",
      cvv: "123",
      icon: XCircle,
      color: "red",
      description: "יחזיר: 'כרטיס חסום'",
    },
    {
      type: "pending",
      name: "דורש אישור",
      number: "4580 3333 3333 3333",
      expiry: "12/25",
      cvv: "123",
      icon: AlertCircle,
      color: "yellow",
      description: "יחזיר: 'דורש אישור מהבנק'",
    },
    {
      type: "recurring",
      name: "מנוי - יכשל בחיוב השני",
      number: "4580 6666 6666 6666",
      expiry: "12/25",
      cvv: "123",
      icon: AlertCircle,
      color: "orange",
      description: "חיוב ראשון יעבור, השני יכשל",
    },
  ];

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <main dir="rtl" className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg border-4 border-blue-600 p-8 mb-8">
          <div className="text-center">
            <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <CreditCard size={40} className="text-white" />
            </div>
            <h1 className="text-4xl font-bold text-slate-800 mb-2">🧪 כרטיסי טסט - Grow/Meshulam</h1>
            <p className="text-slate-600 text-lg">כרטיסי אשראי לבדיקת תשלומים בסביבת Sandbox</p>
          </div>

          <div className="mt-6 p-4 bg-yellow-50 rounded-xl border border-yellow-200">
            <p className="text-center text-yellow-800 font-medium">
              ⚠️ כרטיסים אלו פועלים רק בסביבת Sandbox! אל תשתמש בהם בפרודקשן!
            </p>
          </div>
        </div>

        {/* Test Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {testCards.map((card) => {
            const Icon = card.icon;
            const colorClasses = {
              green: "from-green-50 to-emerald-50 border-green-200",
              red: "from-red-50 to-rose-50 border-red-200",
              yellow: "from-yellow-50 to-amber-50 border-yellow-200",
              orange: "from-orange-50 to-red-50 border-orange-200",
            };

            const iconColors = {
              green: "text-green-600",
              red: "text-red-600",
              yellow: "text-yellow-600",
              orange: "text-orange-600",
            };

            return (
              <div
                key={card.type}
                className={`bg-gradient-to-br ${colorClasses[card.color as keyof typeof colorClasses]} rounded-xl shadow-lg border-2 p-6`}
              >
                <div className="flex items-center gap-3 mb-4">
                  <Icon size={24} className={iconColors[card.color as keyof typeof iconColors]} />
                  <h3 className="text-xl font-bold text-slate-800">{card.name}</h3>
                </div>

                <div className="space-y-3">
                  {/* Card Number */}
                  <div>
                    <label className="text-sm font-medium text-slate-600 mb-1 block">מספר כרטיס</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={card.number}
                        readOnly
                        className="flex-1 px-4 py-2 bg-white border border-slate-300 rounded-lg font-mono text-lg"
                      />
                      <button
                        onClick={() => copyToClipboard(card.number.replace(/\s/g, ""), `${card.type}-number`)}
                        className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        title="העתק"
                      >
                        {copied === `${card.type}-number` ? (
                          <CheckCircle size={20} />
                        ) : (
                          <Copy size={20} />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Expiry & CVV */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium text-slate-600 mb-1 block">תוקף</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={card.expiry}
                          readOnly
                          className="flex-1 px-4 py-2 bg-white border border-slate-300 rounded-lg font-mono"
                        />
                        <button
                          onClick={() => copyToClipboard(card.expiry, `${card.type}-expiry`)}
                          className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          {copied === `${card.type}-expiry` ? (
                            <CheckCircle size={16} />
                          ) : (
                            <Copy size={16} />
                          )}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-600 mb-1 block">CVV</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={card.cvv}
                          readOnly
                          className="flex-1 px-4 py-2 bg-white border border-slate-300 rounded-lg font-mono"
                        />
                        <button
                          onClick={() => copyToClipboard(card.cvv, `${card.type}-cvv`)}
                          className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          {copied === `${card.type}-cvv` ? (
                            <CheckCircle size={16} />
                          ) : (
                            <Copy size={16} />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="pt-3 border-t border-slate-300">
                    <p className="text-sm text-slate-700">
                      <strong>תוצאה צפויה:</strong> {card.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Links */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
          <h2 className="text-2xl font-bold text-slate-800 mb-6 text-center">🔗 קישורים מהירים לטסט</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a
              href="/admin/customers"
              className="p-6 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:from-blue-700 hover:to-cyan-700 transition-all text-center font-bold shadow-lg"
            >
              📋 רשימת לקוחות
            </a>
            <a
              href="/admin/requests"
              className="p-6 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all text-center font-bold shadow-lg"
            >
              📬 בקשות חדשות
            </a>
            <a
              href="/dashboard/payments"
              className="p-6 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all text-center font-bold shadow-lg"
            >
              💳 היסטוריית תשלומים
            </a>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 rounded-2xl border-2 border-blue-200 p-8">
          <h3 className="text-2xl font-bold text-blue-900 mb-4 text-center">📚 הוראות שימוש</h3>
          <div className="space-y-4 text-blue-800">
            <div className="flex items-start gap-3">
              <span className="text-2xl">1️⃣</span>
              <p>
                <strong>צור לקוח חדש</strong> או בחר קיים מרשימת הלקוחות
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl">2️⃣</span>
              <p>
                <strong>צור חשבונית או הפעל מנוי</strong> - InvoiceCreator או SubscriptionManager
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl">3️⃣</span>
              <p>
                <strong>פתח את לינק התשלום</strong> שנוצר
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl">4️⃣</span>
              <p>
                <strong>העתק את פרטי הכרטיס</strong> מהדף הזה (לחץ על כפתור ההעתקה)
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl">5️⃣</span>
              <p>
                <strong>הדבק בדף התשלום</strong> ושלם
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl">6️⃣</span>
              <p>
                <strong>בדוק את התוצאה</strong> - האם העסקה עברה/נכשלה כצפוי
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

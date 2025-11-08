"use client";

import { useState } from "react";
import { CreditCard, Package, RefreshCw, CheckCircle } from "lucide-react";

interface Item {
  name: string;
  description?: string;
  price: number;
  quantity: number;
  category: string;
}

interface CompletePaymentSetupProps {
  userId: string;
  userEmail: string;
  userName: string;
  userPlanId: string;
  userMonthlyPrice: number;
  onComplete?: () => void;
}

export default function CompletePaymentSetup({
  userId,
  userEmail,
  userName,
  userPlanId,
  userMonthlyPrice,
  onComplete,
}: CompletePaymentSetupProps) {
  const [items, setItems] = useState<Item[]>([]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  // חישוב סה"כ התקנה
  const installationTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  async function handleCreateComplete() {
    if (items.length === 0) {
      alert("❌ נא להוסיף לפחות פריט אחד לחשבונית");
      return;
    }

    if (!userPlanId || userPlanId === "") {
      alert("❌ המשתמש לא משויך לתוכנית מנוי. נא לבחור תוכנית תחילה בעמוד הלקוח.");
      return;
    }

    if (!userMonthlyPrice || userMonthlyPrice === 0) {
      alert("❌ לא הוגדר מחיר חודשי. נא לבחור תוכנית או להגדיר מחיר מותאם.");
      return;
    }

    if (!confirm(
      `האם ליצור:\n\n` +
      `💰 חשבונית התקנה: ₪${installationTotal.toLocaleString()}\n` +
      `🔄 + מנוי חודשי: ₪${userMonthlyPrice}/חודש\n\n` +
      `הלקוח ישלם עכשיו את ההתקנה, והכרטיס יישמר לחיובים חודשיים אוטומטיים.`
    )) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/create-complete-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          planId: userPlanId,
          monthlyPrice: userMonthlyPrice,
          installationItems: items,
          notes,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setPaymentUrl(data.paymentUrl);
        setShowSuccess(true);
        
        if (onComplete) {
          onComplete();
        }
      } else {
        alert("❌ שגיאה: " + data.error);
      }
    } catch (error) {
      console.error("Error creating payment:", error);
      alert("❌ שגיאה ביצירת תשלום");
    } finally {
      setLoading(false);
    }
  }

  function addItem(template?: Partial<Item>) {
    setItems([
      ...items,
      {
        name: template?.name || "",
        description: template?.description || "",
        price: template?.price || 0,
        quantity: template?.quantity || 1,
        category: template?.category || "other",
      },
    ]);
  }

  function updateItem(index: number, field: keyof Item, value: any) {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  }

  function removeItem(index: number) {
    setItems(items.filter((_, i) => i !== index));
  }

  if (showSuccess) {
    return (
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border-2 border-green-300 p-8">
        <div className="text-center">
          <div className="w-20 h-20 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={40} className="text-white" />
          </div>
          <h3 className="text-2xl font-bold text-green-800 mb-2">✅ הכל מוכן!</h3>
          <p className="text-green-700 mb-6">
            חשבונית ומנוי נוצרו בהצלחה. שלח את הלינק ללקוח:
          </p>

          <div className="bg-white rounded-xl p-6 mb-4">
            <div className="mb-4">
              <p className="text-sm text-slate-600 mb-2">💰 תשלום התקנה:</p>
              <p className="text-3xl font-bold text-slate-900">₪{installationTotal.toLocaleString()}</p>
            </div>
            <div className="mb-4">
              <p className="text-sm text-slate-600 mb-2">🔄 + מנוי חודשי:</p>
              <p className="text-2xl font-bold text-blue-600">₪{userMonthlyPrice}/חודש</p>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => {
                navigator.clipboard.writeText(paymentUrl);
                alert("✅ לינק הועתק!");
              }}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
            >
              📋 העתק לינק
            </button>
            <button
              onClick={() => window.open(paymentUrl, "_blank")}
              className="w-full py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors"
            >
              🔗 פתח לינק
            </button>
            <button
              onClick={() => {
                setShowSuccess(false);
                setPaymentUrl("");
                setItems([]);
                setNotes("");
              }}
              className="w-full py-3 bg-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-300 transition-colors"
            >
              יצירת תשלום חדש
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 text-white">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
            <CreditCard size={24} />
          </div>
          <div>
            <h3 className="text-2xl font-bold">💎 תשלום מושלם</h3>
            <p className="text-purple-100">התקנה + מנוי חודשי במקום אחד</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Warning if no plan */}
        {(!userPlanId || userPlanId === "" || !userMonthlyPrice || userMonthlyPrice === 0) && (
          <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xl">⚠️</span>
              </div>
              <div className="text-right flex-1">
                <p className="font-bold text-red-800 mb-1">לא ניתן ליצור תשלום מושלם</p>
                <p className="text-sm text-red-700">
                  {!userPlanId || userPlanId === "" ? "המשתמש לא משויך לתוכנית מנוי." : "לא הוגדר מחיר חודשי."}
                  <br />
                  <strong>פתרון:</strong> בחר תוכנית מנוי בחלק העליון של הדף או הגדר מחיר מותאם.
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <Package size={20} className="text-blue-600" />
              <span className="text-sm font-medium text-blue-800">תשלום התקנה</span>
            </div>
            <p className="text-3xl font-bold text-blue-900">₪{installationTotal.toLocaleString()}</p>
            <p className="text-xs text-blue-600 mt-1">משולם עכשיו</p>
          </div>

          <div className={`rounded-xl p-4 border-2 ${(!userPlanId || !userMonthlyPrice) ? 'bg-red-50 border-red-300' : 'bg-green-50 border-green-200'}`}>
            <div className="flex items-center gap-2 mb-2">
              <RefreshCw size={20} className={(!userPlanId || !userMonthlyPrice) ? 'text-red-600' : 'text-green-600'} />
              <span className={`text-sm font-medium ${(!userPlanId || !userMonthlyPrice) ? 'text-red-800' : 'text-green-800'}`}>מנוי חודשי</span>
            </div>
            <p className={`text-3xl font-bold ${(!userPlanId || !userMonthlyPrice) ? 'text-red-900' : 'text-green-900'}`}>
              {userMonthlyPrice > 0 ? `₪${userMonthlyPrice}` : '❌'}
            </p>
            <p className={`text-xs mt-1 ${(!userPlanId || !userMonthlyPrice) ? 'text-red-600' : 'text-green-600'}`}>
              {userMonthlyPrice > 0 ? 'חיוב אוטומטי' : 'לא הוגדר'}
            </p>
          </div>
        </div>

        {/* Invoice Items */}
        <div>
          <h4 className="text-lg font-bold text-slate-800 mb-3">📋 פריטי התקנה</h4>
          
          {items.length === 0 && (
            <div className="text-center py-8 bg-slate-50 rounded-xl border-2 border-dashed border-slate-300">
              <p className="text-slate-600 mb-4">אין פריטים עדיין</p>
              <button
                onClick={() => addItem()}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700"
              >
                + הוסף פריט ראשון
              </button>
            </div>
          )}

          <div className="space-y-3">
            {items.map((item, index) => (
              <div key={index} className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <div className="grid grid-cols-4 gap-3">
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => updateItem(index, "name", e.target.value)}
                    placeholder="שם פריט"
                    className="col-span-2 px-3 py-2 border border-slate-300 rounded-lg"
                  />
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, "quantity", parseInt(e.target.value) || 0)}
                    placeholder="כמות"
                    className="px-3 py-2 border border-slate-300 rounded-lg text-center"
                  />
                  <input
                    type="number"
                    value={item.price}
                    onChange={(e) => updateItem(index, "price", parseFloat(e.target.value) || 0)}
                    placeholder="מחיר"
                    className="px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-sm text-slate-600">
                    סה"כ: ₪{(item.price * item.quantity).toLocaleString()}
                  </p>
                  <button
                    onClick={() => removeItem(index)}
                    className="text-sm text-red-600 hover:text-red-800 font-medium"
                  >
                    🗑️ מחק
                  </button>
                </div>
              </div>
            ))}
          </div>

          {items.length > 0 && (
            <button
              onClick={() => addItem()}
              className="w-full mt-3 py-2 bg-blue-50 text-blue-700 rounded-lg font-bold hover:bg-blue-100 transition-colors"
            >
              + הוסף פריט נוסף
            </button>
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">📝 הערות</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="הערות לחשבונית (אופציונלי)"
            className="w-full px-4 py-3 border border-slate-300 rounded-xl resize-none"
            rows={2}
          />
        </div>

        {/* Submit Button */}
        <button
          onClick={handleCreateComplete}
          disabled={loading || items.length === 0 || !userPlanId || userPlanId === "" || !userMonthlyPrice || userMonthlyPrice === 0}
          className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold text-lg hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
              <span>יוצר תשלום מושלם...</span>
            </>
          ) : (
            <>
              <CreditCard size={24} />
              <span>
                {!userPlanId || userPlanId === "" || !userMonthlyPrice || userMonthlyPrice === 0
                  ? "❌ נדרשת תוכנית מנוי"
                  : "צור תשלום התקנה + מנוי"}
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

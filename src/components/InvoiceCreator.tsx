"use client";

import { useState, useEffect } from "react";
import { Plus, X, Send, Calculator, Trash2, FileText } from "lucide-react";

interface InvoiceItem {
  id: string;
  item_type: string;
  item_name: string;
  item_description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  camera_type?: string;
}

interface ItemTemplate {
  id: string;
  item_type: string;
  item_name: string;
  item_description: string;
  default_price: number;
  camera_type?: string;
}

interface InvoiceCreatorProps {
  userId: string;
  customerName: string;
  customerEmail: string;
}

export default function InvoiceCreator({ userId, customerName, customerEmail }: InvoiceCreatorProps) {
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [templates, setTemplates] = useState<ItemTemplate[]>([]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [invoiceLink, setInvoiceLink] = useState("");

  useEffect(() => {
    fetchTemplates();
  }, []);

  async function fetchTemplates() {
    try {
      const res = await fetch("/api/admin/item-templates");
      const data = await res.json();
      if (data.success) {
        setTemplates(data.templates);
      }
    } catch (error) {
      console.error("Error fetching templates:", error);
    }
  }

  function addItem(template?: ItemTemplate) {
    const newItem: InvoiceItem = {
      id: crypto.randomUUID(),
      item_type: template?.item_type || "other",
      item_name: template?.item_name || "",
      item_description: template?.item_description || "",
      quantity: 1,
      unit_price: template?.default_price || 0,
      total_price: template?.default_price || 0,
      camera_type: template?.camera_type,
    };
    setItems([...items, newItem]);
    setShowTemplates(false);
  }

  function updateItem(id: string, field: keyof InvoiceItem, value: any) {
    setItems(items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === "quantity" || field === "unit_price") {
          updated.total_price = updated.quantity * updated.unit_price;
        }
        return updated;
      }
      return item;
    }));
  }

  function removeItem(id: string) {
    setItems(items.filter(item => item.id !== id));
  }

  function getTotalAmount() {
    return items.reduce((sum, item) => sum + item.total_price, 0);
  }

  async function createInvoice() {
    if (items.length === 0) {
      alert("❌ נא להוסיף לפחות פריט אחד לחשבונית");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/create-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          items: items.map(({ id, ...rest }) => rest),
          notes,
          customerName,
          customerEmail,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setInvoiceLink(data.invoiceUrl);
        setShowSuccess(true);
      } else {
        alert("❌ שגיאה: " + data.error);
      }
    } catch (error) {
      console.error("Error creating invoice:", error);
      alert("❌ שגיאה ביצירת חשבונית");
    } finally {
      setLoading(false);
    }
  }

  function copyInvoiceLink() {
    navigator.clipboard.writeText(invoiceLink);
    alert("✅ הלינק הועתק ללוח!");
  }

  const itemTypeLabels: Record<string, string> = {
    nvr: "🖥️ מחשב NVR",
    camera: "📷 מצלמה",
    poe: "🔌 POE Switch",
    cable: "📡 כבלים",
    labor: "🔧 עבודה",
    other: "📦 אחר",
  };

  if (showSuccess) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Send size={32} className="text-green-600" />
          </div>
          <h3 className="text-2xl font-bold text-slate-800 mb-2">✅ חשבונית נוצרה בהצלחה!</h3>
          <p className="text-slate-600 mb-6">לינק לחשבונית מוכן לשליחה ללקוח</p>
          
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-slate-600 mb-2">לינק לחשבונית:</p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={invoiceLink}
                readOnly
                className="flex-1 px-4 py-2 bg-white border border-blue-200 rounded-lg text-sm font-mono"
              />
              <button
                onClick={copyInvoiceLink}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                העתק
              </button>
            </div>
          </div>

          <div className="flex gap-3 justify-center">
            <a
              href={invoiceLink}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              צפה בחשבונית
            </a>
            <button
              onClick={() => {
                setShowSuccess(false);
                setItems([]);
                setNotes("");
                setInvoiceLink("");
              }}
              className="px-6 py-3 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-medium"
            >
              צור חשבונית נוספת
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-6 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div className="text-right">
            <h3 className="text-xl font-bold text-slate-800 mb-1">💰 צור חשבונית ושלח לתשלום</h3>
            <p className="text-slate-600 text-sm">הוסף פריטים, חשב סה"כ ושלח לינק ללקוח</p>
          </div>
          <FileText size={32} className="text-purple-600" />
        </div>
      </div>

      <div className="p-6">
        {/* Items List */}
        {items.length > 0 && (
          <div className="mb-6 space-y-3">
            {items.map((item) => (
              <div key={item.id} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <div className="grid grid-cols-12 gap-3 items-start">
                  {/* Type & Name */}
                  <div className="col-span-5 space-y-2">
                    <select
                      value={item.item_type}
                      onChange={(e) => updateItem(item.id, "item_type", e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    >
                      {Object.entries(itemTypeLabels).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="שם הפריט"
                      value={item.item_name}
                      onChange={(e) => updateItem(item.id, "item_name", e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-right"
                    />
                    <input
                      type="text"
                      placeholder="תיאור (אופציונלי)"
                      value={item.item_description}
                      onChange={(e) => updateItem(item.id, "item_description", e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-right"
                    />
                  </div>

                  {/* Quantity */}
                  <div className="col-span-2">
                    <label className="text-xs text-slate-600 mb-1 block text-right">כמות</label>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(item.id, "quantity", parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-center"
                    />
                  </div>

                  {/* Unit Price */}
                  <div className="col-span-2">
                    <label className="text-xs text-slate-600 mb-1 block text-right">מחיר ליחידה</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unit_price}
                      onChange={(e) => updateItem(item.id, "unit_price", parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-center"
                    />
                  </div>

                  {/* Total */}
                  <div className="col-span-2">
                    <label className="text-xs text-slate-600 mb-1 block text-right">סה"כ</label>
                    <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm font-bold text-blue-800 text-center">
                      ₪{item.total_price.toFixed(2)}
                    </div>
                  </div>

                  {/* Delete */}
                  <div className="col-span-1 flex items-end justify-center">
                    <button
                      onClick={() => removeItem(item.id)}
                      className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                      title="מחק פריט"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Item Buttons */}
        <div className="mb-6">
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
            >
              <Plus size={18} />
              הוסף מתבנית
            </button>
            <button
              onClick={() => addItem()}
              className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-medium flex items-center gap-2"
            >
              <Plus size={18} />
              הוסף פריט ידני
            </button>
          </div>

          {/* Templates */}
          {showTemplates && (
            <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => addItem(template)}
                  className="p-3 bg-white border-2 border-slate-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-right"
                >
                  <div className="font-medium text-slate-800 text-sm">{template.item_name}</div>
                  <div className="text-xs text-slate-500 mt-1">{itemTypeLabels[template.item_type]}</div>
                  <div className="text-sm font-bold text-blue-600 mt-2">₪{template.default_price}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="mb-6">
          <label className="text-sm font-medium text-slate-700 mb-2 block text-right">הערות לחשבונית</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="הערות נוספות, פרטי תשלום, תנאים..."
            className="w-full px-4 py-3 border border-slate-300 rounded-lg text-right resize-none"
            rows={3}
          />
        </div>

        {/* Total & Submit */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border-2 border-green-200">
          <div className="flex items-center justify-between mb-4">
            <div className="text-right">
              <div className="text-sm text-slate-600 mb-1">סה"כ לתשלום</div>
              <div className="text-4xl font-bold text-green-700">₪{getTotalAmount().toFixed(2)}</div>
            </div>
            <Calculator size={40} className="text-green-600" />
          </div>

          <button
            onClick={createInvoice}
            disabled={loading || items.length === 0}
            className="w-full px-6 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors font-bold text-lg flex items-center justify-center gap-3"
          >
            {loading ? (
              <>
                <div className="animate-spin w-5 h-5 border-3 border-white border-t-transparent rounded-full" />
                <span>יוצר חשבונית...</span>
              </>
            ) : (
              <>
                <Send size={24} />
                <span>צור חשבונית ושלח לינק תשלום</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

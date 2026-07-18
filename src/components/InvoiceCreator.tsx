"use client";

import { useState, useEffect } from "react";
import { Plus, X, Send, Calculator, Trash2, FileText, Calendar } from "lucide-react";

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
  customerPhone?: string;
  customerAddress?: string;
  customerType?: 'private' | 'business';
  companyName?: string;
  vatNumber?: string;
  businessCity?: string;
  businessPostalCode?: string;
  communicationEmail?: string;
  defaultDocumentType?: 'quote' | 'invoice';
}

export default function InvoiceCreator({
  userId,
  customerName,
  customerEmail,
  customerPhone = '',
  customerAddress = '',
  customerType = 'private',
  companyName = '',
  vatNumber = '',
  businessCity = '',
  businessPostalCode = '',
  communicationEmail = '',
  defaultDocumentType = 'invoice',
}: InvoiceCreatorProps) {
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [templates, setTemplates] = useState<ItemTemplate[]>([]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [invoiceLink, setInvoiceLink] = useState("");
  const [documentType, setDocumentType] = useState<'quote' | 'invoice'>(defaultDocumentType);
  const [validUntil, setValidUntil] = useState("");

  const [billingCustomerType, setBillingCustomerType] = useState<'private' | 'business'>(customerType);
  const [billingCompanyName, setBillingCompanyName] = useState(companyName);
  const [billingVatNumber, setBillingVatNumber] = useState(vatNumber);
  const [billingCity, setBillingCity] = useState(businessCity);
  const [billingPostalCode, setBillingPostalCode] = useState(businessPostalCode);
  const [billingCommunicationEmail, setBillingCommunicationEmail] = useState(communicationEmail);
  const [billingPhone, setBillingPhone] = useState(customerPhone);
  const [billingAddress, setBillingAddress] = useState(customerAddress);
  
  // הוסר: מנוי חודשי מטופל בנפרד דרך SubscriptionManager

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

  function getInstallationTotal() {
    return items.reduce((sum, item) => sum + item.total_price, 0);
  }
  
  function getTotalAmount() {
    const installation = getInstallationTotal();
    // ⚠️ חודש ראשון חינם! תמיד רק ציוד + התקנה
    return installation;
  }

  async function createInvoice() {
    if (items.length === 0) {
      alert(documentType === 'quote' ? "❌ נא להוסיף לפחות פריט אחד לחשבון העסקה" : "❌ נא להוסיף לפחות פריט אחד לקבלה");
      return;
    }

    if (documentType === 'quote' && !validUntil) {
      alert("❌ נא לבחור תאריך תוקף לחשבון העסקה");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/invoices/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          items: items.map(({ id, ...rest }) => rest),
          notes,
          customerName,
          customerEmail,
          customerPhone: billingPhone,
          customerAddress: billingAddress,
          customerCity: billingCity,
          customerIdNumber: billingVatNumber,
          documentType,
          validUntil: documentType === 'quote' ? validUntil : null,

          billingCustomerType,
          billingCompanyName,
          billingVatNumber,
          billingBusinessCity: billingCity,
          billingBusinessPostalCode: billingPostalCode,
          billingCommunicationEmail,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setInvoiceLink(data.invoiceUrl || data.quoteUrl);
        setShowSuccess(true);
      } else {
        alert("❌ שגיאה: " + data.error);
      }
    } catch (error) {
      console.error("Error creating invoice:", error);
      alert(documentType === 'quote' ? "❌ שגיאה ביצירת חשבון עסקה" : "❌ שגיאה ביצירת קבלה");
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
    const isQuote = documentType === 'quote';
    return (
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Send size={32} className="text-green-600" />
          </div>
          <h3 className="text-2xl font-bold text-slate-800 mb-2">✅ {isQuote ? 'חשבון עסקה נוצר בהצלחה!' : 'קבלה נוצרה בהצלחה!'}</h3>
          <p className="text-slate-600 mb-6">{isQuote ? 'לינק לחשבון העסקה מוכן לשליחה ללקוח' : 'לינק לקבלה מוכן לשליחה ללקוח'}</p>
          
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-slate-600 mb-2">{isQuote ? 'לינק לחשבון העסקה:' : 'לינק לקבלה:'}</p>
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
              {isQuote ? 'צפה בחשבון עסקה' : 'צפה בקבלה'}
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
              {isQuote ? 'צור חשבון עסקה נוסף' : 'צור קבלה נוספת'}
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
            <h3 className="text-xl font-bold text-slate-800 mb-1">{documentType === 'quote' ? '📋 צור חשבון עסקה' : '🧾 צור קבלה ושלח לתשלום'}</h3>
            <p className="text-slate-600 text-sm">{documentType === 'quote' ? 'הוסף פריטים ושלח חשבון עסקה ללקוח לאישור' : 'הוסף פריטים, חשב סה"כ ושלח לינק ללקוח'}</p>
          </div>
          <FileText size={32} className="text-purple-600" />
        </div>
      </div>

      <div className="p-6">
        {/* Document Type Selection */}
        <div className="mb-6 bg-blue-50 rounded-lg p-4 border border-blue-200">
          <label className="text-sm font-medium text-slate-700 mb-3 block text-right">סוג מסמך</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setDocumentType('quote')}
              className={`p-4 rounded-lg border-2 transition-all text-right ${
                documentType === 'quote'
                  ? 'border-blue-600 bg-blue-100 text-blue-800'
                  : 'border-slate-300 bg-white text-slate-700 hover:border-blue-400'
              }`}
            >
              <div className="font-bold mb-1">📋 חשבון עסקה</div>
              <div className="text-xs">ללא תשלום, לאישור לקוח</div>
            </button>
            <button
              onClick={() => setDocumentType('invoice')}
              className={`p-4 rounded-lg border-2 transition-all text-right ${
                documentType === 'invoice'
                  ? 'border-green-600 bg-green-100 text-green-800'
                  : 'border-slate-300 bg-white text-slate-700 hover:border-green-400'
              }`}
            >
              <div className="font-bold mb-1">🧾 קבלה</div>
              <div className="text-xs">עם לינק תשלום מיידי</div>
            </button>
          </div>
        </div>

        <div className="mb-6 bg-white rounded-lg p-4 border border-slate-200">
          <label className="text-sm font-medium text-slate-700 mb-3 block text-right">פרטי חיוב למסמך</label>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <button
              type="button"
              onClick={() => setBillingCustomerType('private')}
              className={`p-3 rounded-lg border-2 transition-all text-right ${
                billingCustomerType === 'private'
                  ? 'border-blue-600 bg-blue-50 text-blue-800'
                  : 'border-slate-300 bg-white text-slate-700 hover:border-blue-400'
              }`}
            >
              <div className="font-bold">פרטי</div>
            </button>
            <button
              type="button"
              onClick={() => setBillingCustomerType('business')}
              className={`p-3 rounded-lg border-2 transition-all text-right ${
                billingCustomerType === 'business'
                  ? 'border-orange-600 bg-orange-50 text-orange-800'
                  : 'border-slate-300 bg-white text-slate-700 hover:border-orange-400'
              }`}
            >
              <div className="font-bold">עסק</div>
            </button>
          </div>

          {billingCustomerType === 'business' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-sm text-slate-600 block text-right mb-1">שם חברה</label>
                <input
                  type="text"
                  value={billingCompanyName}
                  onChange={(e) => setBillingCompanyName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-right"
                  placeholder="שם החברה"
                />
              </div>
              <div>
                <label className="text-sm text-slate-600 block text-right mb-1">ח.פ / ע.מ</label>
                <input
                  type="text"
                  value={billingVatNumber}
                  onChange={(e) => setBillingVatNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-right"
                  placeholder="מספר ח.פ / ע.מ"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slate-600 block text-right mb-1">עיר</label>
              <input
                type="text"
                value={billingCity}
                onChange={(e) => setBillingCity(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-right"
                placeholder="עיר"
              />
            </div>
            <div>
              <label className="text-sm text-slate-600 block text-right mb-1">מיקוד</label>
              <input
                type="text"
                value={billingPostalCode}
                onChange={(e) => setBillingPostalCode(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-right"
                placeholder="מיקוד"
              />
            </div>
            <div>
              <label className="text-sm text-slate-600 block text-right mb-1">כתובת</label>
              <input
                type="text"
                value={billingAddress}
                onChange={(e) => setBillingAddress(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-right"
                placeholder="כתובת למסמך"
              />
            </div>
            <div>
              <label className="text-sm text-slate-600 block text-right mb-1">טלפון</label>
              <input
                type="text"
                value={billingPhone}
                onChange={(e) => setBillingPhone(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-right"
                placeholder="טלפון"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm text-slate-600 block text-right mb-1">אימייל למסמכים (אופציונלי)</label>
              <input
                type="email"
                value={billingCommunicationEmail}
                onChange={(e) => setBillingCommunicationEmail(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-right"
                placeholder="אימייל למסמכים"
              />
            </div>
          </div>
        </div>

        {/* Valid Until (for quotes only) */}
        {documentType === 'quote' && (
          <div className="mb-6">
            <label className="text-sm font-medium text-slate-700 mb-2 text-right flex items-center gap-2 justify-end">
              <span>תוקף הצעת המחיר</span>
              <Calendar size={16} className="text-slate-400" />
            </label>
            <input
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg text-right"
              required
            />
            <p className="text-xs text-slate-500 mt-1 text-right">עד מתי ההצעה תקפה?</p>
          </div>
        )}

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
          <label className="text-sm font-medium text-slate-700 mb-2 block text-right">{documentType === 'quote' ? 'הערות לחשבון העסקה' : 'הערות לקבלה'}</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-4 py-3 border border-slate-300 rounded-xl resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
            placeholder="הערות נוספות..."
          />
        </div>

        {/* הוסר: מנוי חודשי מטופל בנפרד דרך SubscriptionManager */}

        {/* Total & Submit */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border-2 border-green-200">
          {/* Breakdown */}
          <div className="mb-4 text-right">
            <div className="flex justify-between items-center">
              <div className="text-right">
                <div className="text-sm text-slate-600 mb-1">{documentType === 'quote' ? 'סה"כ הצעת מחיר' : 'סה"כ לתשלום התקנה'}</div>
                <div className="text-4xl font-bold text-green-700">₪{getTotalAmount().toFixed(2)}</div>
                {documentType === 'invoice' && <div className="text-xs text-slate-600 mt-1">אפשרות לעד 12 תשלומים</div>}
              </div>
              <Calculator size={40} className="text-green-600" />
            </div>
          </div>

          <button
            onClick={createInvoice}
            disabled={loading || items.length === 0}
            className="w-full px-6 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors font-bold text-lg flex items-center justify-center gap-3"
          >
            {loading ? (
              <>
                <div className="animate-spin w-5 h-5 border-3 border-white border-t-transparent rounded-full" />
                <span>{documentType === 'quote' ? 'יוצר חשבון עסקה...' : 'יוצר קבלה...'}</span>
              </>
            ) : documentType === 'quote' ? (
              <>
                <FileText size={24} />
                <span>צור חשבון עסקה</span>
              </>
            ) : (
              <>
                <Send size={24} />
                <span>צור קבלה ושלח לינק תשלום</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

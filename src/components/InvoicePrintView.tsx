"use client";

import { useState } from "react";
import { FileText, User, Calendar, CreditCard, Package, Printer, Download, CheckCircle } from "lucide-react";

interface InvoiceProps {
  invoice: any;
  items: any[];
  isAdmin?: boolean;
}

export default function InvoicePrintView({ invoice, items, isAdmin = false }: InvoiceProps) {
  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 100);
  };

  const itemTypeEmojis: Record<string, string> = {
    nvr: "🖥️",
    camera: "📷",
    poe: "🔌",
    cable: "📡",
    labor: "🔧",
    other: "📦",
  };

  const statusLabels: Record<string, string> = {
    draft: "טיוטה",
    sent: "נשלח ללקוח",
    paid: "שולם",
    cancelled: "בוטל",
  };

  const paymentStatusLabels: Record<string, string> = {
    pending: "בהמתנה",
    completed: "הושלם",
    failed: "נכשל",
  };

  return (
    <>
      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .printable-area,
          .printable-area * {
            visibility: visible;
          }
          .printable-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
          .print-break {
            page-break-inside: avoid;
          }
        }
      `}</style>

      <main dir="rtl" className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 py-12 px-4">
        <div className="max-w-5xl mx-auto">
          {/* Print Button */}
          <div className="mb-6 no-print">
            <button
              onClick={handlePrint}
              disabled={isPrinting}
              className="flex items-center gap-3 px-6 py-3 bg-gradient-to-l from-blue-600 to-cyan-600 text-white rounded-xl hover:scale-105 transition-all shadow-lg font-bold"
            >
              <Printer size={20} />
              {isPrinting ? "מכין להדפסה..." : "הדפס חשבונית"}
            </button>
          </div>

          {/* Printable Area */}
          <div className="printable-area">
            {/* Header */}
            <div className="text-center mb-8 print-break">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <FileText size={40} className="text-white" />
              </div>
              <h1 className="text-4xl font-bold text-slate-800 mb-2">חשבונית #{invoice.invoice_number}</h1>
              <p className="text-slate-600 text-lg">Clearpoint Security Systems</p>
              <p className="text-slate-500 text-sm mt-2">מערכות אבטחה ומצלמות מתקדמות</p>
            </div>

            {/* Invoice Card */}
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border-2 border-slate-200 print-break">
              {/* Header Section */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-white">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Company Info */}
                  <div className="text-right">
                    <h2 className="text-2xl font-bold mb-3">Clearpoint Security</h2>
                    <div className="space-y-1 text-blue-100">
                      <p>📍 רחוב הדוגמה 123, תל אביב</p>
                      <p>📞 טלפון: 050-123-4567</p>
                      <p>✉️ info@clearpoint.co.il</p>
                      <p>🆔 ע.מ: 123456789</p>
                    </div>
                  </div>

                  {/* Customer Info */}
                  <div className="text-right bg-white/10 rounded-2xl p-5 backdrop-blur-sm">
                    <div className="flex items-center gap-2 mb-3 justify-end">
                      <span className="text-xl font-semibold">פרטי לקוח</span>
                      <User size={24} />
                    </div>
                    <div className="space-y-1">
                      <p className="font-bold text-lg">{invoice.user?.full_name || "לקוח"}</p>
                      <p className="text-blue-100">{invoice.user?.email}</p>
                      {invoice.user?.phone && <p className="text-blue-100">📱 {invoice.user.phone}</p>}
                      {invoice.user?.address && (
                        <p className="text-blue-100 mt-2">📍 {invoice.user.address}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Invoice Details */}
                <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3 text-right">
                  <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                    <div className="text-blue-100 text-xs mb-1">מספר חשבונית</div>
                    <div className="font-bold text-lg">#{invoice.invoice_number}</div>
                  </div>
                  <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                    <div className="text-blue-100 text-xs mb-1">תאריך הנפקה</div>
                    <div className="font-semibold">
                      {new Date(invoice.created_at).toLocaleDateString("he-IL")}
                    </div>
                  </div>
                  <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                    <div className="text-blue-100 text-xs mb-1">סטטוס</div>
                    <div className="font-semibold">{statusLabels[invoice.status] || invoice.status}</div>
                  </div>
                  {invoice.paid_at && (
                    <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                      <div className="text-blue-100 text-xs mb-1">תאריך תשלום</div>
                      <div className="font-semibold">
                        {new Date(invoice.paid_at).toLocaleDateString("he-IL")}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Items Section */}
              <div className="p-8 print-break">
                <div className="flex items-center gap-3 mb-6 justify-end">
                  <h3 className="text-2xl font-bold text-slate-800">פרטי ציוד והתקנה</h3>
                  <Package size={28} className="text-blue-600" />
                </div>

                {/* Items Table */}
                <div className="overflow-hidden rounded-xl border-2 border-slate-200 mb-6">
                  <table className="w-full">
                    <thead className="bg-slate-100">
                      <tr className="text-right">
                        <th className="px-6 py-4 text-sm font-bold text-slate-800">פריט</th>
                        <th className="px-6 py-4 text-sm font-bold text-slate-800 text-center">כמות</th>
                        <th className="px-6 py-4 text-sm font-bold text-slate-800 text-center">מחיר יחידה</th>
                        <th className="px-6 py-4 text-sm font-bold text-slate-800 text-center">סה"כ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {items?.map((item, index) => (
                        <tr key={item.id} className={index % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                          <td className="px-6 py-4 text-right">
                            <div className="font-semibold text-slate-800 mb-1">
                              {itemTypeEmojis[item.item_type]} {item.item_name}
                            </div>
                            {item.item_description && (
                              <div className="text-sm text-slate-600">{item.item_description}</div>
                            )}
                            {item.camera_type && (
                              <div className="text-xs text-blue-600 mt-1">רזולוציה: {item.camera_type}</div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center text-slate-700 font-medium">{item.quantity}</td>
                          <td className="px-6 py-4 text-center text-slate-700">
                            ₪{Number(item.unit_price).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 text-center font-bold text-slate-800">
                            ₪{Number(item.total_price).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-100">
                      <tr>
                        <td colSpan={3} className="px-6 py-4 text-right font-bold text-lg text-slate-800">
                          סה"כ לתשלום:
                        </td>
                        <td className="px-6 py-4 text-center font-bold text-2xl text-green-700">
                          ₪{Number(invoice.total_amount).toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Notes */}
                {invoice.notes && (
                  <div className="mb-6 bg-blue-50 rounded-xl p-5 border-2 border-blue-200 print-break">
                    <div className="font-bold text-slate-800 mb-2 text-right text-lg">📝 הערות:</div>
                    <div className="text-slate-700 text-right whitespace-pre-line">{invoice.notes}</div>
                  </div>
                )}

                {/* Subscription Info */}
                {invoice.has_subscription && invoice.monthly_price && (
                  <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border-2 border-blue-300 print-break">
                    <div className="flex items-center justify-center gap-3 mb-4">
                      <h3 className="text-xl font-bold text-blue-800">🔄 מנוי חודשי כלול</h3>
                    </div>
                    <div className="space-y-3 text-right">
                      <div className="bg-white rounded-lg p-4 border border-blue-200">
                        <p className="text-sm text-slate-600 mb-3 font-semibold">החיוב הראשון כולל:</p>
                        <div className="space-y-2 text-slate-700">
                          <div className="flex justify-between items-center py-2 border-b border-slate-200">
                            <span className="font-bold text-lg">₪{Number(invoice.total_amount).toFixed(2)}</span>
                            <span className="font-semibold">💰 ציוד והתקנה</span>
                          </div>
                          <div className="flex justify-between items-center text-green-700 bg-green-50 px-3 py-2 rounded-lg">
                            <span className="font-bold text-lg text-green-800">₪0 (חינם!)</span>
                            <span className="font-semibold">🎁 חודש ראשון במתנה!</span>
                          </div>
                          <div className="border-t-2 border-slate-300 pt-3 mt-3 flex justify-between items-center">
                            <span className="font-bold text-xl text-slate-900">
                              ₪{Number(invoice.total_amount).toFixed(2)}
                            </span>
                            <span className="font-bold text-lg">סה"כ עכשיו</span>
                          </div>
                        </div>
                      </div>
                      <div className="bg-blue-100 rounded-lg p-4 border-2 border-blue-300">
                        <p className="text-sm font-bold text-blue-900 mb-2">
                          🔄 מחודש 2 ואילך: חיוב אוטומטי של ₪{Number(invoice.monthly_price).toFixed(2)}/חודש
                        </p>
                        <ul className="text-sm text-blue-800 space-y-1 mr-4">
                          <li>• החיוב החודשי יתבצע אוטומטית מכרטיס האשראי</li>
                          <li>• ניתן לבטל את המנוי בכל עת דרך הדשבורד</li>
                          <li>• ללא מנוי פעיל - השירותים יושבתו</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* PayPlus Payment Details - Admin Only */}
                {isAdmin && invoice.payment && (
                  <div className="mb-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border-2 border-purple-300 print-break">
                    <div className="flex items-center gap-3 mb-4 justify-end">
                      <h3 className="text-xl font-bold text-purple-900">פרטי תשלום PayPlus</h3>
                      <CreditCard size={24} className="text-purple-700" />
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="bg-white rounded-lg p-4 border border-purple-200">
                        <div className="text-sm text-purple-700 font-semibold mb-2">סטטוס תשלום</div>
                        <div className="font-bold text-lg">
                          {paymentStatusLabels[invoice.payment.status] || invoice.payment.status}
                          {invoice.payment.status === "completed" && " ✅"}
                        </div>
                      </div>
                      <div className="bg-white rounded-lg p-4 border border-purple-200">
                        <div className="text-sm text-purple-700 font-semibold mb-2">סכום</div>
                        <div className="font-bold text-lg">₪{Number(invoice.payment.amount).toFixed(2)}</div>
                      </div>
                      {invoice.payment.provider_transaction_id && (
                        <div className="bg-white rounded-lg p-4 border border-purple-200 md:col-span-2">
                          <div className="text-sm text-purple-700 font-semibold mb-2">
                            🆔 מזהה עסקה (Transaction ID)
                          </div>
                          <div className="font-mono text-sm break-all">{invoice.payment.provider_transaction_id}</div>
                        </div>
                      )}
                      {invoice.payment.provider_payment_id && (
                        <div className="bg-white rounded-lg p-4 border border-purple-200 md:col-span-2">
                          <div className="text-sm text-purple-700 font-semibold mb-2">💳 מזהה תשלום (Payment ID)</div>
                          <div className="font-mono text-sm break-all">{invoice.payment.provider_payment_id}</div>
                        </div>
                      )}
                      {invoice.payment.metadata?.approval_num && (
                        <div className="bg-white rounded-lg p-4 border border-purple-200">
                          <div className="text-sm text-purple-700 font-semibold mb-2">✓ מספר אישור</div>
                          <div className="font-bold text-lg">{invoice.payment.metadata.approval_num}</div>
                        </div>
                      )}
                      {invoice.payment.metadata?.card_suffix && (
                        <div className="bg-white rounded-lg p-4 border border-purple-200">
                          <div className="text-sm text-purple-700 font-semibold mb-2">💳 ארבע ספרות אחרונות</div>
                          <div className="font-bold text-lg">****{invoice.payment.metadata.card_suffix}</div>
                        </div>
                      )}
                      {invoice.payment.metadata?.card_type && (
                        <div className="bg-white rounded-lg p-4 border border-purple-200">
                          <div className="text-sm text-purple-700 font-semibold mb-2">🏦 סוג כרטיס</div>
                          <div className="font-bold">{invoice.payment.metadata.card_type}</div>
                        </div>
                      )}
                      {invoice.payment.paid_at && (
                        <div className="bg-white rounded-lg p-4 border border-purple-200">
                          <div className="text-sm text-purple-700 font-semibold mb-2">📅 תאריך תשלום</div>
                          <div className="font-bold">
                            {new Date(invoice.payment.paid_at).toLocaleString("he-IL")}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-300 rounded-lg">
                      <p className="text-xs text-yellow-800">
                        ⚠️ <strong>למטרת הצלבה ואימות בלבד.</strong> מידע זה מאפשר אימות מדויק של העסקה מול
                        PayPlus.
                      </p>
                    </div>
                  </div>
                )}

                {/* Payment Link */}
                {!isAdmin && invoice.payment_link && invoice.status === "sent" && (
                  <div className="mt-6 no-print">
                    <a
                      href={invoice.payment_link}
                      className="block w-full px-8 py-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl font-bold text-2xl text-center"
                    >
                      💳 לחץ כאן לתשלום מאובטח
                    </a>
                    <p className="text-center text-slate-500 text-sm mt-4">תשלום מאובטח באמצעות PayPlus</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="text-center mt-8 text-slate-600 text-sm print-break">
              <p className="font-semibold mb-2">תודה על הזמנתך!</p>
              <p>במידה ויש שאלות, צור קשר עם התמיכה שלנו</p>
              <p className="mt-3">© {new Date().getFullYear()} Clearpoint Security. כל הזכויות שמורות.</p>
              <p className="text-xs text-slate-500 mt-2">
                מסמך זה הונפק באופן אלקטרוני ומהווה חשבונית חוקית
              </p>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

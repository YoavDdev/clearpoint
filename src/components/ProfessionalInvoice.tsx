"use client";

import { useState } from "react";

interface InvoiceProps {
  invoice: any;
  items: any[];
  isAdmin?: boolean;
}

export default function ProfessionalInvoice({ invoice, items, isAdmin = false }: InvoiceProps) {
  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 100);
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
      {/* Print Styles - Optimized for single A4 page */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 15mm;
          }
          
          /* Remove browser print headers/footers */
          @page {
            margin-top: 0;
            margin-bottom: 0;
          }
          
          body * {
            visibility: hidden;
          }
          
          .printable-invoice,
          .printable-invoice * {
            visibility: visible;
          }
          
          .printable-invoice {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0;
            margin: 0;
          }
          
          .no-print {
            display: none !important;
          }
          
          /* Compact spacing for print */
          .print-compact {
            padding: 8px !important;
            margin: 4px 0 !important;
          }
          
          .print-small-text {
            font-size: 11px !important;
          }
          
          /* Remove shadows and gradients for clean print */
          * {
            box-shadow: none !important;
            background-image: none !important;
          }
        }
      `}</style>

      <div dir="rtl" className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-5xl mx-auto">
          {/* Print Button - Hidden on print */}
          <div className="mb-6 no-print flex gap-3">
            <button
              onClick={handlePrint}
              disabled={isPrinting}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              {isPrinting ? "מכין להדפסה..." : "🖨️ הדפס קבלה"}
            </button>
            <button
              onClick={() => window.history.back()}
              className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
            >
              ← חזור
            </button>
          </div>

          {/* Invoice - Printable Area */}
          <div className="printable-invoice bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            {/* Header */}
            <div className="border-b-2 border-gray-900 pb-6 mb-6">
              <div className="flex justify-between items-start">
                {/* Company Info */}
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">Clearpoint Security</h1>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>מערכות אבטחה ומצלמות מתקדמות</p>
                    <p>רחוב הדוגמה 123, תל אביב</p>
                    <p>טלפון: 050-123-4567 | info@clearpoint.co.il</p>
                    <p>ע.מ: 123456789</p>
                  </div>
                </div>
                
                {/* Invoice Title */}
                <div className="text-left">
                  <h2 className="text-4xl font-bold text-gray-900 mb-2">קבלה</h2>
                  <p className="text-xl font-semibold text-gray-700">#{invoice.invoice_number}</p>
                </div>
              </div>
            </div>

            {/* Customer & Invoice Details */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              {/* Customer Info */}
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase">פרטי לקוח</h3>
                <div className="text-sm text-gray-700 space-y-1">
                  <p className="font-semibold text-gray-900">{invoice.user?.full_name || "לקוח"}</p>
                  <p>{invoice.user?.email}</p>
                  {invoice.user?.phone && <p>טלפון: {invoice.user.phone}</p>}
                  {invoice.user?.address && <p>כתובת: {invoice.user.address}</p>}
                </div>
              </div>

              {/* Invoice Details */}
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase">פרטי קבלה</h3>
                <div className="text-sm text-gray-700 space-y-1">
                  <div className="flex justify-between">
                    <span className="font-medium">תאריך הנפקה:</span>
                    <span>{new Date(invoice.created_at).toLocaleDateString("he-IL")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">סטטוס:</span>
                    <span className="font-semibold">{statusLabels[invoice.status] || invoice.status}</span>
                  </div>
                  {invoice.paid_at && (
                    <div className="flex justify-between">
                      <span className="font-medium">תאריך תשלום:</span>
                      <span>{new Date(invoice.paid_at).toLocaleDateString("he-IL")}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="mb-6">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100 border-y-2 border-gray-900">
                    <th className="text-right py-3 px-4 text-sm font-bold">תיאור</th>
                    <th className="text-center py-3 px-4 text-sm font-bold w-20">כמות</th>
                    <th className="text-center py-3 px-4 text-sm font-bold w-28">מחיר יחידה</th>
                    <th className="text-center py-3 px-4 text-sm font-bold w-28">סה"כ</th>
                  </tr>
                </thead>
                <tbody>
                  {items?.map((item, index) => (
                    <tr key={item.id} className="border-b border-gray-200">
                      <td className="py-3 px-4 text-sm">
                        <div className="font-semibold text-gray-900">{item.item_name}</div>
                        {item.item_description && (
                          <div className="text-xs text-gray-600 mt-1">{item.item_description}</div>
                        )}
                        {item.camera_type && (
                          <div className="text-xs text-gray-500 mt-1">רזולוציה: {item.camera_type}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center text-sm">{item.quantity}</td>
                      <td className="py-3 px-4 text-center text-sm">₪{Number(item.unit_price).toFixed(2)}</td>
                      <td className="py-3 px-4 text-center text-sm font-semibold">
                        ₪{Number(item.total_price).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="flex justify-end mb-6">
              <div className="w-80">
                <div className="border-t-2 border-gray-900 pt-3">
                  <div className="flex justify-between items-center py-2">
                    <span className="text-xl font-bold text-gray-900">סה"כ לתשלום:</span>
                    <span className="text-2xl font-bold text-gray-900">
                      ₪{Number(invoice.total_amount).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            {invoice.notes && (
              <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded">
                <h4 className="text-sm font-bold text-gray-900 mb-2">הערות:</h4>
                <p className="text-sm text-gray-700 whitespace-pre-line">{invoice.notes}</p>
              </div>
            )}

            {/* Subscription Info */}
            {invoice.has_subscription && invoice.monthly_price && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded">
                <h4 className="text-sm font-bold text-blue-900 mb-2">מנוי חודשי</h4>
                <div className="text-sm text-blue-800 space-y-1">
                  <p>• חיוב חודשי של ₪{Number(invoice.monthly_price).toFixed(2)} יחל בעוד חודש</p>
                  <p>• החודש הראשון במתנה - ללא חיוב</p>
                  <p>• ניתן לבטל בכל עת דרך הדשבורד</p>
                </div>
              </div>
            )}

            {/* Payment Details - Admin Only */}
            {isAdmin && invoice.payment && (
              <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded no-print">
                <h4 className="text-sm font-bold text-purple-900 mb-3">פרטי תשלום PayPlus (למנהל בלבד)</h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="font-medium text-purple-800">סטטוס:</span>{" "}
                    {paymentStatusLabels[invoice.payment.status]}
                  </div>
                  <div>
                    <span className="font-medium text-purple-800">סכום:</span> ₪
                    {Number(invoice.payment.amount).toFixed(2)}
                  </div>
                  {invoice.payment.provider_transaction_id && (
                    <div className="col-span-2">
                      <span className="font-medium text-purple-800">מזהה עסקה:</span>{" "}
                      <span className="font-mono text-xs">{invoice.payment.provider_transaction_id}</span>
                    </div>
                  )}
                  {invoice.payment.metadata?.approval_num && (
                    <div>
                      <span className="font-medium text-purple-800">אישור:</span>{" "}
                      {invoice.payment.metadata.approval_num}
                    </div>
                  )}
                  {invoice.payment.metadata?.card_suffix && (
                    <div>
                      <span className="font-medium text-purple-800">כרטיס:</span> ****
                      {invoice.payment.metadata.card_suffix}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Payment Link - Customer Only - Show only if not paid yet */}
            {!isAdmin && 
             invoice.payment_link && 
             invoice.status === "sent" && 
             invoice.payment?.status !== "completed" && (
              <div className="mb-6 no-print">
                <a
                  href={invoice.payment_link}
                  className="block w-full px-6 py-4 bg-blue-600 text-white text-center rounded-lg hover:bg-blue-700 transition-colors font-bold text-lg"
                >
                  💳 לחץ כאן לתשלום מאובטח
                </a>
                <p className="text-center text-gray-500 text-sm mt-2">תשלום מאובטח באמצעות PayPlus</p>
              </div>
            )}
            
            {/* Payment Completed Message */}
            {!isAdmin && invoice.payment?.status === "completed" && (
              <div className="mb-6 p-4 bg-gray-50 border-2 border-gray-900 rounded">
                <div className="flex items-center justify-center gap-2 text-gray-900">
                  <span className="text-2xl">✓</span>
                  <span className="font-bold text-lg">התשלום הושלם בהצלחה</span>
                </div>
                {invoice.payment.paid_at && (
                  <p className="text-center text-sm text-gray-700 mt-2">
                    שולם ב: {new Date(invoice.payment.paid_at).toLocaleString("he-IL")}
                  </p>
                )}
              </div>
            )}

            {/* Footer */}
            <div className="border-t border-gray-300 pt-4 mt-8">
              <div className="text-center text-xs text-gray-600 space-y-1">
                <p className="font-semibold">תודה על העסק!</p>
                <p>לשאלות או בעיות, צרו קשר: 050-123-4567 | info@clearpoint.co.il</p>
                <p className="text-gray-500">© {new Date().getFullYear()} Clearpoint Security. כל הזכויות שמורות.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

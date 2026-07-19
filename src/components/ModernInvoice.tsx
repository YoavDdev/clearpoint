"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

interface InvoiceProps {
  invoice: any;
  items: any[];
  isAdmin?: boolean;
}

export default function ModernInvoice({ invoice, items, isAdmin = false }: InvoiceProps) {
  const [isPrinting, setIsPrinting] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);
  const invoiceRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const handleDownloadPdf = async () => {
    if (!invoiceRef.current) return;
    setIsGeneratingPdf(true);
    try {
      const { toPng } = require('html-to-image');
      const { jsPDF } = require('jspdf');

      const dataUrl = await toPng(invoiceRef.current, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
      });

      const img = new Image();
      img.src = dataUrl;
      await new Promise((resolve) => { img.onload = resolve; });

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (img.height * pdfWidth) / img.width;

      pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${documentTitle}-${invoice.invoice_number}.pdf`);
    } catch (error) {
      console.error('PDF generation failed:', error);
      alert('שגיאה ביצירת PDF. נסה שוב.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const billing = invoice?.billing_snapshot || {};
  const issuer = invoice?.issuer_snapshot || {};

  const documentTitle =
    invoice?.document_type === 'invoice'
      ? 'קבלה'
      : invoice?.document_type === 'quote'
        ? 'חשבון עסקה'
        : 'מסמך';

  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 100);
  };

  const statusLabels: Record<string, string> = {
    draft: "טיוטה",
    sent: "ממתין לתשלום",
    paid: "שולם",
    cancelled: "בוטל",
    quote_draft: "טיוטה",
    quote_sent: "ממתין לאישור",
    quote_approved: "אושר",
    quote_rejected: "נדחה",
  };

  const isQuote = invoice?.document_type === 'quote';
  const isExpired = isQuote && invoice?.quote_valid_until && new Date(invoice.quote_valid_until) < new Date();
  const canRespondToQuote = isQuote && invoice?.status === 'quote_sent' && !isExpired && !isAdmin;

  const handleApproveQuote = async () => {
    if (!confirm("האם אתה בטוח שברצונך לאשר את חשבון העסקה? תועבר לתשלום.")) return;
    setIsApproving(true);
    try {
      const res = await fetch("/api/quote/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quoteId: invoice.id, userId: invoice.user_id }),
      });
      const data = await res.json();
      if (data.success && data.invoice?.id) {
        window.location.href = `/invoice/${data.invoice.id}`;
      } else {
        alert("שגיאה באישור חשבון העסקה: " + (data.error || "Unknown error"));
      }
    } catch (error) {
      console.error("Error approving quote:", error);
      alert("שגיאה באישור חשבון העסקה");
    } finally {
      setIsApproving(false);
    }
  };

  const handleRejectQuote = async () => {
    setIsRejecting(true);
    try {
      const res = await fetch("/api/quote/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quoteId: invoice.id, userId: invoice.user_id, reason: rejectionReason }),
      });
      const data = await res.json();
      if (data.success) {
        alert("חשבון העסקה נדחה בהצלחה.");
        setShowRejectModal(false);
        router.refresh();
      } else {
        alert("שגיאה בדחיית חשבון העסקה: " + (data.error || "Unknown error"));
      }
    } catch (error) {
      console.error("Error rejecting quote:", error);
      alert("שגיאה בדחיית חשבון העסקה");
    } finally {
      setIsRejecting(false);
    }
  };

  return (
    <>
      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 10mm;
          }
          
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
          
          * {
            box-shadow: none !important;
          }
          
          /* Subscription row - black and white for print */
          .subscription-row {
            background-color: #f9fafb !important;
            border-color: #e5e7eb !important;
          }
          
          .subscription-row td,
          .subscription-row div {
            color: #111827 !important;
          }
        }
      `}</style>

      <div dir="rtl" className="min-h-screen bg-gray-50 py-6 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Print Buttons */}
          <div className="mb-4 no-print flex gap-2">
            <button
              onClick={handlePrint}
              disabled={isPrinting}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
            >
              {isPrinting ? "מכין..." : "🖨️ הדפסה"}
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
            >
              {isGeneratingPdf ? "מייצר..." : "📥 הורד PDF"}
            </button>
            <button
              onClick={() => window.history.back()}
              className="px-4 py-2 bg-gray-200 text-gray-800 text-sm rounded hover:bg-gray-300 transition-colors"
            >
              חזור
            </button>

            {canRespondToQuote && (
              <>
                <button
                  onClick={handleApproveQuote}
                  disabled={isApproving}
                  className="px-6 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors font-bold"
                >
                  {isApproving ? "מאשר..." : "✅ אשר והמשך לתשלום"}
                </button>
                <button
                  onClick={() => setShowRejectModal(true)}
                  className="px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                >
                  ❌ דחה
                </button>
              </>
            )}
          </div>

          {/* Quote Status Banners */}
          {isQuote && isExpired && (
            <div className="mb-4 no-print bg-red-50 border border-red-300 rounded p-3 text-center text-sm text-red-800 font-semibold">
              ⚠️ חשבון העסקה פג תוקף. אנא צור קשר עם המשרד.
            </div>
          )}
          {isQuote && invoice?.status === 'quote_approved' && (
            <div className="mb-4 no-print bg-green-50 border border-green-300 rounded p-3 text-center text-sm text-green-800 font-semibold">
              ✅ חשבון העסקה אושר והומר לקבלה
            </div>
          )}
          {isQuote && invoice?.status === 'quote_rejected' && (
            <div className="mb-4 no-print bg-red-50 border border-red-300 rounded p-3 text-center text-sm text-red-800 font-semibold">
              ❌ חשבון העסקה נדחה
            </div>
          )}

          {/* Invoice */}
          <div ref={invoiceRef} className="printable-area bg-white shadow-sm border border-gray-200">
            {/* Header */}
            <div className="px-8 py-6 border-b-2 border-gray-900">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/logo.svg" alt="ClearPoint" width={40} height={40} />
                  <div>
                    <h1 className="text-xl font-bold text-gray-900 tracking-tight">ClearPoint</h1>
                    <p className="text-xs text-gray-600 mt-0.5">מערכות אבטחה ומצלמות</p>
                  </div>
                </div>
                <div className="text-left">
                  <div className="text-2xl font-bold text-gray-900">{documentTitle}</div>
                  <div className="text-sm text-gray-600 mt-0.5">#{invoice.invoice_number}</div>
                </div>
              </div>
            </div>

            {/* Details Grid */}
            <div className="px-8 py-5 grid grid-cols-2 gap-6 border-b border-gray-200 bg-gray-50">
              {/* Customer */}
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase mb-2">לקוח</div>
                <div className="text-sm space-y-0.5">
                  <div className="font-semibold text-gray-900">
                    {billing.customer_name || invoice.user?.full_name || "לקוח"}
                  </div>
                  <div className="text-gray-600">{billing.customer_email || invoice.user?.email}</div>
                  {(billing.customer_phone || invoice.user?.phone) && (
                    <div className="text-gray-600">{billing.customer_phone || invoice.user?.phone}</div>
                  )}
                  {(billing.customer_address || invoice.user?.address) && (
                    <div className="text-gray-600 text-xs">
                      {billing.customer_address || invoice.user?.address}
                    </div>
                  )}

                  {(billing.customer_type || billing.company_name || billing.vat_number) && (
                    <div className="pt-2 mt-2 border-t border-gray-200 text-xs text-gray-600 space-y-1">
                      {billing.customer_type && (
                        <div>
                          <span className="text-gray-500">סוג לקוח:</span> {billing.customer_type}
                        </div>
                      )}
                      {billing.company_name && (
                        <div>
                          <span className="text-gray-500">שם חברה:</span> {billing.company_name}
                        </div>
                      )}
                      {billing.vat_number && (
                        <div>
                          <span className="text-gray-500">ח.פ/ע.מ:</span> {billing.vat_number}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Invoice Details */}
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase mb-2">פרטי מסמך</div>
                <div className="text-sm space-y-0.5">
                  <div className="flex justify-between">
                    <span className="text-gray-600">תאריך:</span>
                    <span className="font-medium">{new Date(invoice.created_at).toLocaleDateString("he-IL")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">סטטוס:</span>
                    <span className="font-medium">{statusLabels[invoice.status]}</span>
                  </div>
                  {invoice.paid_at && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">שולם:</span>
                      <span className="font-medium">{new Date(invoice.paid_at).toLocaleDateString("he-IL")}</span>
                    </div>
                  )}
                  {isQuote && invoice.quote_valid_until && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">תוקף עד:</span>
                      <span className={`font-medium ${isExpired ? 'text-red-600' : ''}`}>
                        {new Date(invoice.quote_valid_until).toLocaleDateString("he-IL")}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="px-8 py-5">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-900">
                    <th className="text-right py-2 font-semibold text-gray-900">תיאור</th>
                    <th className="text-center py-2 font-semibold text-gray-900 w-16">כמות</th>
                    <th className="text-center py-2 font-semibold text-gray-900 w-24">מחיר</th>
                    <th className="text-center py-2 font-semibold text-gray-900 w-24">סה"כ</th>
                  </tr>
                </thead>
                <tbody>
                  {items?.map((item) => (
                    <tr key={item.id} className="border-b border-gray-100">
                      <td className="py-2.5 text-right">
                        <div className="font-medium text-gray-900">{item.item_name}</div>
                        {item.item_description && (
                          <div className="text-xs text-gray-500 mt-0.5">{item.item_description}</div>
                        )}
                        {item.camera_type && (
                          <div className="text-xs text-gray-400 mt-0.5">{item.camera_type}</div>
                        )}
                      </td>
                      <td className="py-2.5 text-center text-gray-700">{item.quantity}</td>
                      <td className="py-2.5 text-center text-gray-700">₪{Number(item.unit_price).toFixed(2)}</td>
                      <td className="py-2.5 text-center font-medium text-gray-900">
                        ₪{Number(item.total_price).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                  
                  {/* Subscription Row - רק בחשבונית הראשונית (לא בחודשיות) */}
                  {invoice.has_subscription && 
                   invoice.monthly_price && 
                   !items?.some(item => item.item_type === "subscription") && (
                    <tr className="subscription-row border-b border-gray-100 bg-blue-50">
                      <td className="py-2.5 text-right">
                        <div className="font-medium text-blue-900">🔄 מנוי חודשי</div>
                        <div className="text-xs text-blue-700 mt-0.5">
                          החודש הראשון חינם! החל מחודש 2: חיוב אוטומטי ₪{Number(invoice.monthly_price).toFixed(2)}/חודש
                        </div>
                      </td>
                      <td className="py-2.5 text-center text-blue-700">∞</td>
                      <td className="py-2.5 text-center text-blue-700">₪{Number(invoice.monthly_price).toFixed(2)}</td>
                      <td className="py-2.5 text-center font-medium text-blue-900">
                        ₪0.00
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Total with VAT breakdown */}
            <div className="px-8 py-4 bg-gray-50 border-t-2 border-gray-900">
              {issuer.vat_rate !== undefined && issuer.vat_rate !== null && issuer.vat_rate > 0 && (
                <div className="flex justify-between items-center text-sm text-gray-600 mb-1">
                  <span>לפני מע"מ</span>
                  <span>₪{(Number(invoice.total_amount) / (1 + issuer.vat_rate / 100)).toFixed(2)}</span>
                </div>
              )}
              {issuer.vat_rate !== undefined && issuer.vat_rate !== null && issuer.vat_rate > 0 && (
                <div className="flex justify-between items-center text-sm text-gray-600 mb-2">
                  <span>מע"מ ({issuer.vat_rate}%)</span>
                  <span>₪{(Number(invoice.total_amount) - Number(invoice.total_amount) / (1 + issuer.vat_rate / 100)).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-base font-bold text-gray-900">סה"כ לתשלום (כולל מע"מ)</span>
                <span className="text-2xl font-bold text-gray-900">₪{Number(invoice.total_amount).toFixed(2)}</span>
              </div>
            </div>

            {/* Notes */}
            {invoice.notes && (
              <div className="px-8 py-4 border-t border-gray-200 bg-gray-50">
                <div className="text-xs font-semibold text-gray-700 mb-1">הערות</div>
                <div className="text-sm text-gray-600 whitespace-pre-line">{invoice.notes}</div>
              </div>
            )}

            {/* Admin Info */}
            {isAdmin && invoice.payment && (
              <div className="px-8 py-4 border-t border-gray-200 bg-purple-50 no-print">
                <div className="text-xs font-semibold text-purple-900 mb-2">מידע למנהל</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-purple-700">עסקה:</span>{" "}
                    <span className="font-mono text-purple-900">{invoice.payment.provider_transaction_id?.substring(0, 16)}...</span>
                  </div>
                  {invoice.payment.metadata?.approval_num && (
                    <div>
                      <span className="text-purple-700">אישור:</span>{" "}
                      <span className="font-semibold text-purple-900">{invoice.payment.metadata.approval_num}</span>
                    </div>
                  )}
                  {invoice.payment.metadata?.card_suffix && (
                    <div>
                      <span className="text-purple-700">כרטיס:</span>{" "}
                      <span className="font-semibold text-purple-900">****{invoice.payment.metadata.card_suffix}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Payment Button */}
            {!isAdmin && 
             invoice.payment_link && 
             invoice.status === "sent" && 
             invoice.payment?.status !== "completed" && (
              <div className="px-8 py-4 border-t border-gray-200 no-print">
                <a
                  href={invoice.payment_link}
                  className="block w-full px-4 py-3 bg-blue-600 text-white text-center text-sm font-semibold rounded hover:bg-blue-700 transition-colors"
                >
                  💳 לחץ לתשלום מאובטח
                </a>
                <p className="text-center text-xs text-gray-500 mt-2">תשלום דרך PayPlus</p>
              </div>
            )}

            {/* Payment Success + Approval Number */}
            {!isAdmin && invoice.payment?.status === "completed" && (
              <div className="px-8 py-4 border-t border-gray-200 bg-gray-50">
                <div className="text-center">
                  <div className="text-sm font-semibold text-gray-900">✓ התשלום הושלם</div>
                  {invoice.payment.paid_at && (
                    <div className="text-xs text-gray-600 mt-1">
                      {new Date(invoice.payment.paid_at).toLocaleString("he-IL")}
                    </div>
                  )}
                  {(invoice.payment.metadata?.approval_num || invoice.payment.provider_transaction_id) && (
                    <div className="mt-2 text-xs text-gray-500 space-y-0.5">
                      {invoice.payment.metadata?.approval_num && (
                        <div>מספר אישור: <span className="font-mono font-medium text-gray-700">{invoice.payment.metadata.approval_num}</span></div>
                      )}
                      {invoice.payment.provider_transaction_id && (
                        <div>אסמכתא: <span className="font-mono font-medium text-gray-700">{invoice.payment.provider_transaction_id.substring(0, 20)}</span></div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="px-8 py-4 border-t border-gray-200 bg-white">
              <div className="text-center text-xs text-gray-500 space-y-1">
                <div>
                  {(issuer.brand_name || 'ClearPoint')}
                  {' • '}
                  {(issuer.communication_email || 'info@clearpoint.co.il')}
                </div>
                {(issuer.vat_number || issuer.issuer_type || issuer.vat_rate !== undefined) && (
                  <div>
                    {issuer.vat_number ? `ע.מ: ${issuer.vat_number}` : null}
                    {issuer.vat_number && issuer.issuer_type ? ' • ' : null}
                    {issuer.issuer_type ? `סוג עוסק: ${issuer.issuer_type}` : null}
                    {(issuer.vat_rate !== undefined && issuer.vat_rate !== null) ? ` • מע"מ: ${issuer.vat_rate}%` : null}
                  </div>
                )}
                <div>© {new Date().getFullYear()} כל הזכויות שמורות</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 no-print" onClick={() => setShowRejectModal(false)}>
          <div dir="rtl" className="bg-white rounded-xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-3">דחיית חשבון עסקה</h3>
            <p className="text-sm text-gray-600 mb-3">נשמח לדעת מדוע החלטת לדחות (אופציונלי)</p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="למשל: לא מתאים לתקציב, מצאתי פתרון אחר..."
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-right resize-none mb-3"
              rows={3}
            />
            <div className="flex gap-2">
              <button
                onClick={handleRejectQuote}
                disabled={isRejecting}
                className="flex-1 px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:bg-gray-300"
              >
                {isRejecting ? "דוחה..." : "אשר דחייה"}
              </button>
              <button
                onClick={() => setShowRejectModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300"
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

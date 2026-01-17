"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, Calendar, FileText, User, Mail, Phone, MapPin } from "lucide-react";

interface QuoteViewProps {
  quote: any;
  items: any[];
}

export default function QuoteView({ quote, items }: QuoteViewProps) {
  const router = useRouter();
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 100);
  };

  const handleApprove = async () => {
    if (!confirm("האם אתה בטוח שברצונך לאשר את הצעת המחיר? תועבר לתשלום.")) {
      return;
    }

    setIsApproving(true);
    try {
      const res = await fetch("/api/quote/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteId: quote.id,
          userId: quote.user_id,
        }),
      });

      const data = await res.json();

      if (data.success && data.payment?.paymentUrl) {
        // הפניה לדף תשלום
        window.location.href = data.payment.paymentUrl;
      } else {
        alert("❌ שגיאה באישור הצעת המחיר: " + (data.error || "Unknown error"));
      }
    } catch (error) {
      console.error("Error approving quote:", error);
      alert("❌ שגיאה באישור הצעת המחיר");
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    setIsRejecting(true);
    try {
      const res = await fetch("/api/quote/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteId: quote.id,
          userId: quote.user_id,
          reason: rejectionReason,
        }),
      });

      const data = await res.json();

      if (data.success) {
        alert("✅ הצעת המחיר נדחתה בהצלחה. תודה על עדכונך.");
        setShowRejectModal(false);
        router.refresh();
      } else {
        alert("❌ שגיאה בדחיית הצעת המחיר: " + (data.error || "Unknown error"));
      }
    } catch (error) {
      console.error("Error rejecting quote:", error);
      alert("❌ שגיאה בדחיית הצעת המחיר");
    } finally {
      setIsRejecting(false);
    }
  };

  const isExpired = quote.quote_valid_until && new Date(quote.quote_valid_until) < new Date();
  const canRespond = quote.status === "quote_sent" && !isExpired;
  const isApproved = quote.status === "quote_approved";
  const isRejected = quote.status === "quote_rejected";

  const statusLabels: Record<string, { label: string; color: string }> = {
    quote_draft: { label: "טיוטה", color: "bg-gray-100 text-gray-800" },
    quote_sent: { label: "ממתין לאישור", color: "bg-blue-100 text-blue-800" },
    quote_approved: { label: "אושר", color: "bg-green-100 text-green-800" },
    quote_rejected: { label: "נדחה", color: "bg-red-100 text-red-800" },
  };

  const currentStatus = statusLabels[quote.status] || statusLabels.quote_draft;

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
        }
      `}</style>

      <div dir="rtl" className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Action Buttons */}
          <div className="mb-6 no-print flex gap-3 justify-center">
            <button
              onClick={handlePrint}
              disabled={isPrinting}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-lg"
            >
              {isPrinting ? "מכין..." : "🖨️ הדפסה"}
            </button>

            {canRespond && (
              <>
                <button
                  onClick={handleApprove}
                  disabled={isApproving}
                  className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-bold text-lg shadow-lg flex items-center gap-2"
                >
                  {isApproving ? (
                    <>
                      <div className="animate-spin w-5 h-5 border-3 border-white border-t-transparent rounded-full" />
                      <span>מאשר...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle size={24} />
                      <span>✅ אשר והמשך לתשלום</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => setShowRejectModal(true)}
                  className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium shadow-lg flex items-center gap-2"
                >
                  <XCircle size={20} />
                  <span>❌ דחה הצעה</span>
                </button>
              </>
            )}
          </div>

          {/* Status Banner */}
          {isExpired && (
            <div className="mb-6 no-print bg-red-50 border-2 border-red-300 rounded-xl p-4 text-center">
              <p className="text-red-800 font-bold">⚠️ הצעת המחיר פגה. אנא צור קשר עם המשרד.</p>
            </div>
          )}

          {isApproved && (
            <div className="mb-6 no-print bg-green-50 border-2 border-green-300 rounded-xl p-4 text-center">
              <p className="text-green-800 font-bold">✅ הצעת המחיר אושרה והומרה לחשבונית</p>
            </div>
          )}

          {isRejected && (
            <div className="mb-6 no-print bg-red-50 border-2 border-red-300 rounded-xl p-4 text-center">
              <p className="text-red-800 font-bold">❌ הצעת המחיר נדחתה</p>
              {quote.rejection_reason && (
                <p className="text-red-700 text-sm mt-2">סיבה: {quote.rejection_reason}</p>
              )}
            </div>
          )}

          {/* Quote Document */}
          <div className="printable-area bg-white shadow-2xl border-2 border-slate-200 rounded-xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-6">
              <div className="flex justify-between items-center">
                <div className="text-right">
                  <h1 className="text-3xl font-bold mb-2">📋 הצעת מחיר</h1>
                  <p className="text-blue-100">Clearpoint Security Systems</p>
                </div>
                <div className="text-left">
                  <div className="text-sm mb-1">מספר הצעה</div>
                  <div className="text-2xl font-bold">#{quote.invoice_number}</div>
                </div>
              </div>
            </div>

            {/* Status & Dates */}
            <div className="bg-slate-50 px-8 py-4 border-b border-slate-200">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <span className={`px-4 py-2 rounded-full text-sm font-bold ${currentStatus.color}`}>
                    {currentStatus.label}
                  </span>
                  {quote.quote_valid_until && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Calendar size={16} />
                      <span>תוקף עד: {new Date(quote.quote_valid_until).toLocaleDateString("he-IL")}</span>
                    </div>
                  )}
                </div>
                <div className="text-sm text-slate-600">
                  תאריך: {new Date(quote.created_at).toLocaleDateString("he-IL")}
                </div>
              </div>
            </div>

            {/* Customer Info */}
            <div className="px-8 py-6 border-b border-slate-200 bg-blue-50">
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <User size={20} className="text-blue-600" />
                <span>פרטי לקוח</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-slate-600 mb-1">שם מלא</div>
                  <div className="font-semibold text-slate-800">{quote.user?.full_name || "לא צוין"}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-600 mb-1 flex items-center gap-1">
                    <Mail size={14} />
                    <span>אימייל</span>
                  </div>
                  <div className="font-semibold text-slate-800">{quote.user?.email}</div>
                </div>
                {quote.user?.phone && (
                  <div>
                    <div className="text-sm text-slate-600 mb-1 flex items-center gap-1">
                      <Phone size={14} />
                      <span>טלפון</span>
                    </div>
                    <div className="font-semibold text-slate-800">{quote.user.phone}</div>
                  </div>
                )}
                {quote.user?.address && (
                  <div>
                    <div className="text-sm text-slate-600 mb-1 flex items-center gap-1">
                      <MapPin size={14} />
                      <span>כתובת</span>
                    </div>
                    <div className="font-semibold text-slate-800">{quote.user.address}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Items Table */}
            <div className="px-8 py-6">
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <FileText size={20} className="text-purple-600" />
                <span>פריטים</span>
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-100 border-b-2 border-slate-300">
                    <tr className="text-right">
                      <th className="px-4 py-3 text-sm font-bold text-slate-700">פריט</th>
                      <th className="px-4 py-3 text-sm font-bold text-slate-700 text-center">כמות</th>
                      <th className="px-4 py-3 text-sm font-bold text-slate-700 text-center">מחיר יחידה</th>
                      <th className="px-4 py-3 text-sm font-bold text-slate-700 text-center">סה"כ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {items.map((item, index) => (
                      <tr key={index} className="hover:bg-slate-50">
                        <td className="px-4 py-4">
                          <div className="font-semibold text-slate-800">{item.item_name}</div>
                          {item.item_description && (
                            <div className="text-sm text-slate-600 mt-1">{item.item_description}</div>
                          )}
                        </td>
                        <td className="px-4 py-4 text-center text-slate-700">{item.quantity}</td>
                        <td className="px-4 py-4 text-center text-slate-700">₪{item.unit_price.toFixed(2)}</td>
                        <td className="px-4 py-4 text-center font-bold text-slate-800">₪{item.total_price.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-green-50 border-t-2 border-green-300">
                    <tr>
                      <td colSpan={3} className="px-4 py-4 text-right">
                        <span className="text-lg font-bold text-slate-800">סה"כ לתשלום:</span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="text-2xl font-bold text-green-700">₪{quote.total_amount.toFixed(2)}</span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Notes */}
            {quote.notes && (
              <div className="px-8 py-6 bg-amber-50 border-t border-amber-200">
                <h3 className="text-lg font-bold text-slate-800 mb-3">📝 הערות</h3>
                <p className="text-slate-700 whitespace-pre-wrap">{quote.notes}</p>
              </div>
            )}

            {/* Footer */}
            <div className="px-8 py-6 bg-slate-100 border-t-2 border-slate-300 text-center">
              <p className="text-sm text-slate-600">
                Clearpoint Security Systems | info@clearpoint.co.il | 03-1234567
              </p>
              <p className="text-xs text-slate-500 mt-2">
                הצעת מחיר זו תקפה עד {quote.quote_valid_until ? new Date(quote.quote_valid_until).toLocaleDateString("he-IL") : "תאריך לא צוין"}
              </p>
            </div>
          </div>
        </div>

        {/* Reject Modal */}
        {showRejectModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 no-print" onClick={() => setShowRejectModal(false)}>
            <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-2xl font-bold text-slate-800 mb-4 text-right">דחיית הצעת מחיר</h3>
              <p className="text-slate-600 mb-4 text-right">נשמח לדעת מדוע החלטת לדחות את ההצעה (אופציונלי)</p>
              
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="למשל: מצאתי הצעה זולה יותר, לא מתאים לתקציב, וכו..."
                className="w-full px-4 py-3 border border-slate-300 rounded-lg text-right resize-none mb-4"
                rows={4}
              />

              <div className="flex gap-3">
                <button
                  onClick={handleReject}
                  disabled={isRejecting}
                  className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:bg-slate-300"
                >
                  {isRejecting ? "דוחה..." : "אשר דחייה"}
                </button>
                <button
                  onClick={() => setShowRejectModal(false)}
                  className="flex-1 px-6 py-3 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-medium"
                >
                  ביטול
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

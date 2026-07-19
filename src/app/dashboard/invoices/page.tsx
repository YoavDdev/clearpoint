"use client";

import { useState, useEffect, Suspense } from "react";
import { FileText, Calendar, DollarSign, Eye, Loader2, Download } from "lucide-react";
import Link from "next/link";

export const dynamic = 'force-dynamic';

interface Invoice {
  id: string;
  invoice_number: string;
  document_type: 'quote' | 'invoice';
  status: string;
  total_amount: number;
  currency: string;
  created_at: string;
  paid_at: string | null;
  quote_valid_until?: string | null;
  has_subscription: boolean;
  monthly_price: number | null;
  payment: {
    id: string;
    status: string;
    amount: string;
    paid_at: string | null;
    provider_transaction_id: string | null;
    metadata: any;
  } | null;
}

function InvoicesContent() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/user/invoices");
      const data = await response.json();

      if (data.success) {
        setInvoices(data.invoices || []);
      }
    } catch (error) {
      console.error("Error fetching invoices:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      // Quotes
      quote_draft: { label: "טיוטה", color: "bg-gray-100 text-gray-800", icon: "📝" },
      quote_sent: { label: "ממתין לאישור", color: "bg-blue-100 text-blue-800", icon: "⏳" },
      quote_approved: { label: "אושר", color: "bg-green-100 text-green-800", icon: "✅" },
      quote_rejected: { label: "נדחה", color: "bg-red-100 text-red-800", icon: "❌" },

      // Receipts (invoices table)
      draft: { label: "טיוטה", color: "bg-gray-100 text-gray-800", icon: "📝" },
      sent: { label: "ממתין לתשלום", color: "bg-blue-100 text-blue-800", icon: "⏳" },
      paid: { label: "שולם", color: "bg-green-100 text-green-800", icon: "✅" },
      cancelled: { label: "בוטל", color: "bg-red-100 text-red-800", icon: "❌" },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    return (
      <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium ${config.color}`}>
        <span>{config.icon}</span>
        {config.label}
      </span>
    );
  };

  const getPaymentSummaryText = (invoice: Invoice) => {
    if (invoice.status === "cancelled" || invoice.status === "quote_rejected") return "בוטל";

    if (invoice.document_type === 'quote') {
      if (invoice.status === "quote_approved") return "אושר - ממתין לתשלום";
      if (invoice.status === "quote_sent") return "ממתין לאישור שלך";
      return "-";
    }

    if (!invoice.payment) {
      if (invoice.status === "paid") return "שולם";
      if (invoice.status === "sent") return "ממתין לתשלום";
      return "-";
    }

    if (invoice.payment.status === "completed") return "שולם";
    if (invoice.payment.status === "pending") return "ממתין לתשלום";
    if (invoice.payment.status === "failed") return "נכשל";

    return "סטטוס לא ידוע";
  };

  const stats = {
    total: invoices.length,
    paid: invoices.filter((i) => i.document_type === 'invoice' && i.status === "paid").length,
    pending: invoices.filter((i) => i.document_type === 'invoice' && i.status === "sent").length,
    totalPaid: invoices
      .filter((i) => i.document_type === 'invoice' && i.status === "paid")
      .reduce((sum, i) => sum + Number(i.total_amount), 0),
  };

  if (loading) {
    return (
      <div dir="rtl" className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
          <p className="text-slate-600 text-lg">טוען מסמכים...</p>
        </div>
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div dir="rtl" className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <FileText size={64} className="mx-auto mb-4 text-slate-300" />
            <h3 className="text-2xl font-bold text-slate-800 mb-2">אין מסמכים עדיין</h3>
            <p className="text-slate-600">המסמכים שלך יופיעו כאן</p>
          </div>
        </div>
      </div>
    );
  }

  // סינון חכם: הלקוח רואה רק מה שרלוונטי
  // הצעות מחיר — רק אלו שממתינות לאישור שלו (לא מאושרות/לא בוטלות)
  const pendingQuotes = invoices.filter((inv) => inv.document_type === 'quote' && inv.status === 'quote_sent');
  // חשבוניות לתשלום
  const awaitingPayment = invoices.filter((inv) => inv.document_type === 'invoice' && inv.status === 'sent');
  // קבלות — ששולמו
  const paidReceipts = invoices.filter((inv) => inv.document_type === 'invoice' && inv.status === 'paid');
  // מבוטלים
  const cancelledDocs = invoices.filter((inv) => inv.status === 'cancelled' || inv.status === 'quote_rejected');

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
              <FileText size={32} className="text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-slate-800">המסמכים שלי</h1>
              <p className="text-slate-600">כל המסמכים והתשלומים שלך מסודרים לפי סוג</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-slate-600 text-sm mb-1">סה"כ מסמכים</div>
                  <div className="text-3xl font-bold text-slate-800">{stats.total}</div>
                </div>
                <FileText size={32} className="text-blue-500" />
              </div>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-green-600 text-sm mb-1">שולמו</div>
                  <div className="text-3xl font-bold text-green-700">{stats.paid}</div>
                </div>
                <div className="text-4xl">✅</div>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-purple-600 text-sm mb-1">סה"כ שולם</div>
                  <div className="text-3xl font-bold text-purple-700">₪{stats.totalPaid.toFixed(0)}</div>
                </div>
                <DollarSign size={32} className="text-purple-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Annual Summary */}
        {paidReceipts.length > 0 && (
          <div className="mb-8">
            <button
              onClick={async () => {
                const year = new Date().getFullYear();
                try {
                  const res = await fetch(`/api/user/invoices/annual-summary?year=${year}`);
                  const data = await res.json();
                  if (!data.success) { alert('שגיאה בטעינת הנתונים'); return; }

                  const lines = [
                    `סיכום תשלומים שנתי - ${year}`,
                    `לקוח: ${data.customerName}`,
                    ``,
                    `סה"כ שולם: ₪${data.summary.totalPaid.toFixed(2)}`,
                    `תשלומים חודשיים: ₪${data.summary.recurringTotal.toFixed(2)}`,
                    `תשלומים חד-פעמיים: ₪${data.summary.oneTimeTotal.toFixed(2)}`,
                    `מספר קבלות: ${data.summary.invoiceCount}`,
                    ``,
                    `--- פירוט לפי חודש ---`,
                    ...Object.entries(data.summary.monthlyBreakdown).map(([m, v]) => `${m}: ₪${(v as number).toFixed(2)}`),
                    ``,
                    `--- פירוט קבלות ---`,
                    `מספר | תאריך | סכום`,
                    ...data.invoices.map((inv: any) => `#${inv.invoice_number} | ${new Date(inv.paid_at).toLocaleDateString('he-IL')} | ₪${Number(inv.total_amount).toFixed(2)}`),
                  ];

                  const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/plain;charset=utf-8' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `clearpoint-summary-${year}.txt`;
                  a.click();
                  URL.revokeObjectURL(url);
                } catch (e) {
                  alert('שגיאה בהורדת הסיכום');
                }
              }}
              className="flex items-center gap-3 px-6 py-3 bg-gradient-to-l from-purple-600 to-indigo-600 text-white rounded-xl hover:scale-105 transition-all shadow-lg font-bold"
            >
              <Download size={20} />
              <span>הורד סיכום שנתי {new Date().getFullYear()}</span>
            </button>
          </div>
        )}

        {/* 1. הצעות מחיר שממתינות לאישור */}
        {pendingQuotes.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <span className="text-xl">�</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-800">הצעות מחיר לאישור</h2>
                <p className="text-sm text-slate-600">לאחר אישור תועבר/י לתשלום</p>
              </div>
            </div>
            <div className="space-y-4">
              {pendingQuotes.map((invoice) => (
                <div
                  key={invoice.id}
                  className="bg-white rounded-2xl shadow-lg border-2 border-orange-200 overflow-hidden hover:shadow-xl transition-all"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-2xl font-bold text-slate-800">#{invoice.invoice_number}</h3>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-600">
                          <div className="flex items-center gap-2">
                            <Calendar size={16} />
                            <span>תאריך: {new Date(invoice.created_at).toLocaleDateString("he-IL")}</span>
                          </div>
                          {invoice.quote_valid_until && (
                            <div className="flex items-center gap-2">
                              <span>•</span>
                              <span>תוקף עד: {new Date(invoice.quote_valid_until).toLocaleDateString("he-IL")}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-left">
                        <div className="text-sm text-slate-600 mb-1">סכום</div>
                        <div className="text-3xl font-bold text-slate-800">₪{invoice.total_amount.toFixed(2)}</div>
                      </div>
                    </div>

                    <Link
                      href={`/quote/${invoice.id}`}
                      className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-l from-green-600 to-emerald-600 text-white rounded-xl hover:scale-105 transition-all shadow-lg font-bold text-lg"
                    >
                      <span>✅</span>
                      <span>צפייה ואישור הצעה</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2. חשבוניות ממתינות לתשלום */}
        {awaitingPayment.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-xl">💳</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-800">חשבוניות לתשלום</h2>
                <p className="text-sm text-slate-600">חשבוניות שממתינות לתשלום שלך</p>
              </div>
            </div>
            <div className="space-y-4">
              {awaitingPayment.map((invoice) => (
                <div
                  key={invoice.id}
                  className="bg-white rounded-2xl shadow-lg border-2 border-blue-200 overflow-hidden hover:shadow-xl transition-all"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-2xl font-bold text-slate-800">#{invoice.invoice_number}</h3>
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            ⏳ ממתין לתשלום
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-600">
                          <div className="flex items-center gap-2">
                            <Calendar size={16} />
                            <span>תאריך: {new Date(invoice.created_at).toLocaleDateString("he-IL")}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-left">
                        <div className="text-sm text-slate-600 mb-1">לתשלום</div>
                        <div className="text-3xl font-bold text-blue-700">₪{invoice.total_amount.toFixed(2)}</div>
                      </div>
                    </div>

                    <Link
                      href={`/invoice/${invoice.id}`}
                      className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-l from-blue-600 to-cyan-600 text-white rounded-xl hover:scale-105 transition-all shadow-lg font-bold text-lg"
                    >
                      <span>💳</span>
                      <span>צפייה ותשלום</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. קבלות — מסמכים ששולמו */}
        {paidReceipts.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-xl">✅</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-800">קבלות</h2>
                <p className="text-sm text-slate-600">תשלומים שבוצעו בהצלחה</p>
              </div>
            </div>
            <div className="space-y-4">
              {paidReceipts.map((invoice) => (
                <div
                  key={invoice.id}
                  className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
                >
                  <div className="p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                          <span>✅</span>
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-slate-800">קבלה #{invoice.invoice_number}</h3>
                          <div className="text-sm text-slate-500">
                            {invoice.paid_at 
                              ? `שולם: ${new Date(invoice.paid_at).toLocaleDateString("he-IL")}`
                              : `תאריך: ${new Date(invoice.created_at).toLocaleDateString("he-IL")}`
                            }
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-left">
                          <div className="text-xl font-bold text-green-700">₪{invoice.total_amount.toFixed(2)}</div>
                        </div>
                        <Link
                          href={`/invoice/${invoice.id}`}
                          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all font-medium text-sm"
                        >
                          <Eye size={16} />
                          <span>צפייה</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. מסמכים שבוטלו — מכווץ */}
        {cancelledDocs.length > 0 && (
          <div className="mb-8">
            <details className="group">
              <summary className="flex items-center gap-3 mb-4 cursor-pointer list-none">
                <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
                  <span className="text-xl">🗑️</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-500">מסמכים שבוטלו ({cancelledDocs.length})</h2>
                  <p className="text-sm text-slate-400">לחץ לפתיחה</p>
                </div>
              </summary>
              <div className="space-y-3 mt-4">
                {cancelledDocs.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="bg-slate-50 rounded-xl border border-slate-200 p-4 opacity-60"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-red-500">❌</span>
                        <span className="font-medium text-slate-600">#{invoice.invoice_number}</span>
                      </div>
                      <span className="text-sm text-red-600 font-medium">בוטל</span>
                    </div>
                  </div>
                ))}
              </div>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}

export default function UserInvoicesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>}>
      <InvoicesContent />
    </Suspense>
  );
}

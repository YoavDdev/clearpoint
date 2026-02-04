"use client";

import { useState, useEffect, Suspense } from "react";
import { FileText, User, Calendar, DollarSign, Eye, Printer, Search, Filter, Ban, X, Loader2, Download } from "lucide-react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";

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
  approved_at?: string | null;
  rejected_at?: string | null;
  has_subscription: boolean;
  monthly_price: number | null;
  user: {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
  };
  payment: {
    id: string;
    status: string;
    amount: string;
    paid_at: string | null;
    provider_transaction_id: string | null;
    metadata: any;
  } | null;
}

function AdminInvoicesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'accounting' | 'management'>('accounting');
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [documentTypeFilter, setDocumentTypeFilter] = useState("all");
  const [subscriptionFilter, setSubscriptionFilter] = useState<'all' | 'true' | 'false'>('all');
  const [reportFrom, setReportFrom] = useState<string>("");
  const [reportTo, setReportTo] = useState<string>("");
  const [isExporting, setIsExporting] = useState(false);
  const userIdFilter = searchParams.get("user_id");

  const toDateOnly = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const setPresetRange = (preset: 'current_month' | 'prev_month' | 'current_quarter' | 'current_year') => {
    const now = new Date();

    if (preset === 'current_month') {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setReportFrom(toDateOnly(from));
      setReportTo(toDateOnly(to));
      return;
    }

    if (preset === 'prev_month') {
      const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const to = new Date(now.getFullYear(), now.getMonth(), 0);
      setReportFrom(toDateOnly(from));
      setReportTo(toDateOnly(to));
      return;
    }

    if (preset === 'current_quarter') {
      const qStartMonth = Math.floor(now.getMonth() / 3) * 3;
      const from = new Date(now.getFullYear(), qStartMonth, 1);
      const to = new Date(now.getFullYear(), qStartMonth + 3, 0);
      setReportFrom(toDateOnly(from));
      setReportTo(toDateOnly(to));
      return;
    }

    const from = new Date(now.getFullYear(), 0, 1);
    const to = new Date(now.getFullYear(), 11, 31);
    setReportFrom(toDateOnly(from));
    setReportTo(toDateOnly(to));
  };

  useEffect(() => {
    fetchInvoices();
  }, [statusFilter, documentTypeFilter, subscriptionFilter, userIdFilter, activeTab, reportFrom, reportTo]);

  useEffect(() => {
    if (activeTab !== 'accounting') return;

    setStatusFilter('paid');
    setDocumentTypeFilter('invoice');
    setSearchTerm("");

    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const from = new Date(y, m, 1);
    const to = new Date(y, m + 1, 0);

    setReportFrom(toDateOnly(from));
    setReportTo(toDateOnly(to));
  }, [activeTab]);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      let url = `/api/admin/invoices?status=${statusFilter}`;

      if (activeTab === 'accounting') {
        url = `/api/admin/invoices?status=paid&document_type=invoice&date_field=paid_at`;
        if (subscriptionFilter !== 'all') {
          url += `&subscription=${subscriptionFilter}`;
        }
        if (reportFrom) {
          url += `&date_from=${encodeURIComponent(reportFrom)}`;
        }
        if (reportTo) {
          url += `&date_to=${encodeURIComponent(reportTo)}`;
        }
      } else {
        if (documentTypeFilter !== "all") {
          url += `&document_type=${documentTypeFilter}`;
        }
        if (subscriptionFilter !== 'all') {
          url += `&subscription=${subscriptionFilter}`;
        }
        if (userIdFilter) {
          url += `&user_id=${userIdFilter}`;
        }
      }

      const response = await fetch(url);
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

  const clearUserFilter = () => {
    router.push('/admin/invoices');
  };

  const handleExportCsv = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      let url = `/api/admin/invoices/export?status=paid&document_type=invoice&date_field=paid_at`;
      if (subscriptionFilter !== 'all') {
        url += `&subscription=${subscriptionFilter}`;
      }
      if (reportFrom) {
        url += `&date_from=${encodeURIComponent(reportFrom)}`;
      }
      if (reportTo) {
        url += `&date_to=${encodeURIComponent(reportTo)}`;
      }

      const res = await fetch(url);
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || 'Export failed');
      }

      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);

      const contentDisposition = res.headers.get('content-disposition') || '';
      const match = /filename="?([^";]+)"?/i.exec(contentDisposition);
      const filename = match?.[1] || 'clearpoint-invoices.csv';

      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (e) {
      console.error('CSV export error:', e);
      alert('שגיאה ביצוא CSV');
    } finally {
      setIsExporting(false);
    }
  };

  const handleCancelInvoice = async (invoiceId: string, invoiceNumber: string, documentType: 'quote' | 'invoice') => {
    const docName = documentType === 'quote' ? 'חשבון עסקה' : 'קבלה';
    if (!confirm(`האם אתה בטוח שברצונך לבטל את ${docName} #${invoiceNumber}?`)) {
      return;
    }

    const typed = prompt(`למניעת טעויות, הקלד את מספר המסמך כדי לאשר ביטול: ${invoiceNumber}`);
    if (typed === null) return;
    if (typed.trim() !== String(invoiceNumber).trim()) {
      alert('המספר שהוקלד לא תואם. הביטול בוטל.');
      return;
    }

    try {
      const response = await fetch("/api/admin/cancel-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId }),
      });

      const result = await response.json();

      if (result.success) {
        alert('המסמך בוטל בהצלחה');
        fetchInvoices();
      } else {
        alert("שגיאה: " + result.error);
      }
    } catch (error) {
      console.error("Error cancelling invoice:", error);
      alert('שגיאה בביטול המסמך');
    }
  };

  const filteredInvoices = invoices.filter((invoice) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      invoice.invoice_number?.toLowerCase().includes(searchLower) ||
      invoice.user?.full_name?.toLowerCase().includes(searchLower) ||
      invoice.user?.email?.toLowerCase().includes(searchLower)
    );
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      // הצעות מחיר
      quote_draft: { label: "טיוטה", color: "bg-gray-100 text-gray-800" },
      quote_sent: { label: "הצעה נשלחה", color: "bg-blue-100 text-blue-800" },
      quote_approved: { label: "הצעה אושרה", color: "bg-green-100 text-green-800" },
      quote_rejected: { label: "הצעה נדחתה", color: "bg-red-100 text-red-800" },
      // חשבוניות
      draft: { label: "טיוטה", color: "bg-gray-100 text-gray-800" },
      sent: { label: "ממתין לתשלום", color: "bg-blue-100 text-blue-800" },
      paid: { label: "שולם", color: "bg-green-100 text-green-800" },
      cancelled: { label: "בוטל", color: "bg-red-100 text-red-800" },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const getPaymentStatusBadge = (payment: Invoice["payment"]) => {
    if (!payment) return <span className="text-gray-400 text-sm">אין עסקה</span>;

    const statusConfig = {
      pending: { label: "בהמתנה", color: "bg-yellow-100 text-yellow-800" },
      completed: { label: "הושלם", color: "bg-green-100 text-green-800" },
      failed: { label: "נכשל", color: "bg-red-100 text-red-800" },
    };

    const config = statusConfig[payment.status as keyof typeof statusConfig];
    if (!config) return <span className="text-gray-400 text-sm">לא ידוע</span>;

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const getPaymentCell = (invoice: Invoice) => {
    if (invoice.document_type === "quote") {
      return <span className="text-slate-400 text-sm">-</span>;
    }

    if (!invoice.payment) {
      if (invoice.status === "paid") {
        return <span className="text-green-700 text-sm font-medium">שולם (ללא עסקה מקושרת)</span>;
      }
      if (invoice.status === "sent") {
        return <span className="text-yellow-700 text-sm font-medium">ממתין (לא נוצרה עסקה)</span>;
      }
      return <span className="text-gray-400 text-sm">אין עסקה</span>;
    }

    return getPaymentStatusBadge(invoice.payment);
  };

  const stats = {
    total: invoices.length,
    quotes: invoices.filter((i) => i.document_type === "quote").length,
    invoices: invoices.filter((i) => i.document_type === "invoice").length,
    quotesApproved: invoices.filter((i) => i.status === "quote_approved").length,
    paid: invoices.filter((i) => i.status === "paid").length,
    pending: invoices.filter((i) => i.status === "sent").length,
    totalRevenue: invoices
      .filter((i) => i.status === "paid")
      .reduce((sum, i) => sum + Number(i.total_amount), 0),
  };

  const reportStats = {
    receipts: invoices.filter((i) => i.document_type === 'invoice').length,
    totalRevenue: invoices.reduce((sum, i) => sum + Number(i.total_amount), 0),
    recurringRevenue: invoices
      .filter((i) => i.has_subscription)
      .reduce((sum, i) => sum + Number(i.total_amount), 0),
    oneTimeRevenue: invoices
      .filter((i) => !i.has_subscription)
      .reduce((sum, i) => sum + Number(i.total_amount), 0),
    paidWithoutPayment: invoices.filter((i) => i.status === 'paid' && !i.payment).length,
  };

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                <FileText size={32} className="text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-slate-800">ניהול מסמכים</h1>
                <p className="text-slate-600">כל המסמכים במערכת</p>
              </div>
            </div>
            <Link
              href="/admin/invoices/create"
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg font-medium"
            >
              <FileText size={20} />
              <span>צור מסמך חדש</span>
            </Link>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-2xl p-2 shadow-lg border border-slate-200 mb-6">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setActiveTab('accounting')}
                className={`px-4 py-3 rounded-xl font-bold transition-all ${
                  activeTab === 'accounting'
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                דוחות לרו"ח
              </button>
              <button
                onClick={() => setActiveTab('management')}
                className={`px-4 py-3 rounded-xl font-bold transition-all ${
                  activeTab === 'management'
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                ניהול מסמכים
              </button>
            </div>
          </div>

          {/* User Filter Banner */}
          {activeTab === 'management' && userIdFilter && invoices.length > 0 && (
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <User size={20} className="text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">מציג מסמכים של: {invoices[0]?.user?.full_name || invoices[0]?.user?.email}</p>
                    <p className="text-xs text-blue-700">נמצאו {invoices.length} מסמכים</p>
                  </div>
                </div>
                <button
                  onClick={clearUserFilter}
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-sm font-medium transition-colors"
                >
                  <X size={16} />
                  <span>הצג הכל</span>
                </button>
              </div>
            </div>
          )}

          {/* Stats Cards */}
          {activeTab === 'management' ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
                <div className="text-slate-600 text-sm mb-2">סה"כ</div>
                <div className="text-3xl font-bold text-slate-800">{stats.total}</div>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-blue-200">
                <div className="text-blue-600 text-sm mb-2">חשבונות עסקה</div>
                <div className="text-3xl font-bold text-blue-700">{stats.quotes}</div>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-orange-200">
                <div className="text-orange-600 text-sm mb-2">קבלות</div>
                <div className="text-3xl font-bold text-orange-700">{stats.invoices}</div>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-emerald-200">
                <div className="text-emerald-600 text-sm mb-2">חשבונות אושרו</div>
                <div className="text-3xl font-bold text-emerald-700">{stats.quotesApproved}</div>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-green-200">
                <div className="text-green-600 text-sm mb-2">שולמו</div>
                <div className="text-3xl font-bold text-green-700">{stats.paid}</div>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-purple-200">
                <div className="text-purple-600 text-sm mb-2">סה"כ הכנסות</div>
                <div className="text-3xl font-bold text-purple-700">₪{stats.totalRevenue.toFixed(0)}</div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
                <div className="text-slate-600 text-sm mb-2">קבלות בתקופה</div>
                <div className="text-3xl font-bold text-slate-800">{reportStats.receipts}</div>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-purple-200">
                <div className="text-purple-600 text-sm mb-2">סה"כ הכנסות</div>
                <div className="text-3xl font-bold text-purple-700">₪{reportStats.totalRevenue.toFixed(0)}</div>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-emerald-200">
                <div className="text-emerald-600 text-sm mb-2">הוראת קבע</div>
                <div className="text-3xl font-bold text-emerald-700">₪{reportStats.recurringRevenue.toFixed(0)}</div>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-orange-200">
                <div className="text-orange-600 text-sm mb-2">חד-פעמי</div>
                <div className="text-3xl font-bold text-orange-700">₪{reportStats.oneTimeRevenue.toFixed(0)}</div>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-red-200">
                <div className="text-red-600 text-sm mb-2">שולם בלי עסקה</div>
                <div className="text-3xl font-bold text-red-700">{reportStats.paidWithoutPayment}</div>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
            {activeTab === 'management' ? (
              <div className="grid md:grid-cols-4 gap-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                  <input
                    type="text"
                    placeholder="חיפוש לפי מספר מסמך, שם לקוח או אימייל..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pr-12 pl-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Document Type Filter */}
                <div className="flex items-center gap-2">
                  <FileText size={20} className="text-slate-600" />
                  <select
                    value={documentTypeFilter}
                    onChange={(e) => setDocumentTypeFilter(e.target.value)}
                    className="flex-1 px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">הכל</option>
                    <option value="quote">📋 חשבונות עסקה</option>
                    <option value="invoice">🧾 קבלות</option>
                  </select>
                </div>

                {/* Subscription Filter */}
                <div className="flex items-center gap-2">
                  <DollarSign size={20} className="text-slate-600" />
                  <select
                    value={subscriptionFilter}
                    onChange={(e) => setSubscriptionFilter(e.target.value as 'all' | 'true' | 'false')}
                    className="flex-1 px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">כל סוגי הקבלות</option>
                    <option value="false">🧾 קבלות חד-פעמי</option>
                    <option value="true">💳 קבלות הוראת קבע</option>
                  </select>
                </div>

                {/* Status Filter */}
                <div className="flex items-center gap-2">
                  <Filter size={20} className="text-slate-600" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="flex-1 px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">כל הסטטוסים</option>
                    <optgroup label="הצעות מחיר">
                      <option value="quote_sent">הצעה נשלחה</option>
                      <option value="quote_approved">הצעה אושרה</option>
                      <option value="quote_rejected">הצעה נדחתה</option>
                    </optgroup>
                    <optgroup label="קבלות">
                      <option value="draft">טיוטות</option>
                      <option value="sent">ממתינות לתשלום</option>
                      <option value="paid">שולמו</option>
                      <option value="cancelled">בוטלו</option>
                    </optgroup>
                  </select>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <div className="text-lg font-bold text-slate-800">דוח קבלות לתקופה</div>
                    <div className="text-sm text-slate-600">ברירת מחדל: קבלות ששולמו לפי תאריך תשלום</div>
                  </div>

                  <button
                    onClick={handleExportCsv}
                    disabled={isExporting}
                    className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold transition-all shadow-lg ${
                      isExporting
                        ? 'bg-slate-300 text-slate-600 cursor-not-allowed'
                        : 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:from-blue-700 hover:to-cyan-700'
                    }`}
                    title='יצוא CSV לרו"ח'
                  >
                    <Download size={18} />
                    <span>{isExporting ? 'מייצא...' : 'Export CSV'}</span>
                  </button>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => setPresetRange('current_month')}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
                    type="button"
                  >
                    חודש נוכחי
                  </button>
                  <button
                    onClick={() => setPresetRange('prev_month')}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
                    type="button"
                  >
                    חודש קודם
                  </button>
                  <button
                    onClick={() => setPresetRange('current_quarter')}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
                    type="button"
                  >
                    רבעון
                  </button>
                  <button
                    onClick={() => setPresetRange('current_year')}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
                    type="button"
                  >
                    שנה
                  </button>
                </div>

                <div className="grid md:grid-cols-4 gap-4">
                  <div className="flex items-center gap-2">
                    <Calendar size={20} className="text-slate-600" />
                    <div className="flex-1">
                      <input
                        type="date"
                        value={reportFrom}
                        onChange={(e) => setReportFrom(e.target.value)}
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Calendar size={20} className="text-slate-600" />
                    <div className="flex-1">
                      <input
                        type="date"
                        value={reportTo}
                        onChange={(e) => setReportTo(e.target.value)}
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <DollarSign size={20} className="text-slate-600" />
                    <select
                      value={subscriptionFilter}
                      onChange={(e) => setSubscriptionFilter(e.target.value as 'all' | 'true' | 'false')}
                      className="flex-1 px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">כל סוגי הקבלות</option>
                      <option value="false">🧾 קבלות חד-פעמי</option>
                      <option value="true">💳 קבלות הוראת קבע</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <Filter size={20} className="text-slate-600" />
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="flex-1 px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="paid">רק קבלות ששולמו</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Invoices List */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-600">טוען מסמכים...</div>
          ) : filteredInvoices.length === 0 ? (
            <div className="p-12 text-center text-slate-600">
              <FileText size={48} className="mx-auto mb-4 text-slate-400" />
              <p className="text-xl font-semibold mb-2">לא נמצאו מסמכים</p>
              <p className="text-sm">נסה לשנות את הפילטרים או החיפוש</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr className="text-right">
                    <th className="px-6 py-4 text-sm font-semibold text-slate-700">סוג</th>
                    <th className="px-6 py-4 text-sm font-semibold text-slate-700">מספר</th>
                    <th className="px-6 py-4 text-sm font-semibold text-slate-700">לקוח</th>
                    <th className="px-6 py-4 text-sm font-semibold text-slate-700">תאריך</th>
                    <th className="px-6 py-4 text-sm font-semibold text-slate-700">סכום</th>
                    <th className="px-6 py-4 text-sm font-semibold text-slate-700">סטטוס</th>
                    <th className="px-6 py-4 text-sm font-semibold text-slate-700">עסקה</th>
                    <th className="px-6 py-4 text-sm font-semibold text-slate-700">פעולות</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredInvoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-lg text-xs font-bold ${
                          invoice.document_type === 'quote' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-orange-100 text-orange-800'
                        }`}>
                          {invoice.document_type === 'quote' ? '📋 חשבון עסקה' : '🧾 קבלה'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-800">#{invoice.invoice_number}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-800">{invoice.user?.full_name || "לא ידוע"}</div>
                        <div className="text-sm text-slate-600">{invoice.user?.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-slate-700">
                          {new Date(invoice.created_at).toLocaleDateString("he-IL")}
                        </div>
                        {invoice.paid_at && (
                          <div className="text-xs text-green-600 mt-1">
                            שולם: {new Date(invoice.paid_at).toLocaleDateString("he-IL")}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-800">₪{invoice.total_amount.toFixed(2)}</div>
                      </td>
                      <td className="px-6 py-4">{getStatusBadge(invoice.status)}</td>
                      <td className="px-6 py-4">
                        {getPaymentCell(invoice)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <Link
                            href={invoice.document_type === 'quote' ? `/quote/${invoice.id}` : `/admin/invoices/${invoice.id}`}
                            className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors"
                            title={invoice.document_type === 'quote' ? 'צפייה בחשבון עסקה' : 'צפייה והדפסה'}
                          >
                            <Eye size={18} />
                          </Link>
                          {(invoice.status !== "paid" && invoice.status !== "quote_approved") && (
                            <button
                              onClick={() => handleCancelInvoice(invoice.id, invoice.invoice_number, invoice.document_type)}
                              className="p-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors"
                              title={invoice.document_type === 'quote' ? 'ביטול חשבון עסקה' : 'ביטול קבלה'}
                            >
                              <Ban size={18} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminInvoicesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">טוען מסמכים...</p>
        </div>
      </div>
    }>
      <AdminInvoicesContent />
    </Suspense>
  );
}

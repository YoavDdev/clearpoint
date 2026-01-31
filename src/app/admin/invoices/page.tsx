"use client";

import { useState, useEffect, Suspense } from "react";
import { FileText, User, Calendar, DollarSign, Eye, Printer, Search, Filter, Trash2, X, Loader2 } from "lucide-react";
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
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [documentTypeFilter, setDocumentTypeFilter] = useState("all");
  const userIdFilter = searchParams.get("user_id");

  useEffect(() => {
    fetchInvoices();
  }, [statusFilter, documentTypeFilter, userIdFilter]);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      let url = `/api/admin/invoices?status=${statusFilter}`;
      if (documentTypeFilter !== "all") {
        url += `&document_type=${documentTypeFilter}`;
      }
      if (userIdFilter) {
        url += `&user_id=${userIdFilter}`;
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

  const handleDeleteInvoice = async (invoiceId: string, invoiceNumber: string, documentType: 'quote' | 'invoice') => {
    const docName = documentType === 'quote' ? 'הצעת מחיר' : 'חשבונית';
    if (!confirm(`האם אתה בטוח שברצונך למחוק את ${docName} #${invoiceNumber}?`)) {
      return;
    }

    try {
      const response = await fetch("/api/admin/delete-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId }),
      });

      const result = await response.json();

      if (result.success) {
        const docName = documentType === 'quote' ? 'הצעת המחיר' : 'החשבונית';
        alert(`${docName} נמחקה בהצלחה`);
        fetchInvoices();
      } else {
        alert("שגיאה: " + result.error);
      }
    } catch (error) {
      console.error("Error deleting invoice:", error);
      const docName = documentType === 'quote' ? 'הצעת המחיר' : 'החשבונית';
      alert(`שגיאה במחיקת ${docName}`);
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
                <h1 className="text-4xl font-bold text-slate-800">ניהול חשבוניות</h1>
                <p className="text-slate-600">כל החשבוניות במערכת</p>
              </div>
            </div>
            <Link
              href="/admin/invoices/create"
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg font-medium"
            >
              <FileText size={20} />
              <span>צור חשבונית חדשה</span>
            </Link>
          </div>

          {/* User Filter Banner */}
          {userIdFilter && invoices.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <User size={20} className="text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-blue-900">מציג חשבוניות של: {invoices[0]?.user?.full_name || invoices[0]?.user?.email}</p>
                  <p className="text-xs text-blue-700">נמצאו {invoices.length} חשבוניות</p>
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
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
              <div className="text-slate-600 text-sm mb-2">סה"כ</div>
              <div className="text-3xl font-bold text-slate-800">{stats.total}</div>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-blue-200">
              <div className="text-blue-600 text-sm mb-2">הצעות מחיר</div>
              <div className="text-3xl font-bold text-blue-700">{stats.quotes}</div>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-orange-200">
              <div className="text-orange-600 text-sm mb-2">חשבוניות</div>
              <div className="text-3xl font-bold text-orange-700">{stats.invoices}</div>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-emerald-200">
              <div className="text-emerald-600 text-sm mb-2">הצעות אושרו</div>
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

          {/* Filters */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
            <div className="grid md:grid-cols-3 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="text"
                  placeholder="חיפוש לפי מספר חשבונית, שם לקוח או אימייל..."
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
                  <option value="quote">📋 הצעות מחיר</option>
                  <option value="invoice">💰 חשבוניות</option>
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
                  <optgroup label="חשבוניות">
                    <option value="draft">טיוטות</option>
                    <option value="sent">ממתינות לתשלום</option>
                    <option value="paid">שולמו</option>
                    <option value="cancelled">בוטלו</option>
                  </optgroup>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Invoices List */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-600">טוען חשבוניות...</div>
          ) : filteredInvoices.length === 0 ? (
            <div className="p-12 text-center text-slate-600">
              <FileText size={48} className="mx-auto mb-4 text-slate-400" />
              <p className="text-xl font-semibold mb-2">לא נמצאו חשבוניות</p>
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
                          {invoice.document_type === 'quote' ? '📋 הצעה' : '💰 חשבונית'}
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
                            title={invoice.document_type === 'quote' ? 'צפייה בהצעת מחיר' : 'צפייה והדפסה'}
                          >
                            <Eye size={18} />
                          </Link>
                          {(invoice.status !== "paid" && invoice.status !== "quote_approved") && (
                            <button
                              onClick={() => handleDeleteInvoice(invoice.id, invoice.invoice_number, invoice.document_type)}
                              className="p-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors"
                              title={invoice.document_type === 'quote' ? 'מחיקת הצעת מחיר' : 'מחיקת חשבונית'}
                            >
                              <Trash2 size={18} />
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
          <p className="text-slate-600">טוען חשבוניות...</p>
        </div>
      </div>
    }>
      <AdminInvoicesContent />
    </Suspense>
  );
}

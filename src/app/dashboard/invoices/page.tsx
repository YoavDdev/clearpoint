"use client";

import { useState, useEffect, Suspense } from "react";
import { FileText, Calendar, DollarSign, Eye } from "lucide-react";
import Link from "next/link";

export const dynamic = 'force-dynamic';

interface Invoice {
  id: string;
  invoice_number: string;
  status: string;
  total_amount: number;
  currency: string;
  created_at: string;
  paid_at: string | null;
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

  const stats = {
    total: invoices.length,
    paid: invoices.filter((i) => i.status === "paid").length,
    pending: invoices.filter((i) => i.status === "sent").length,
    totalPaid: invoices
      .filter((i) => i.status === "paid")
      .reduce((sum, i) => sum + Number(i.total_amount), 0),
  };

  if (loading) {
    return (
      <div dir="rtl" className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-slate-600">טוען חשבוניות...</p>
          </div>
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
            <h3 className="text-2xl font-bold text-slate-800 mb-2">אין חשבוניות עדיין</h3>
            <p className="text-slate-600">החשבוניות שלך יופיעו כאן</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
              <FileText size={32} className="text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-slate-800">החשבוניות שלי</h1>
              <p className="text-slate-600">כל החשבוניות וההיסטוריה שלך</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-slate-600 text-sm mb-1">סה"כ חשבוניות</div>
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

        <div className="space-y-4">
          {invoices.map((invoice) => (
            <div
              key={invoice.id}
              className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden hover:shadow-xl transition-all"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-2xl font-bold text-slate-800">חשבונית #{invoice.invoice_number}</h3>
                      {getStatusBadge(invoice.status)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        <Calendar size={16} />
                        <span>הונפקה: {new Date(invoice.created_at).toLocaleDateString("he-IL")}</span>
                      </div>
                      {invoice.paid_at && (
                        <div className="flex items-center gap-2 text-green-600">
                          <span>•</span>
                          <span>שולם: {new Date(invoice.paid_at).toLocaleDateString("he-IL")}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-left">
                    <div className="text-sm text-slate-600 mb-1">סכום</div>
                    <div className="text-3xl font-bold text-slate-800">₪{invoice.total_amount.toFixed(2)}</div>
                  </div>
                </div>

                {invoice.payment && (
                  <div className="bg-slate-50 rounded-xl p-4 mb-4">
                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-slate-600">סטטוס תשלום: </span>
                        <span className="font-semibold">
                          {invoice.payment.status === "completed"
                            ? "הושלם ✅"
                            : invoice.payment.status === "pending"
                            ? "בהמתנה ⏳"
                            : "נכשל ❌"}
                        </span>
                      </div>
                      {invoice.payment.provider_transaction_id && (
                        <div>
                          <span className="text-slate-600">מזהה עסקה: </span>
                          <span className="font-mono text-xs">
                            {invoice.payment.provider_transaction_id.substring(0, 20)}...
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {invoice.has_subscription && invoice.monthly_price && (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 mb-4 border border-blue-200">
                    <div className="flex items-center gap-2 text-blue-800 font-semibold mb-1">
                      <span>🔄</span>
                      <span>כולל מנוי חודשי</span>
                    </div>
                    <div className="text-sm text-blue-700">
                      מחודש 2 ואילך: ₪{invoice.monthly_price}/חודש (חיוב אוטומטי)
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <Link
                    href={`/invoice/${invoice.id}`}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-l from-blue-600 to-cyan-600 text-white rounded-xl hover:scale-105 transition-all shadow-lg font-bold"
                  >
                    <Eye size={20} />
                    <span>צפייה והדפסה</span>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
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

"use client";

import { useState } from "react";
import Link from "next/link";
import { Receipt, ExternalLink, Trash2 } from "lucide-react";
import SendInvoiceEmailButton from "./SendInvoiceEmailButton";

interface Invoice {
  id: string;
  invoice_number: string;
  document_type?: 'quote' | 'invoice';
  status: string;
  total_amount: number;
  created_at: string;
  has_subscription: boolean;
  monthly_price: number | null;
}

interface Props {
  initialInvoices: Invoice[];
  userId: string;
}

export default function CustomerInvoicesList({ initialInvoices, userId }: Props) {
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);

  const getDocLabel = (inv: Invoice) => {
    if (inv.document_type === 'quote') return 'חשבון עסקה';
    if (inv.document_type === 'invoice') return 'קבלה';
    return 'מסמך';
  };

  const handleDeleteInvoice = async (invoiceId: string, invoiceNumber: string) => {
    if (!confirm(`האם אתה בטוח שברצונך למחוק את המסמך #${invoiceNumber}?`)) {
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
        alert("המסמך נמחק בהצלחה");
        // Remove from local state
        setInvoices(invoices.filter((inv) => inv.id !== invoiceId));
      } else {
        alert("שגיאה: " + result.error);
      }
    } catch (error) {
      console.error("Error deleting invoice:", error);
      alert("שגיאה במחיקת המסמך");
    }
  };

  if (!invoices || invoices.length === 0) {
    return (
      <div className="text-center py-12">
        <Receipt className="mx-auto text-slate-300 mb-4" size={64} />
        <p className="text-slate-500 text-lg">אין מסמכים ללקוח זה</p>
        <p className="text-slate-400 text-sm mt-2">צור מסמך ראשון למטה</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b-2 border-slate-200">
            <th className="text-right py-3 px-4 font-semibold text-slate-700">מספר</th>
            <th className="text-right py-3 px-4 font-semibold text-slate-700">סוג</th>
            <th className="text-right py-3 px-4 font-semibold text-slate-700">תאריך</th>
            <th className="text-right py-3 px-4 font-semibold text-slate-700">סכום</th>
            <th className="text-right py-3 px-4 font-semibold text-slate-700">סטטוס</th>
            <th className="text-right py-3 px-4 font-semibold text-slate-700">מנוי</th>
            <th className="text-center py-3 px-4 font-semibold text-slate-700">פעולות</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((invoice) => (
            <tr key={invoice.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
              <td className="py-3 px-4 font-mono text-sm text-slate-800">
                #{invoice.invoice_number}
              </td>
              <td className="py-3 px-4 text-sm text-slate-700 font-medium">
                {getDocLabel(invoice)}
              </td>
              <td className="py-3 px-4 text-sm text-slate-600">
                {new Date(invoice.created_at).toLocaleDateString('he-IL')}
              </td>
              <td className="py-3 px-4 font-semibold text-slate-800">
                ₪{Number(invoice.total_amount).toFixed(2)}
              </td>
              <td className="py-3 px-4">
                {invoice.status === 'paid' ? (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-medium">
                    ✓ שולם
                  </span>
                ) : invoice.status === 'sent' ? (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium">
                    ⏳ ממתין
                  </span>
                ) : invoice.status === 'draft' ? (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium">
                    📝 טיוטה
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-medium">
                    ✗ בוטל
                  </span>
                )}
              </td>
              <td className="py-3 px-4">
                {invoice.has_subscription ? (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs font-medium">
                    🔄 ₪{Number(invoice.monthly_price).toFixed(0)}/ח׳
                  </span>
                ) : (
                  <span className="text-slate-400 text-xs">-</span>
                )}
              </td>
              <td className="py-3 px-4 text-center">
                <div className="flex items-center gap-2 justify-center">
                  <Link
                    href={`/invoice/${invoice.id}`}
                    target="_blank"
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
                  >
                    <span>צפייה</span>
                    <ExternalLink size={14} />
                  </Link>
                  <SendInvoiceEmailButton 
                    invoiceId={invoice.id} 
                    invoiceNumber={invoice.invoice_number}
                  />
                  {invoice.status === "sent" && (
                    <button
                      onClick={() => handleDeleteInvoice(invoice.id, invoice.invoice_number)}
                      className="p-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors"
                      title="מחיקת מסמך"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

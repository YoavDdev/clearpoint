'use client';

import { useEffect, useState } from 'react';
import { CreditCard, CheckCircle, XCircle, Clock, Loader2, FileText, Receipt } from 'lucide-react';

interface Payment {
  id: string;
  payment_type: string;
  amount: string;
  currency: string;
  status: string;
  description: string;
  paid_at: string | null;
  created_at: string;
  invoice_id: string | null;
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/user/payments');
        const result = await res.json();
        if (result.success) {
          setPayments(result.payments || []);
        }
      } catch (error) {
        console.error('Error loading payments:', error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div dir="rtl" className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
          <p className="text-slate-600 text-lg">טוען היסטוריית תשלומים...</p>
        </div>
      </div>
    );
  }

  const statusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
            <CheckCircle className="w-3 h-3" /> שולם
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold">
            <XCircle className="w-3 h-3" /> נכשל
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-bold">
            <Clock className="w-3 h-3" /> ממתין
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-bold">
            {status}
          </span>
        );
    }
  };

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6">
          <div className="flex items-center gap-3 mb-2">
            <Receipt className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-slate-900">היסטוריית תשלומים</h1>
          </div>
          <p className="text-slate-600">צפה בכל התשלומים שבוצעו במערכת</p>
        </div>

        {payments.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-12 text-center">
            <CreditCard className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-900 mb-2">אין תשלומים</h3>
            <p className="text-slate-600">עדיין לא בוצעו תשלומים</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
            <div className="divide-y divide-slate-100">
              {payments.map((payment) => (
                <div key={payment.id} className="p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        payment.status === 'completed' ? 'bg-green-100' :
                        payment.status === 'failed' ? 'bg-red-100' : 'bg-yellow-100'
                      }`}>
                        <CreditCard className={`w-5 h-5 ${
                          payment.status === 'completed' ? 'text-green-600' :
                          payment.status === 'failed' ? 'text-red-600' : 'text-yellow-600'
                        }`} />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{payment.description}</p>
                        <p className="text-sm text-slate-500">
                          {new Date(payment.paid_at || payment.created_at).toLocaleDateString('he-IL', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {statusBadge(payment.status)}
                      <p className="font-bold text-lg text-slate-900">
                        ₪{parseFloat(payment.amount).toFixed(0)}
                      </p>
                      {payment.invoice_id && (
                        <a
                          href={`/invoice/${payment.invoice_id}`}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="צפה בחשבונית"
                        >
                          <FileText className="w-5 h-5" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

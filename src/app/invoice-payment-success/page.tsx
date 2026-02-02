import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { CheckCircle, FileText, Home } from "lucide-react";
import Link from "next/link";

export default async function InvoicePaymentSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ invoice_id?: string }>;
}) {
  const { invoice_id: invoiceId } = await searchParams;

  let invoice = null;
  if (invoiceId) {
    const { data } = await supabaseAdmin
      .from("invoices")
      .select(`
        *,
        user:users (
          full_name,
          email
        )
      `)
      .eq("id", invoiceId)
      .single();
    invoice = data;
  }

  return (
    <main dir="rtl" className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-green-200">
          {/* Success Header */}
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-12 text-center">
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
              <CheckCircle size={56} className="text-green-600" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-3">
              ✅ התשלום בוצע בהצלחה!
            </h1>
            <p className="text-green-100 text-lg">
              תודה רבה על התשלום
            </p>
          </div>

          {/* Content */}
          <div className="p-8">
            {invoice ? (
              <div className="space-y-6">
                {/* Invoice Details */}
                <div className="bg-slate-50 rounded-2xl p-6 text-right">
                  <div className="flex items-center gap-3 mb-4 justify-end">
                    <h2 className="text-xl font-bold text-slate-800">פרטי קבלה</h2>
                    <FileText size={24} className="text-slate-600" />
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">מספר קבלה:</span>
                      <span className="font-semibold text-slate-800">#{invoice.invoice_number}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">סכום ששולם:</span>
                      <span className="font-semibold text-green-700">₪{invoice.total_amount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">שם לקוח:</span>
                      <span className="font-semibold text-slate-800">{invoice.user?.full_name || "לקוח"}</span>
                    </div>
                  </div>
                </div>

              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-6xl mb-4">🎉</div>
                <h2 className="text-2xl font-bold text-slate-800 mb-3">התשלום הושלם!</h2>
                <p className="text-slate-600">אישור נשלח לאימייל שלך</p>
              </div>
            )}

            {/* Contact Info */}
            <div className="mt-8 text-center">
              <p className="text-slate-600 mb-4">שאלות? צור קשר</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center text-sm">
                <a href="tel:0501234567" className="text-blue-600 hover:text-blue-700 font-medium">
                  📞 050-123-4567
                </a>
                <a href="mailto:info@clearpoint.co.il" className="text-blue-600 hover:text-blue-700 font-medium">
                  📧 info@clearpoint.co.il
                </a>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <Link
                href="/"
                className="flex-1 px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl font-bold text-center flex items-center justify-center gap-2"
              >
                <Home size={20} />
                <span>חזרה לדף הבית</span>
              </Link>
              {invoice && (
                <Link
                  href={`/invoice/${invoice.id}`}
                  className="flex-1 px-6 py-4 bg-white border-2 border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-all font-bold text-center flex items-center justify-center gap-2"
                >
                  <FileText size={20} />
                  <span>צפה בקבלה</span>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-slate-600 text-sm">
          <p>© 2024 Clearpoint Security. כל הזכויות שמורות.</p>
        </div>
      </div>
    </main>
  );
}

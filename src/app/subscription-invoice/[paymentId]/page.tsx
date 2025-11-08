import { supabaseAdmin } from "@/libs/supabaseAdmin";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Calendar, CreditCard, FileText, Receipt, User, Mail, Phone } from "lucide-react";

export default async function SubscriptionInvoicePage({
  params,
}: {
  params: { paymentId: string };
}) {
  const { paymentId } = await params;

  // קבלת פרטי התשלום
  const { data: payment, error: paymentError } = await supabaseAdmin
    .from("payments")
    .select(`
      *,
      user:users(
        id,
        full_name,
        email,
        phone,
        address
      )
    `)
    .eq("id", paymentId)
    .single();

  if (paymentError || !payment) {
    return notFound();
  }

  // קבלת פרטי המנוי
  const { data: subscription } = await supabaseAdmin
    .from("subscriptions")
    .select(`
      *,
      plan:plans(
        name,
        name_he,
        monthly_price,
        connection_type
      )
    `)
    .eq("user_id", payment.user_id)
    .single();

  // חישוב תקופת החיוב
  const paymentDate = new Date(payment.paid_at || payment.created_at);
  const nextBillingDate = new Date(paymentDate);
  nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

  const receiptNumber = `REC-${paymentId.substring(0, 8).toUpperCase()}`;

  return (
    <main dir="rtl" className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-t-2xl shadow-lg border-b-4 border-blue-600 p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="text-right">
              <h1 className="text-3xl font-bold text-slate-800 mb-2">חשבונית מנוי חודשי</h1>
              <p className="text-slate-600">Clearpoint Security - Cloud CCTV</p>
            </div>
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
              <Receipt size={32} className="text-white" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 mt-6">
            <div className="text-right">
              <h3 className="text-sm font-semibold text-slate-600 mb-2">פרטי חשבונית</h3>
              <div className="space-y-1">
                <p className="text-slate-800">
                  <span className="font-medium">מספר קבלה:</span> {receiptNumber}
                </p>
                <p className="text-slate-800">
                  <span className="font-medium">תאריך:</span>{" "}
                  {paymentDate.toLocaleDateString("he-IL")}
                </p>
                <p className="text-slate-800">
                  <span className="font-medium">סטטוס:</span>{" "}
                  {payment.status === "completed" ? (
                    <span className="text-green-600 font-bold">✅ שולם</span>
                  ) : (
                    <span className="text-yellow-600 font-bold">⏳ ממתין לתשלום</span>
                  )}
                </p>
              </div>
            </div>

            <div className="text-right">
              <h3 className="text-sm font-semibold text-slate-600 mb-2">פרטי לקוח</h3>
              <div className="space-y-1">
                <p className="text-slate-800 flex items-center gap-2 justify-end">
                  <span>{payment.user.full_name || payment.user.email}</span>
                  <User size={16} className="text-slate-400" />
                </p>
                <p className="text-slate-800 flex items-center gap-2 justify-end">
                  <span>{payment.user.email}</span>
                  <Mail size={16} className="text-slate-400" />
                </p>
                {payment.user.phone && (
                  <p className="text-slate-800 flex items-center gap-2 justify-end">
                    <span>{payment.user.phone}</span>
                    <Phone size={16} className="text-slate-400" />
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Invoice Details */}
        <div className="bg-white shadow-lg px-8 py-6">
          {/* תקופת חיוב */}
          <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
            <div className="flex items-center gap-2 justify-end mb-2">
              <h3 className="font-semibold text-blue-800">תקופת חיוב</h3>
              <Calendar size={18} className="text-blue-600" />
            </div>
            <p className="text-blue-700 text-right">
              {paymentDate.toLocaleDateString("he-IL")} -{" "}
              {nextBillingDate.toLocaleDateString("he-IL")}
            </p>
          </div>

          {/* פריטים */}
          <div className="mb-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4 text-right">פירוט חיוב</h3>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-slate-700">
                      סה"כ
                    </th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-slate-700">
                      מחיר יחידה
                    </th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-slate-700">
                      כמות
                    </th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-slate-700">
                      תיאור
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-slate-200 hover:bg-slate-50">
                    <td className="px-6 py-4 text-right font-bold text-slate-900">
                      ₪{parseFloat(payment.amount).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right text-slate-700">
                      ₪{parseFloat(payment.amount).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right text-slate-700">1</td>
                    <td className="px-6 py-4 text-right">
                      <div className="font-semibold text-slate-900">
                        {subscription?.plan?.name_he || "מנוי חודשי - Clearpoint Security"}
                      </div>
                      <div className="text-sm text-slate-600 mt-1">
                        שירות ענן עם אחסון וידאו
                        {subscription?.plan?.connection_type && (
                          <> • {subscription.plan.connection_type === "SIM" ? "SIM/4G" : "Wi-Fi"}</>
                        )}
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* סיכום */}
          <div className="flex justify-end">
            <div className="w-full max-w-sm space-y-3">
              <div className="flex justify-between items-center py-2 border-t border-slate-200">
                <span className="font-bold text-xl text-slate-900">
                  ₪{parseFloat(payment.amount).toLocaleString()}
                </span>
                <span className="text-slate-700">סה"כ לתשלום:</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-white rounded-b-2xl shadow-lg p-8 border-t border-slate-200">
          {payment.status === "pending" ? (
            <div className="text-center mb-6">
              <button
                onClick={() => {
                  if (payment.provider_payment_id) {
                    // פתיחת לינק תשלום של Grow
                    window.open(`https://payment.grow.co.il/process/${payment.provider_payment_id}`, "_blank");
                  } else {
                    alert("לינק תשלום לא זמין");
                  }
                }}
                className="w-full max-w-md mx-auto py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold text-lg hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg flex items-center justify-center gap-3"
              >
                <CreditCard size={24} />
                <span>שלם עכשיו</span>
              </button>
            </div>
          ) : (
            <div className="text-center mb-6 p-6 bg-green-50 rounded-xl border-2 border-green-200">
              <div className="text-6xl mb-3">✅</div>
              <h3 className="text-2xl font-bold text-green-800 mb-2">התשלום בוצע בהצלחה!</h3>
              <p className="text-green-700">
                תאריך תשלום:{" "}
                {payment.paid_at
                  ? new Date(payment.paid_at).toLocaleDateString("he-IL")
                  : paymentDate.toLocaleDateString("he-IL")}
              </p>
            </div>
          )}

          <div className="space-y-3 text-center text-sm text-slate-600">
            <p>תודה שבחרת ב-Clearpoint Security</p>
            <p>לשאלות ותמיכה: support@clearpoint-security.com | 03-1234567</p>
          </div>

          <div className="mt-6 text-center">
            <Link
              href="/dashboard/payments"
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium"
            >
              <FileText size={18} />
              <span>חזרה להיסטוריית תשלומים</span>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

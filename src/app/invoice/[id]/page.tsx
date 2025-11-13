import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { notFound, redirect } from "next/navigation";
import { CreditCard, FileText, Calendar, User, Package } from "lucide-react";

export default async function InvoiceViewPage({ params }: { params: { id: string } }) {
  const { id } = await params;

  // שליפת חשבונית עם פריטים
  const { data: invoice, error } = await supabaseAdmin
    .from("invoices")
    .select(`
      *,
      user:users (
        full_name,
        email,
        phone,
        address
      )
    `)
    .eq("id", id)
    .single();

  if (!invoice || error) {
    return notFound();
  }

  // שליפת פריטי החשבונית
  const { data: items } = await supabaseAdmin
    .from("invoice_items")
    .select("*")
    .eq("invoice_id", id)
    .order("sort_order", { ascending: true });

  // אם החשבונית כבר שולמה, נפנה לעמוד הצלחה
  if (invoice.status === "paid") {
    redirect(`/invoice-payment-success?invoice_id=${id}`);
  }

  const itemTypeEmojis: Record<string, string> = {
    nvr: "🖥️",
    camera: "📷",
    poe: "🔌",
    cable: "📡",
    labor: "🔧",
    other: "📦",
  };

  return (
    <main dir="rtl" className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <FileText size={40} className="text-white" />
          </div>
          <h1 className="text-4xl font-bold text-slate-800 mb-2">
            חשבונית #{invoice.invoice_number}
          </h1>
          <p className="text-slate-600">Clearpoint Security Systems</p>
        </div>

        {/* Invoice Card */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-white">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Company Info */}
              <div className="text-right">
                <h2 className="text-2xl font-bold mb-2">Clearpoint Security</h2>
                <p className="text-blue-100">מערכות אבטחה ומצלמות מתקדמות</p>
                <p className="text-blue-100 mt-2">טלפון: 050-123-4567</p>
                <p className="text-blue-100">אימייל: info@clearpoint.co.il</p>
              </div>

              {/* Customer Info */}
              <div className="text-right bg-white/10 rounded-2xl p-4 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-3 justify-end">
                  <span className="text-lg font-semibold">פרטי לקוח</span>
                  <User size={20} />
                </div>
                <p className="text-blue-50">{invoice.user?.full_name || "לקוח"}</p>
                <p className="text-blue-100 text-sm mt-1">{invoice.user?.email}</p>
                {invoice.user?.phone && (
                  <p className="text-blue-100 text-sm">{invoice.user.phone}</p>
                )}
                {invoice.user?.address && (
                  <p className="text-blue-100 text-sm mt-2">{invoice.user.address}</p>
                )}
              </div>
            </div>

            {/* Invoice Details */}
            <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-4 text-right">
              <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                <div className="text-blue-100 text-sm mb-1">מספר חשבונית</div>
                <div className="font-bold text-lg">#{invoice.invoice_number}</div>
              </div>
              <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                <div className="text-blue-100 text-sm mb-1">תאריך הנפקה</div>
                <div className="font-semibold">{new Date(invoice.created_at).toLocaleDateString("he-IL")}</div>
              </div>
              <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                <div className="text-blue-100 text-sm mb-1">סטטוס</div>
                <div className="font-semibold">
                  {invoice.status === "sent" ? "ממתין לתשלום" : "טיוטה"}
                </div>
              </div>
            </div>
          </div>

          {/* Items Section */}
          <div className="p-8">
            <div className="flex items-center gap-3 mb-6 justify-end">
              <h3 className="text-2xl font-bold text-slate-800">פרטי ציוד והתקנה</h3>
              <Package size={28} className="text-blue-600" />
            </div>

            {/* Items Table */}
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr className="text-right">
                    <th className="px-6 py-4 text-sm font-semibold text-slate-700">פריט</th>
                    <th className="px-6 py-4 text-sm font-semibold text-slate-700 text-center">כמות</th>
                    <th className="px-6 py-4 text-sm font-semibold text-slate-700 text-center">מחיר יחידה</th>
                    <th className="px-6 py-4 text-sm font-semibold text-slate-700 text-center">סה"כ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {items?.map((item, index) => (
                    <tr key={item.id} className={index % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-start gap-3 justify-end">
                          <div className="text-right">
                            <div className="font-semibold text-slate-800 mb-1">
                              {itemTypeEmojis[item.item_type]} {item.item_name}
                            </div>
                            {item.item_description && (
                              <div className="text-sm text-slate-600">{item.item_description}</div>
                            )}
                            {item.camera_type && (
                              <div className="text-xs text-blue-600 mt-1">רזולוציה: {item.camera_type}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center text-slate-700 font-medium">{item.quantity}</td>
                      <td className="px-6 py-4 text-center text-slate-700">₪{item.unit_price.toFixed(2)}</td>
                      <td className="px-6 py-4 text-center font-bold text-slate-800">₪{item.total_price.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Notes */}
            {invoice.notes && (
              <div className="mt-6 bg-blue-50 rounded-xl p-4 border border-blue-200">
                <div className="font-semibold text-slate-800 mb-2 text-right">הערות:</div>
                <div className="text-slate-700 text-right whitespace-pre-line">{invoice.notes}</div>
              </div>
            )}

            {/* Total Section */}
            <div className="mt-8 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 border-2 border-green-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <CreditCard size={40} className="text-green-600" />
                </div>
                <div className="text-right">
                  <div className="text-slate-600 text-sm mb-1">סכום לתשלום</div>
                  <div className="text-5xl font-bold text-green-700">
                    ₪{invoice.total_amount.toFixed(2)}
                  </div>
                  <div className="text-slate-500 text-sm mt-2">כולל מע"מ</div>
                </div>
              </div>
            </div>

            {/* Payment Button */}
            {invoice.payment_link && invoice.status === "sent" && (
              <div className="mt-8">
                <a
                  href={invoice.payment_link}
                  className="block w-full px-8 py-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl font-bold text-2xl text-center"
                >
                  💳 לחץ כאן לתשלום מאובטח
                </a>
                <p className="text-center text-slate-500 text-sm mt-4">
                  תשלום מאובטח באמצעות Grow Payment Gateway
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-slate-600 text-sm">
          <p>תודה על הזמנתך! במידה ויש שאלות, צור קשר עם התמיכה שלנו</p>
          <p className="mt-2">© 2024 Clearpoint Security. כל הזכויות שמורות.</p>
        </div>
      </div>
    </main>
  );
}

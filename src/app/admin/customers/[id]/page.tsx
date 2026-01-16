import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { notFound } from "next/navigation";
import Link from "next/link";
import EditMonthlyPrice from "@/components/EditMonthlyPrice";
import CopyButton from "@/components/CopyButton";
import {
  User,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Calendar,
  FileText,
  ArrowLeft,
  Edit,
  Wifi,
  Smartphone,
  Receipt,
  Key,
  ExternalLink,
  RefreshCw,
  Building2,
  Hash,
  MapPinned,
} from "lucide-react";

export default async function CustomerViewPage({ params }: { params: { id: string } }) {
  const { id } = await params;

  const { data: user, error} = await supabaseAdmin
    .from("users")
    .select(`
      *,
      plan:plans (
        id,
        name,
        name_he,
        monthly_price,
        retention_days,
        connection_type
      )
    `)
    .eq("id", id)
    .single();

  if (!user || error) {
    console.error("❌ Failed to fetch user:", error);
    return notFound();
  }

  return (
    <main dir="rtl" className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="text-right">
              <h1 className="text-4xl font-bold text-slate-800 mb-2">פרטי לקוח</h1>
              <p className="text-slate-600">צפייה ועריכת פרטי לקוח במערכת</p>
            </div>
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center shadow-lg">
              <User size={32} className="text-white" />
            </div>
          </div>
          
          {/* Navigation */}
          <div className="flex items-center gap-4 mb-6">
            <Link
              href="/admin/customers"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <ArrowLeft size={16} />
              <span>חזרה לרשימת לקוחות</span>
            </Link>
            
            <Link
              href={`/admin/customers/${id}/edit`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Edit size={16} />
              <span>עריכת פרטים</span>
            </Link>
          </div>
        </div>

        {/* Customer Details */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column - Contact Info */}
              <div className="space-y-6">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2 justify-end">
                    <span>פרטי יצירת קשר</span>
                    <Mail className="text-blue-600" size={20} />
                  </h3>
                </div>

                {/* Full Name */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 text-right flex items-center gap-2 justify-end">
                    <span>שם מלא</span>
                    <User size={16} className="text-slate-400" />
                  </label>
                  <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-right text-slate-800">
                    {user.full_name || "לא צוין"}
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 text-right flex items-center gap-2 justify-end">
                    <span>כתובת אימייל</span>
                    <Mail size={16} className="text-slate-400" />
                  </label>
                  <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-right text-slate-800">
                    {user.email}
                  </div>
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 text-right flex items-center gap-2 justify-end">
                    <span>מספר טלפון</span>
                    <Phone size={16} className="text-slate-400" />
                  </label>
                  <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-right text-slate-800">
                    {user.phone || "לא צוין"}
                  </div>
                </div>

                {/* Address */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 text-right flex items-center gap-2 justify-end">
                    <span>כתובת</span>
                    <MapPin size={16} className="text-slate-400" />
                  </label>
                  <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-right text-slate-800">
                    {user.address || "לא צוין"}
                  </div>
                </div>

                {/* Communication Email */}
                {user.communication_email && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 text-right flex items-center gap-2 justify-end">
                      <span>אימייל תקשורת</span>
                      <Mail size={16} className="text-slate-400" />
                    </label>
                    <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-right text-slate-800">
                      {user.communication_email}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column - Business Info & Plan */}
              <div className="space-y-6">
                {/* Business Details Section */}
                {(user.vat_number || user.business_city || user.business_postal_code) && (
                  <>
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2 justify-end">
                        <span>פרטים עסקיים</span>
                        <Building2 className="text-orange-600" size={20} />
                      </h3>
                    </div>

                    {/* VAT Number */}
                    {user.vat_number && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 text-right flex items-center gap-2 justify-end">
                          <span>ח.פ / ע.מ</span>
                          <Hash size={16} className="text-slate-400" />
                        </label>
                        <div className="px-4 py-3 bg-orange-50 border border-orange-200 rounded-lg text-right text-slate-800 font-mono">
                          {user.vat_number}
                        </div>
                      </div>
                    )}

                    {/* Business City */}
                    {user.business_city && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 text-right flex items-center gap-2 justify-end">
                          <span>עיר</span>
                          <MapPinned size={16} className="text-slate-400" />
                        </label>
                        <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-right text-slate-800">
                          {user.business_city}
                        </div>
                      </div>
                    )}

                    {/* Business Postal Code */}
                    {user.business_postal_code && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 text-right flex items-center gap-2 justify-end">
                          <span>מיקוד</span>
                          <Hash size={16} className="text-slate-400" />
                        </label>
                        <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-right text-slate-800 font-mono">
                          {user.business_postal_code}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Plan & Billing Section */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2 justify-end">
                    <span>מנוי ותשלומים</span>
                    <CreditCard className="text-purple-600" size={20} />
                  </h3>
                </div>

                {/* Plan */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 text-right flex items-center gap-2 justify-end">
                    <span>תוכנית מנוי</span>
                    <CreditCard size={16} className="text-slate-400" />
                  </label>
                  {!user.plan_id || user.plan_id === "" ? (
                    <div className="px-4 py-3 bg-red-50 border-2 border-red-300 rounded-lg text-right">
                      <div className="flex items-center gap-2 justify-end mb-2">
                        <span className="font-semibold text-red-800">❌ אין תוכנית</span>
                      </div>
                      <div className="text-sm text-red-700 mb-2">
                        לא ניתן ליצור תשלום מושלם ללא תוכנית מנוי
                      </div>
                      <Link
                        href={`/admin/customers/${id}/edit`}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
                      >
                        <Edit size={14} />
                        <span>בחר תוכנית</span>
                      </Link>
                    </div>
                  ) : (
                    <div className="px-4 py-3 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg text-right">
                      <div className="font-semibold text-purple-800">{user.plan?.name || "לא צוין"}</div>
                      {user.plan?.connection_type && (
                        <div className="text-sm text-purple-600 mt-1">
                          סוג חיבור: {user.plan.connection_type === 'SIM' ? 'SIM/4G' : 'Wi-Fi Cloud'}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Monthly Price */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 text-right flex items-center gap-2 justify-end">
                    <span>מחיר חודשי</span>
                    <CreditCard size={16} className="text-slate-400" />
                  </label>
                  <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-right">
                    <EditMonthlyPrice
                      userId={user.id}
                      currentPrice={user.custom_price ?? user.plan?.monthly_price ?? 0}
                    />
                    {user.custom_price && user.plan?.monthly_price && user.custom_price !== user.plan.monthly_price && (
                      <div className="text-sm text-orange-600 mt-2">
                        מחיר רגיל של התוכנית: ₪{user.plan.monthly_price}
                      </div>
                    )}
                  </div>
                </div>

                {/* Retention Period */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 text-right flex items-center gap-2 justify-end">
                    <span>תקופת שמירת קבצים</span>
                    <Calendar size={16} className="text-slate-400" />
                  </label>
                  <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-right text-slate-800">
                    {user.plan_duration_days ?? user.plan?.retention_days ?? 0} ימים
                  </div>
                </div>

                {/* Tunnel Name */}
                {user.tunnel_name && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 text-right flex items-center gap-2 justify-end">
                      <span>שם טאנל</span>
                      <Wifi size={16} className="text-slate-400" />
                    </label>
                    <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-right text-slate-800 font-mono">
                      {user.tunnel_name}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Notes - Full Width */}
            {user.notes && (
              <div className="mt-8 space-y-2">
                <label className="text-sm font-medium text-slate-700 text-right flex items-center gap-2 justify-end">
                  <span>הערות</span>
                  <FileText size={16} className="text-slate-400" />
                </label>
                <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-right text-slate-800 leading-relaxed">
                  {user.notes}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Create Invoice */}
          <Link
            href={`/admin/invoices/create?user_id=${id}`}
            className="group bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl shadow-sm border-2 border-green-200 p-6 hover:shadow-lg hover:border-green-400 transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="text-right flex-1">
                <h3 className="text-lg font-semibold text-slate-800 mb-1 flex items-center gap-2 justify-end">
                  <span>צור חשבונית</span>
                  <FileText className="text-green-600" size={22} />
                </h3>
                <p className="text-sm text-slate-600">הצעת מחיר / חשבונית לתשלום</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 text-green-600 font-semibold group-hover:gap-3 transition-all">
              <span className="text-sm">צור עכשיו</span>
              <ExternalLink size={16} />
            </div>
          </Link>

          {/* Invoices Link */}
          <Link
            href={`/admin/invoices?user_id=${id}`}
            className="group bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-lg hover:border-blue-300 transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="text-right flex-1">
                <h3 className="text-lg font-semibold text-slate-800 mb-1 flex items-center gap-2 justify-end">
                  <span>חשבוניות הלקוח</span>
                  <Receipt className="text-blue-600" size={22} />
                </h3>
                <p className="text-sm text-slate-600">צפייה בכל החשבוניות שהונפקו</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 text-blue-600 group-hover:gap-3 transition-all">
              <span className="text-sm font-medium">צפה בחשבוניות</span>
              <ExternalLink size={16} />
            </div>
          </Link>

          {/* Recurring Payments Link */}
          <Link
            href={`/admin/recurring-payments?user_id=${id}`}
            className="group bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-lg hover:border-purple-300 transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="text-right flex-1">
                <h3 className="text-lg font-semibold text-slate-800 mb-1 flex items-center gap-2 justify-end">
                  <span>מנוי חודשי</span>
                  <RefreshCw className="text-purple-600" size={22} />
                </h3>
                <p className="text-sm text-slate-600">צפייה במנוי החוזר של הלקוח</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 text-purple-600 group-hover:gap-3 transition-all">
              <span className="text-sm font-medium">צפה במנוי</span>
              <ExternalLink size={16} />
            </div>
          </Link>
        </div>
      </div>
    </main>
  );
}
import { supabaseAdmin } from "@/libs/supabaseAdmin";
import { notFound } from "next/navigation";
import Link from "next/link";
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
} from "lucide-react";

export default async function CustomerViewPage({ params }: { params: { id: string } }) {
  const { id } = await params;

  const { data: user, error } = await supabaseAdmin
    .from("users")
    .select(`
      *,
      plan:plans (
        name,
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
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <div className="text-right">
                <h2 className="text-xl font-semibold text-slate-800">{user.full_name || user.email}</h2>
                <p className="text-slate-600 mt-1">מזהה לקוח: {user.id}</p>
              </div>
              <div className="flex items-center gap-3">
                {user.plan?.connection_type === 'SIM' ? (
                  <div className="flex items-center gap-2 px-3 py-1 bg-orange-100 text-orange-700 rounded-lg text-sm font-medium">
                    <Smartphone size={16} />
                    <span>SIM/4G</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium">
                    <Wifi size={16} />
                    <span>Wi-Fi Cloud</span>
                  </div>
                )}
                {user.needs_support && (
                  <div className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-sm font-medium">
                    זקוק לתמיכה
                  </div>
                )}
              </div>
            </div>
          </div>

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
              </div>

              {/* Right Column - Plan & Billing */}
              <div className="space-y-6">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2 justify-end">
                    <span>מנוי ותשלומים</span>
                    <CreditCard className="text-purple-600" size={20} />
                  </h3>
                </div>

                {/* Plan */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 text-right flex items-center gap-2 justify-end">
                    <span>מסלול מנוי</span>
                    <CreditCard size={16} className="text-slate-400" />
                  </label>
                  <div className="px-4 py-3 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg text-right">
                    <div className="font-semibold text-purple-800">{user.plan?.name || "לא צוין"}</div>
                    {user.plan?.connection_type && (
                      <div className="text-sm text-purple-600 mt-1">
                        סוג חיבור: {user.plan.connection_type === 'SIM' ? 'SIM/4G' : 'Wi-Fi Cloud'}
                      </div>
                    )}
                  </div>
                </div>

                {/* Monthly Price */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 text-right flex items-center gap-2 justify-end">
                    <span>מחיר חודשי</span>
                    <CreditCard size={16} className="text-slate-400" />
                  </label>
                  <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-right text-slate-800">
                    ₪{user.custom_price ?? user.plan?.monthly_price ?? 0}
                    {user.custom_price && user.plan?.monthly_price && user.custom_price !== user.plan.monthly_price && (
                      <span className="text-sm text-orange-600 mr-2">
                        (מחיר רגיל: ₪{user.plan.monthly_price})
                      </span>
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
      </div>
    </main>
  );
}
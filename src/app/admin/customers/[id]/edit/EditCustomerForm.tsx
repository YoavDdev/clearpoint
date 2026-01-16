"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  Save,
  Wifi,
  Smartphone,
  DollarSign,
  Building2,
  Hash,
  MapPinned,
} from "lucide-react";

interface Plan {
  id: string;
  name: string;
  monthly_price: number;
  retention_days: number;
  connection_type: string;
}

interface Props {
  user: {
    id: string;
    full_name: string | null;
    phone: string | null;
    address: string | null;
    notes: string | null;
    plan_id: string | null;
    plan_duration_days: number | null;
    custom_price: number | null;
    vat_number?: string | null;
    business_city?: string | null;
    business_postal_code?: string | null;
    communication_email?: string | null;
  };
}

export default function EditCustomerForm({ user }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);

  const [fullName, setFullName] = useState(user.full_name || "");
  const [phone, setPhone] = useState(user.phone || "");
  const [address, setAddress] = useState(user.address || "");
  const [notes, setNotes] = useState(user.notes || "");
  const [planId, setPlanId] = useState(user.plan_id || "");
  const [customPrice, setCustomPrice] = useState(user.custom_price?.toString() || "");
  const [retention, setRetention] = useState(user.plan_duration_days || 7);
  
  // Business fields
  const [vatNumber, setVatNumber] = useState(user.vat_number || "");
  const [businessCity, setBusinessCity] = useState(user.business_city || "");
  const [businessPostalCode, setBusinessPostalCode] = useState(user.business_postal_code || "");
  const [communicationEmail, setCommunicationEmail] = useState(user.communication_email || "");

  useEffect(() => {
    fetch("/api/plans")
      .then((res) => res.json())
      .then((data) => {
        setPlans(data.plans || []);
      });
  }, []);

  // Auto-fill defaults from selected plan
  useEffect(() => {
    const selected = plans.find((p) => p.id === planId);
    if (selected) {
      if (!user.custom_price) setCustomPrice(selected.monthly_price.toString());
      if (!user.plan_duration_days) setRetention(selected.retention_days);
    }
  }, [planId, plans]);

  const handleSave = async () => {
    setSaving(true);
    const response = await fetch("/api/admin-edit-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: user.id,
        full_name: fullName,
        phone,
        address,
        notes,
        plan_id: planId,
        plan_duration_days: retention,
        custom_price: customPrice ? Number(customPrice) : null,
        // Business fields
        vat_number: vatNumber || null,
        business_city: businessCity || null,
        business_postal_code: businessPostalCode || null,
        communication_email: communicationEmail || null,
      }),
    });

    setSaving(false);
    const result = await response.json();

    if (!result.success) {
      alert("שגיאה בשמירה: " + result.error);
    } else {
      alert("הלקוח עודכן בהצלחה!");
      router.push(`/admin/customers/${user.id}`);
    }
  };

  return (
    <main dir="rtl" className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="text-right">
              <h1 className="text-4xl font-bold text-slate-800 mb-2">עריכת לקוח</h1>
              <p className="text-slate-600">עדכון פרטי לקוח במערכת</p>
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
              href={`/admin/customers/${user.id}`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
            >
              <User size={16} />
              <span>צפייה בפרטי לקוח</span>
            </Link>
          </div>
        </div>

        {/* Edit Form */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border-b border-slate-200">
            <div className="text-right">
              <h2 className="text-xl font-semibold text-slate-800">עריכת פרטי לקוח</h2>
              <p className="text-slate-600 mt-1">מזהה לקוח: {user.id}</p>
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
                  <input
                    type="text"
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg text-right focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="הזן שם מלא"
                  />
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 text-right flex items-center gap-2 justify-end">
                    <span>מספר טלפון</span>
                    <Phone size={16} className="text-slate-400" />
                  </label>
                  <input
                    type="tel"
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg text-right focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="הזן מספר טלפון"
                  />
                </div>

                {/* Address */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 text-right flex items-center gap-2 justify-end">
                    <span>כתובת</span>
                    <MapPin size={16} className="text-slate-400" />
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg text-right focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="הזן כתובת"
                  />
                </div>

                {/* Communication Email */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 text-right flex items-center gap-2 justify-end">
                    <span>אימייל תקשורת (אופציונלי)</span>
                    <Mail size={16} className="text-slate-400" />
                  </label>
                  <input
                    type="email"
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg text-right focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    value={communicationEmail}
                    onChange={(e) => setCommunicationEmail(e.target.value)}
                    placeholder="אימייל נפרד לתקשורת (אם שונה)"
                  />
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 text-right flex items-center gap-2 justify-end">
                    <span>הערות</span>
                    <FileText size={16} className="text-slate-400" />
                  </label>
                  <textarea
                    rows={4}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg text-right focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="הזן הערות נוספות"
                  />
                </div>
              </div>

              {/* Right Column - Business & Billing Info */}
              <div className="space-y-6">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2 justify-end">
                    <span>פרטים עסקיים</span>
                    <Building2 className="text-orange-600" size={20} />
                  </h3>
                </div>

                {/* VAT Number */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 text-right flex items-center gap-2 justify-end">
                    <span>ח.פ / ע.מ</span>
                    <Hash size={16} className="text-slate-400" />
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg text-right focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                    value={vatNumber}
                    onChange={(e) => setVatNumber(e.target.value)}
                    placeholder="הזן מספר ח.פ או ע.מ"
                  />
                </div>

                {/* Business City */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 text-right flex items-center gap-2 justify-end">
                    <span>עיר</span>
                    <MapPinned size={16} className="text-slate-400" />
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg text-right focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                    value={businessCity}
                    onChange={(e) => setBusinessCity(e.target.value)}
                    placeholder="הזן עיר"
                  />
                </div>

                {/* Business Postal Code */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 text-right flex items-center gap-2 justify-end">
                    <span>מיקוד</span>
                    <Hash size={16} className="text-slate-400" />
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg text-right focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                    value={businessPostalCode}
                    onChange={(e) => setBusinessPostalCode(e.target.value)}
                    placeholder="הזן מיקוד"
                  />
                </div>
              </div>
            </div>

            {/* Subscription & Pricing Section */}
            <div className="mt-8 pt-8 border-t border-slate-200">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2 justify-end">
                  <span>מנוי ותשלומים</span>
                  <CreditCard className="text-purple-600" size={20} />
                </h3>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                {/* Plan Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 text-right flex items-center gap-2 justify-end">
                    <span>מסלול מנוי</span>
                    <CreditCard size={16} className="text-slate-400" />
                  </label>
                  <div className="relative">
                    <select
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg text-right focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors appearance-none bg-white"
                      value={planId}
                      onChange={(e) => setPlanId(e.target.value)}
                    >
                      <option value="">בחר מסלול מנוי</option>
                      {plans.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.connection_type === 'SIM' ? 'SIM/4G' : 'Wi-Fi Cloud'}) - ₪{p.monthly_price}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Plan Info Display */}
                  {planId && (() => {
                    const selectedPlan = plans.find(p => p.id === planId);
                    return selectedPlan ? (
                      <div className="mt-3 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg">
                        <div className="flex items-center gap-2 justify-end mb-2">
                          {selectedPlan.connection_type === 'SIM' ? (
                            <>
                              <span className="text-sm font-medium text-orange-700">SIM/4G</span>
                              <Smartphone size={16} className="text-orange-600" />
                            </>
                          ) : (
                            <>
                              <span className="text-sm font-medium text-blue-700">Wi-Fi Cloud</span>
                              <Wifi size={16} className="text-blue-600" />
                            </>
                          )}
                        </div>
                        <div className="text-sm text-slate-600 text-right">
                          מחיר בסיסי: ₪{selectedPlan.monthly_price} | שמירה: {selectedPlan.retention_days} ימים
                        </div>
                      </div>
                    ) : null;
                  })()}
                </div>

                {/* Retention Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 text-right flex items-center gap-2 justify-end">
                    <span>תקופת שמירת קבצים</span>
                    <Calendar size={16} className="text-slate-400" />
                  </label>
                  <select
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg text-right focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors appearance-none bg-white"
                    value={retention}
                    onChange={(e) => setRetention(Number(e.target.value))}
                  >
                    <option value={1}>1 יום</option>
                    <option value={3}>3 ימים</option>
                    <option value={7}>7 ימים</option>
                    <option value={14}>14 ימים</option>
                  </select>
                </div>

                {/* Custom Price */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 text-right flex items-center gap-2 justify-end">
                    <span>מחיר חודשי מותאם (אופציונלי)</span>
                    <DollarSign size={16} className="text-slate-400" />
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg text-right focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                      value={customPrice}
                      onChange={(e) => setCustomPrice(e.target.value)}
                      placeholder="למשל: 99"
                      min="0"
                      step="1"
                    />
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 text-sm">
                      ₪
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 text-right mt-1">
                    השאר ריק כדי להשתמש במחיר הבסיסי של המסלול
                  </p>
                </div>
              </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-8 flex gap-4 justify-end">
              <Link
                href={`/admin/customers/${user.id}`}
                className="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                ביטול
              </Link>
              <button
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg transition-colors"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>שומר...</span>
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    <span>שמור שינויים</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

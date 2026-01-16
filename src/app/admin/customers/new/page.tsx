"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

export const dynamic = 'force-dynamic';

import {
  UserPlus,
  Mail,
  User,
  Phone,
  MapPin,
  FileText,
  CreditCard,
  Wifi,
  Smartphone,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
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

function NewCustomerForm() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [planId, setPlanId] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [retention, setRetention] = useState<number | null>(null);
  const [customPrice, setCustomPrice] = useState<number | null>(null);
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [tunnelName, setTunnelName] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Business fields
  const [vatNumber, setVatNumber] = useState("");
  const [businessCity, setBusinessCity] = useState("");
  const [businessPostalCode, setBusinessPostalCode] = useState("");
  const [communicationEmail, setCommunicationEmail] = useState("");

  const searchParams = useSearchParams();

  // ✅ Load plans
  useEffect(() => {
    fetch("/api/plans")
      .then((res) => res.json())
      .then((data) => setPlans(data.plans || []));
  }, []);

  // ✅ Populate from query string if needed
  useEffect(() => {
    const fullName = searchParams.get("fullName");
    const email = searchParams.get("email");
    const phone = searchParams.get("phone");
    const address = searchParams.get("address");

    if (fullName) setFullName(fullName);
    if (email) setEmail(email);
    if (phone) setPhone(phone);
    if (address) setAddress(address);
  }, [searchParams]);

  // ✅ Auto-fill price & retention when plan changes
  useEffect(() => {
    const selected = plans.find((p) => p.id === planId);
    if (selected) {
      setCustomPrice(selected.monthly_price);
      setRetention(selected.retention_days);
    }
  }, [planId]);

  const handleCreateCustomer = async () => {
    if (!planId) {
      alert("יש לבחור מסלול מנוי.");
      return;
    }
    
    // Get the selected plan to ensure we have the correct retention
    const selectedPlan = plans.find((p) => p.id === planId);
    if (!selectedPlan) {
      alert("מסלול המנוי שנבחר לא נמצא.");
      return;
    }

    setLoading(true);

    const response = await fetch("/api/admin-invite-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        full_name: fullName,
        phone,
        address,
        notes,
        plan_id: planId,
        plan_duration_days: selectedPlan.retention_days,
        custom_price: customPrice,
        tunnel_name: tunnelName,
        // Business fields
        vat_number: vatNumber || null,
        business_city: businessCity || null,
        business_postal_code: businessPostalCode || null,
        communication_email: communicationEmail || null,
      }),
    });

    const result = await response.json();

    if (!result.success) {
      alert("שגיאה ביצירת לקוח: " + result.error);
      console.error(result.error);
    } else {
      alert("✅ הלקוח נוצר בהצלחה!");
    }

    setEmail("");
    setFullName("");
    setPlanId(null);
    setRetention(null);
    setCustomPrice(null);
    setPhone("");
    setAddress("");
    setNotes("");
    setTunnelName("");
    // Reset business fields
    setVatNumber("");
    setBusinessCity("");
    setBusinessPostalCode("");
    setCommunicationEmail("");
    setLoading(false);
  };

  return (
    <main dir="rtl" className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="text-right">
              <h1 className="text-4xl font-bold text-slate-800 mb-2">הוספת לקוח חדש</h1>
              <p className="text-slate-600">יצירת חשבון לקוח חדש במערכת</p>
            </div>
            <div className="w-16 h-16 bg-gradient-to-br from-green-600 to-green-700 rounded-2xl flex items-center justify-center shadow-lg">
              <UserPlus size={32} className="text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Form Header */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 border-b border-slate-200">
            <h2 className="text-xl font-semibold text-slate-800 text-right">פרטי הלקוח החדש</h2>
            <p className="text-slate-600 text-right mt-1">מלא את כל הפרטים הנדרשים ליצירת חשבון לקוח</p>
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

                {/* Email */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 text-right flex items-center gap-2 justify-end">
                    <span>כתובת אימייל *</span>
                    <Mail size={16} className="text-slate-400" />
                  </label>
                  <input
                    type="email"
                    placeholder="example@email.com"
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg text-right focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoFocus
                  />
                </div>

                {/* Full Name */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 text-right flex items-center gap-2 justify-end">
                    <span>שם מלא *</span>
                    <User size={16} className="text-slate-400" />
                  </label>
                  <input
                    type="text"
                    placeholder="שם פרטי ומשפחה"
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg text-right focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
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
                    placeholder="050-1234567"
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg text-right focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
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
                    placeholder="רחוב, עיר"
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg text-right focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
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
                    placeholder="אימייל נפרד לתקשורת (אם שונה)"
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg text-right focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                    value={communicationEmail}
                    onChange={(e) => setCommunicationEmail(e.target.value)}
                  />
                </div>
              </div>

              {/* Right Column - Business Info */}
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
                    placeholder="הזן מספר ח.פ או ע.מ"
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg text-right focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                    value={vatNumber}
                    onChange={(e) => setVatNumber(e.target.value)}
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
                    placeholder="הזן עיר"
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg text-right focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                    value={businessCity}
                    onChange={(e) => setBusinessCity(e.target.value)}
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
                    placeholder="הזן מיקוד"
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg text-right focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                    value={businessPostalCode}
                    onChange={(e) => setBusinessPostalCode(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Subscription & Technical Section */}
            <div className="mt-8 pt-8 border-t border-slate-200">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2 justify-end">
                  <span>הגדרות טכניות ומנוי</span>
                  <CreditCard className="text-purple-600" size={20} />
                </h3>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                {/* Tunnel Name */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 text-right flex items-center gap-2 justify-end">
                    <span>שם טאנל (tunnel_name)</span>
                    <Wifi size={16} className="text-slate-400" />
                  </label>
                  <input
                    type="text"
                    placeholder="example-tunnel"
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg text-right focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                    value={tunnelName}
                    onChange={(e) => setTunnelName(e.target.value)}
                  />
                </div>
              </div>

              {/* Right Column - Plan Selection */}
              <div className="space-y-6">
                {/* Plan Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 text-right flex items-center gap-2 justify-end">
                    <span>בחר מסלול מנוי *</span>
                    <CreditCard size={16} className="text-slate-400" />
                  </label>
                  <select
                    value={planId ?? ""}
                    onChange={(e) => setPlanId(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg text-right focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors text-lg"
                  >
                    <option value="" disabled>בחר מסלול מנוי</option>
                    
                    {/* Wi-Fi Cloud Plans - הכי פופולרי */}
                    <optgroup label="🔥 Wi-Fi Cloud - חיבור לאינטרנט קיים">
                      {plans.filter(p => p.connection_type === 'wifi_cloud' || p.connection_type === 'wifi').map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} - ₪{p.monthly_price}/חודש
                        </option>
                      ))}
                    </optgroup>
                    
                    {/* SIM Plans */}
                    <optgroup label="📡 SIM Cloud - כולל ראוטר SIM + גלישה">
                      {plans.filter(p => p.connection_type === 'sim' || p.connection_type === 'sim_router').map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} - ₪{p.monthly_price}/חודש
                        </option>
                      ))}
                    </optgroup>
                  </select>
                  
                  {/* Show selected plan details */}
                  {planId && (
                    <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center gap-2 justify-end mb-3">
                        <span className="font-semibold text-blue-800">פרטי המסלול הנבחר</span>
                        <CheckCircle size={16} className="text-blue-600" />
                      </div>
                      <div className="space-y-2 text-sm text-blue-800 text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <span><strong>שם המסלול:</strong> {plans.find(p => p.id === planId)?.name}</span>
                          {['sim', 'sim_router'].includes(plans.find(p => p.id === planId)?.connection_type || '') ? 
                            <Smartphone size={16} className="text-blue-600" /> : 
                            <Wifi size={16} className="text-blue-600" />
                          }
                        </div>
                        <div><strong>תקופת שמירה:</strong> {plans.find(p => p.id === planId)?.retention_days} ימים</div>
                        <div><strong>מחיר:</strong> ₪{plans.find(p => p.id === planId)?.monthly_price}/חודש</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Custom Price */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 text-right flex items-center gap-2 justify-end">
                    <span>מחיר חודשי מותאם (אופציונלי)</span>
                    <CreditCard size={16} className="text-slate-400" />
                  </label>
                  <input
                    type="number"
                    placeholder="הכנס מחיר מותאם"
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg text-right focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                    value={customPrice ?? ""}
                    onChange={(e) => setCustomPrice(e.target.value ? Number(e.target.value) : null)}
                  />
                </div>
              </div>
            </div>

            {/* Notes - Full Width */}
            <div className="mt-8 space-y-2">
              <label className="text-sm font-medium text-slate-700 text-right flex items-center gap-2 justify-end">
                <span>הערות נוספות</span>
                <FileText size={16} className="text-slate-400" />
              </label>
              <textarea
                rows={4}
                placeholder="הערות, הוראות מיוחדות או מידע נוסף על הלקוח..."
                className="w-full px-4 py-3 border border-slate-300 rounded-lg text-right focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors resize-none"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {/* Action Buttons */}
            <div className="mt-8 pt-6 border-t border-slate-200">
              <div className="flex items-center gap-4 justify-end">
                <button
                  type="button"
                  onClick={() => window.history.back()}
                  className="inline-flex items-center gap-2 px-6 py-3 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <ArrowLeft size={16} />
                  <span>ביטול</span>
                </button>
                
                <button
                  onClick={handleCreateCustomer}
                  disabled={loading || !email || !fullName || !planId}
                  className="inline-flex items-center gap-2 px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors font-semibold"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                      <span>יוצר לקוח...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus size={16} />
                      <span>צור לקוח חדש</span>
                    </>
                  )}
                </button>
              </div>
              
              {/* Required fields note */}
              <div className="mt-4 flex items-center gap-2 justify-end text-sm text-slate-600">
                <span>שדות חובה מסומנים ב-*</span>
                <AlertCircle size={16} className="text-slate-400" />
              </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function NewCustomerPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>}>
      <NewCustomerForm />
    </Suspense>
  );
}

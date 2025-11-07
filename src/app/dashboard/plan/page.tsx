'use client';

import { useEffect, useState } from 'react';
import { Package, Calendar, Wifi, Cloud, Video, Check, X, CreditCard, TrendingUp } from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  name_he: string;
  monthly_price: number;
  setup_price: number;
  retention_days: number;
  connection_type: string;
  data_allowance_gb: number | null;
  camera_limit: number;
}

export default function PlanPage() {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [customPrice, setCustomPrice] = useState<number | null>(null);
  const [setupPaid, setSetupPaid] = useState(false);

  useEffect(() => {
    fetch('/api/user-plan')
      .then((res) => res.json())
      .then((result) => {
        if (result.success) {
          setPlan(result.plan);
          setCustomPrice(result.custom_price);
          setSetupPaid(result.setup_paid || false);
        } else {
          console.error(result.error);
        }
      });
  }, []);

  if (!plan) {
    return (
      <div dir="rtl" className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl p-8 shadow-lg text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-blue-600 animate-pulse" />
            </div>
            <p className="text-xl text-slate-600">טוען את פרטי התוכנית...</p>
          </div>
        </div>
      </div>
    );
  }

  const finalPrice = customPrice ?? plan.monthly_price;

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="bg-white rounded-xl p-8 shadow-lg border border-slate-200">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center">
              <Package className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">התוכנית שלי</h1>
              <p className="text-lg text-slate-600">פרטי המנוי והתשלום שלך</p>
            </div>
          </div>
        </div>

        {/* Current Plan Card */}
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-8 shadow-lg border-2 border-blue-200">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-sm text-blue-600 font-medium mb-1">התוכנית הנוכחית שלך</p>
              <h2 className="text-3xl font-bold text-slate-900">{plan.name_he || plan.name}</h2>
            </div>
            <div className="text-left">
              <p className="text-sm text-slate-600 mb-1">מחיר חודשי</p>
              <p className="text-4xl font-bold text-blue-600">₪{finalPrice}</p>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Feature 1 */}
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                  <Calendar className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-bold text-slate-900 mb-1">שמירת הקלטות</p>
                  <p className="text-slate-600">עד {plan.retention_days} ימים</p>
                </div>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center shrink-0">
                  <Wifi className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-bold text-slate-900 mb-1">סוג חיבור</p>
                  <p className="text-slate-600">{plan.connection_type === 'wifi' ? 'Wi-Fi' : 'SIM 4G'}</p>
                  {plan.data_allowance_gb && (
                    <p className="text-xs text-slate-500 mt-1">{plan.data_allowance_gb}GB גלישה</p>
                  )}
                </div>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
                  <Video className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-bold text-slate-900 mb-1">מצלמות</p>
                  <p className="text-slate-600">עד {plan.camera_limit} מצלמות HD</p>
                </div>
              </div>
            </div>

            {/* Feature 4 */}
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
                  <Cloud className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-bold text-slate-900 mb-1">צפייה חיה + ענן</p>
                  <p className="text-slate-600">גישה מרחוק וגיבוי מאובטח</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Info */}
        <div className="bg-white rounded-xl p-8 shadow-lg border border-slate-200">
          <h3 className="text-xl font-bold text-slate-900 mb-6">פרטי תשלום</h3>
          <div className="space-y-4">
            {/* Setup Fee */}
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Package className="w-5 h-5 text-slate-600" />
                <span className="font-medium text-slate-900">התקנה חד-פעמית</span>
              </div>
              <div className="text-left">
                <span className="text-2xl font-bold text-slate-900">₪{plan.setup_price.toLocaleString()}</span>
                {setupPaid && (
                  <p className="text-xs text-green-600 mt-1">✅ שולם</p>
                )}
              </div>
            </div>
            
            {/* Monthly Price */}
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-slate-900">מחיר חודשי</span>
              </div>
              <span className="text-2xl font-bold text-blue-600">₪{finalPrice}</span>
            </div>
            
            {/* Next Payment */}
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-slate-600" />
                <span className="font-medium text-slate-900">החיוב הבא</span>
              </div>
              <span className="text-lg font-bold text-slate-900">01.12.2024</span>
            </div>
          </div>
        </div>

        {/* Support Info */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center shrink-0">
              <Check className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">תמיכה זמינה</h3>
              <p className="text-slate-600 mb-3">צריכים עזרה? אנחנו פה בשבילכם!</p>
              <div className="flex flex-wrap gap-3">
                <a 
                  href="tel:0548132603" 
                  className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-all"
                >
                  📞 054-813-2603
                </a>
                <a 
                  href="/dashboard/support" 
                  className="px-4 py-2 bg-white text-green-700 rounded-lg font-medium hover:bg-green-50 transition-all border border-green-200"
                >
                  פתח פנייה
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
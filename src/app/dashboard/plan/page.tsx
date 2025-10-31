'use client';

import { useEffect, useState } from 'react';
import { Package, Calendar, Wifi, Cloud, Video, Check, X, CreditCard, TrendingUp } from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  price: number;
  retention_days: number;
  connection: string;
  cloud: boolean;
  live: boolean;
}

export default function PlanPage() {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [customPrice, setCustomPrice] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/user-plan')
      .then((res) => res.json())
      .then((result) => {
        if (result.success) {
          setPlan(result.plan);
          setCustomPrice(result.custom_price);
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

  const finalPrice = customPrice ?? plan.price;

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
              <h2 className="text-3xl font-bold text-slate-900">{plan.name}</h2>
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
                  <p className="text-slate-600">{plan.connection}</p>
                </div>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${plan.live ? 'bg-green-100' : 'bg-red-100'}`}>
                  {plan.live ? <Check className="w-5 h-5 text-green-600" /> : <X className="w-5 h-5 text-red-600" />}
                </div>
                <div>
                  <p className="font-bold text-slate-900 mb-1">צפייה חיה</p>
                  <p className="text-slate-600">{plan.live ? 'זמין מכל מקום' : 'לא זמין'}</p>
                </div>
              </div>
            </div>

            {/* Feature 4 */}
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${plan.cloud ? 'bg-green-100' : 'bg-red-100'}`}>
                  {plan.cloud ? <Cloud className="w-5 h-5 text-green-600" /> : <X className="w-5 h-5 text-red-600" />}
                </div>
                <div>
                  <p className="font-bold text-slate-900 mb-1">גיבוי בענן</p>
                  <p className="text-slate-600">{plan.cloud ? 'פעיל ומאובטח' : 'אחסון מקומי בלבד'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Subscription Info */}
        <div className="bg-white rounded-xl p-8 shadow-lg border border-slate-200">
          <h3 className="text-xl font-bold text-slate-900 mb-6">פרטי מנוי</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-slate-600" />
                <span className="font-medium text-slate-900">מחיר חודשי</span>
              </div>
              <span className="text-2xl font-bold text-blue-600">₪{finalPrice}</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-slate-600" />
                <span className="font-medium text-slate-900">תוקף עד</span>
              </div>
              <span className="text-lg font-bold text-slate-900">31.05.2025</span>
            </div>
          </div>
        </div>

        {/* Upgrade Option */}
        {plan.id === 'local' && (
          <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-8 shadow-lg border-2 border-orange-200">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center shrink-0">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">רוצים לשדרג?</h3>
                <p className="text-lg text-slate-600">שדרגו לתוכנית ענן וקבלו גיבוי אוטומטי וצפייה מרחוק!</p>
              </div>
            </div>
            <a 
              href="/subscribe" 
              className="block w-full text-center px-6 py-4 bg-gradient-to-l from-orange-600 to-amber-600 text-white rounded-xl font-bold text-lg hover:from-orange-700 hover:to-amber-700 transition-all shadow-lg"
            >
              שדרג לתוכנית ענן
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
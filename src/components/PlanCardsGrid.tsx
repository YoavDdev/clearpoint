import Link from "next/link";
import { Check, Star, Wifi, Smartphone, HardDrive, Zap, Shield, Cloud } from "lucide-react";

export default function PlanCardsGrid() {
  return (
    <div dir="rtl" className="max-w-7xl mx-auto">
      {/* Plans Grid - 2 Plans Only */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 max-w-5xl mx-auto mb-16">
        {/* SIM Plan */}
        <div className="group relative">
          <div className="absolute -inset-0.5 bg-gradient-to-br from-orange-500 to-amber-500 rounded-3xl blur opacity-30 group-hover:opacity-60 transition duration-500"></div>
          <div className="relative bg-white rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-orange-100">
            {/* Plan Header */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl mb-4 group-hover:scale-110 transition-transform">
                <Smartphone className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">SIM Cloud</h3>
              <div className="flex items-baseline justify-center gap-1 mb-2">
                <span className="text-5xl font-bold text-slate-900">₪189</span>
                <span className="text-slate-600">/חודש</span>
              </div>
              <div className="text-sm text-slate-600 mb-1">התקנה חד-פעמית: <span className="font-bold text-orange-600">₪3,290</span></div>
              <p className="text-xs text-slate-500">כולל ראוטר SIM + 500GB גלישה</p>
            </div>

            {/* Features */}
            <ul className="space-y-3 mb-8 text-right">
              <li className="flex items-center gap-3">
                <div className="shrink-0 w-5 h-5 bg-orange-100 rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-orange-600" />
                </div>
                <span className="text-slate-700 font-medium">4 מצלמות HD</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="shrink-0 w-5 h-5 bg-orange-100 rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-orange-600" />
                </div>
                <span className="text-slate-700 font-medium">Mini PC + ראוטר SIM</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="shrink-0 w-5 h-5 bg-orange-100 rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-orange-600" />
                </div>
                <span className="text-slate-700 font-medium">חבילת 500GB גלישה</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="shrink-0 w-5 h-5 bg-orange-100 rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-orange-600" />
                </div>
                <span className="text-slate-700 font-medium">צפייה חיה + הקלטות</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="shrink-0 w-5 h-5 bg-orange-100 rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-orange-600" />
                </div>
                <span className="text-slate-700 font-medium">14 ימי שמירה בענן</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="shrink-0 w-5 h-5 bg-orange-100 rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-orange-600" />
                </div>
                <span className="text-slate-700 font-medium">התקנה מלאה + הדרכה</span>
              </li>
            </ul>

            {/* CTA Button */}
            <Link 
              href="/subscribe?plan=sim-cloud" 
              className="block w-full text-center bg-gradient-to-l from-orange-600 to-amber-600 text-white rounded-xl py-4 px-6 font-bold hover:from-orange-700 hover:to-amber-700 transition-all duration-300 shadow-lg hover:shadow-xl group-hover:scale-105"
            >
              בקש התקנה עכשיו
            </Link>
          </div>
        </div>

        {/* Wi-Fi Plan - Popular */}
        <div className="group relative lg:scale-105 lg:z-10">
          {/* Popular Badge */}
          <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 z-20">
            <div className="bg-gradient-to-l from-blue-600 to-cyan-600 text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg flex items-center gap-2">
              <Star className="w-4 h-4 fill-current" />
              <span>הכי פופולרי</span>
            </div>
          </div>
          
          <div className="absolute -inset-1 bg-gradient-to-br from-blue-500 via-cyan-500 to-blue-600 rounded-3xl blur opacity-40 group-hover:opacity-70 transition duration-500"></div>
          <div className="relative bg-white rounded-3xl p-8 shadow-2xl hover:shadow-3xl transition-all duration-300 hover:-translate-y-2 border-2 border-blue-200">
            {/* Plan Header */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl mb-4 group-hover:scale-110 transition-transform">
                <Wifi className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Wi-Fi Cloud</h3>
              <div className="flex items-baseline justify-center gap-1 mb-2">
                <span className="text-5xl font-bold bg-gradient-to-l from-blue-600 to-cyan-600 bg-clip-text text-transparent">₪149</span>
                <span className="text-slate-600">/חודש</span>
              </div>
              <div className="text-sm text-slate-600 mb-1">התקנה חד-פעמית: <span className="font-bold text-blue-600">₪2,990</span></div>
              <p className="text-xs text-slate-500">חיבור לאינטרנט קיים של הלקוח</p>
            </div>

            {/* Features */}
            <ul className="space-y-3 mb-8 text-right">
              <li className="flex items-center gap-3">
                <div className="shrink-0 w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-blue-600" />
                </div>
                <span className="text-slate-700 font-medium">4 מצלמות HD</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="shrink-0 w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-blue-600" />
                </div>
                <span className="text-slate-700 font-medium">Mini PC חכם</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="shrink-0 w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-blue-600" />
                </div>
                <span className="text-slate-700 font-medium">חיבור Wi-Fi קיים</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="shrink-0 w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-blue-600" />
                </div>
                <span className="text-slate-700 font-medium">צפייה חיה + הקלטות</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="shrink-0 w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-blue-600" />
                </div>
                <span className="text-slate-700 font-medium">14 ימי שמירה בענן</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="shrink-0 w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-blue-600" />
                </div>
                <span className="text-slate-700 font-medium">התקנה מלאה + הדרכה</span>
              </li>
            </ul>

            {/* CTA Button */}
            <Link 
              href="/subscribe?plan=wifi-cloud" 
              className="block w-full text-center bg-gradient-to-l from-blue-600 to-cyan-600 text-white rounded-xl py-4 px-6 font-bold hover:from-blue-700 hover:to-cyan-700 transition-all duration-300 shadow-xl hover:shadow-2xl group-hover:scale-105"
            >
              בקש התקנה עכשיו
            </Link>
          </div>
        </div>
      </div>

      {/* Shared Features */}
      <div className="bg-white rounded-3xl p-8 shadow-lg border border-slate-100">
        <h3 className="text-2xl font-bold text-center text-slate-900 mb-8">כל החבילות כוללות</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="flex items-start gap-4">
            <div className="shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div className="text-right">
              <h4 className="font-bold text-slate-900 mb-1">התקנה מלאה</h4>
              <p className="text-sm text-slate-600">4 מצלמות + Mini PC + כבלים</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="shrink-0 w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div className="text-right">
              <h4 className="font-bold text-slate-900 mb-1">אבטחה מתקדמת</h4>
              <p className="text-sm text-slate-600">הצפנה מקצה לקצה וענן מאובטח</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="shrink-0 w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
              <Cloud className="w-6 h-6 text-white" />
            </div>
            <div className="text-right">
              <h4 className="font-bold text-slate-900 mb-1">14 ימי אחסון</h4>
              <p className="text-sm text-slate-600">שמירה בענן עד שבועיים מלאים</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="shrink-0 w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
              <Check className="w-6 h-6 text-white" />
            </div>
            <div className="text-right">
              <h4 className="font-bold text-slate-900 mb-1">תמיכה מלאה</h4>
              <p className="text-sm text-slate-600">הדרכה + תמיכה טכנית בעברית</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
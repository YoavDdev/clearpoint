import Link from "next/link";
import { Check, Star, Wifi, Smartphone, HardDrive, Zap, Shield, Cloud } from "lucide-react";

export default function PlanCardsGrid() {
  return (
    <div dir="rtl" className="max-w-7xl mx-auto">
      {/* Plans Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
        {/* SIM Plan */}
        <div className="group relative">
          <div className="absolute -inset-0.5 bg-gradient-to-br from-orange-500 to-amber-500 rounded-3xl blur opacity-30 group-hover:opacity-60 transition duration-500"></div>
          <div className="relative bg-white rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-orange-100">
            {/* Plan Header */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl mb-4 group-hover:scale-110 transition-transform">
                <Smartphone className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">חבילת סים</h3>
              <div className="flex items-baseline justify-center gap-1 mb-2">
                <span className="text-5xl font-bold text-slate-900">₪69</span>
                <span className="text-slate-600">/חודש</span>
              </div>
              <p className="text-sm text-slate-600">אידיאלי למקומות ללא אינטרנט</p>
            </div>

            {/* Features */}
            <ul className="space-y-3 mb-8 text-right">
              <li className="flex items-center gap-3">
                <div className="shrink-0 w-5 h-5 bg-orange-100 rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-orange-600" />
                </div>
                <span className="text-slate-700">חיבור דרך ראוטר SIM</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="shrink-0 w-5 h-5 bg-orange-100 rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-orange-600" />
                </div>
                <span className="text-slate-700">גיבוי חכם או לפי דרישה</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="shrink-0 w-5 h-5 bg-orange-100 rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-orange-600" />
                </div>
                <span className="text-slate-700">צפייה חיה מרחוק</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="shrink-0 w-5 h-5 bg-orange-100 rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-orange-600" />
                </div>
                <span className="text-slate-700">שמירה עד 7 ימים</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="shrink-0 w-5 h-5 bg-orange-100 rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-orange-600" />
                </div>
                <span className="text-slate-700">הורדת קליפים ותמונות</span>
              </li>
            </ul>

            {/* CTA Button */}
            <Link 
              href="/subscribe?plan=sim" 
              className="block w-full text-center bg-gradient-to-l from-orange-600 to-amber-600 text-white rounded-xl py-4 px-6 font-bold hover:from-orange-700 hover:to-amber-700 transition-all duration-300 shadow-lg hover:shadow-xl group-hover:scale-105"
            >
              התחל עם החבילה
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
              <h3 className="text-2xl font-bold text-slate-900 mb-2">חבילת אינטרנט ביתי</h3>
              <div className="flex items-baseline justify-center gap-1 mb-2">
                <span className="text-5xl font-bold bg-gradient-to-l from-blue-600 to-cyan-600 bg-clip-text text-transparent">₪79</span>
                <span className="text-slate-600">/חודש</span>
              </div>
              <p className="text-sm text-slate-600">המומלץ ביותר - הכל בענן</p>
            </div>

            {/* Features */}
            <ul className="space-y-3 mb-8 text-right">
              <li className="flex items-center gap-3">
                <div className="shrink-0 w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-blue-600" />
                </div>
                <span className="text-slate-700 font-medium">חיבור Wi-Fi ביתי</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="shrink-0 w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-blue-600" />
                </div>
                <span className="text-slate-700 font-medium">העלאה אוטומטית לענן</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="shrink-0 w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-blue-600" />
                </div>
                <span className="text-slate-700 font-medium">צפייה חיה מרחוק</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="shrink-0 w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-blue-600" />
                </div>
                <span className="text-slate-700 font-medium">שמירה עד 14 ימים</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="shrink-0 w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-blue-600" />
                </div>
                <span className="text-slate-700 font-medium">הורדת קליפים ותמונות</span>
              </li>
            </ul>

            {/* CTA Button */}
            <Link 
              href="/subscribe?plan=wifi" 
              className="block w-full text-center bg-gradient-to-l from-blue-600 to-cyan-600 text-white rounded-xl py-4 px-6 font-bold hover:from-blue-700 hover:to-cyan-700 transition-all duration-300 shadow-xl hover:shadow-2xl group-hover:scale-105"
            >
              התחל עם החבילה
            </Link>
          </div>
        </div>

        {/* Local Plan */}
        <div className="group relative">
          <div className="absolute -inset-0.5 bg-gradient-to-br from-slate-500 to-gray-600 rounded-3xl blur opacity-30 group-hover:opacity-60 transition duration-500"></div>
          <div className="relative bg-white rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-slate-100">
            {/* Plan Header */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-slate-600 to-gray-700 rounded-2xl mb-4 group-hover:scale-110 transition-transform">
                <HardDrive className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">חבילת מקומית</h3>
              <div className="flex items-baseline justify-center gap-1 mb-2">
                <span className="text-5xl font-bold text-slate-900">₪59</span>
                <span className="text-slate-600">/חודש</span>
              </div>
              <p className="text-sm text-slate-600">פרטיות מקסימלית - אחסון מקומי</p>
            </div>

            {/* Features */}
            <ul className="space-y-3 mb-8 text-right">
              <li className="flex items-center gap-3">
                <div className="shrink-0 w-5 h-5 bg-slate-100 rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-slate-600" />
                </div>
                <span className="text-slate-700">אחסון מקומי בלבד</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="shrink-0 w-5 h-5 bg-slate-100 rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-slate-600" />
                </div>
                <span className="text-slate-700">שמירה עד 14 ימים (SSD)</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="shrink-0 w-5 h-5 bg-slate-100 rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-slate-600" />
                </div>
                <span className="text-slate-700">קליפים ותמונות מקומיים</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="shrink-0 w-5 h-5 bg-slate-100 rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-slate-600" />
                </div>
                <span className="text-slate-700">פרטיות מקסימלית</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="shrink-0 w-5 h-5 bg-red-100 rounded-full flex items-center justify-center">
                  <span className="text-red-600 text-xs">✕</span>
                </div>
                <span className="text-slate-500">אין גישה מרחוק</span>
              </li>
            </ul>

            {/* CTA Button */}
            <Link 
              href="/subscribe?plan=local" 
              className="block w-full text-center bg-gradient-to-l from-slate-700 to-gray-800 text-white rounded-xl py-4 px-6 font-bold hover:from-slate-800 hover:to-gray-900 transition-all duration-300 shadow-lg hover:shadow-xl group-hover:scale-105"
            >
              התחל עם החבילה
            </Link>
          </div>
        </div>
      </div>

      {/* Shared Features */}
      <div className="bg-white rounded-3xl p-8 shadow-lg border border-slate-100">
        <h3 className="text-2xl font-bold text-center text-slate-900 mb-8">כל החבילות כוללות</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-start gap-4">
            <div className="shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div className="text-right">
              <h4 className="font-bold text-slate-900 mb-1">התקנה מקצועית</h4>
              <p className="text-sm text-slate-600">צוות מקצועי מגיע אליך לביצוע התקנה מלאה</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="shrink-0 w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div className="text-right">
              <h4 className="font-bold text-slate-900 mb-1">אבטחה מתקדמת</h4>
              <p className="text-sm text-slate-600">הצפנה מקצה לקצה ואבטחת מידע ברמה בנקאית</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="shrink-0 w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
              <Cloud className="w-6 h-6 text-white" />
            </div>
            <div className="text-right">
              <h4 className="font-bold text-slate-900 mb-1">דשבורד בעברית</h4>
              <p className="text-sm text-slate-600">ממשק נוח וידידותי בעברית עם תמיכה טכנית מלאה</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
import Footer from "@/components/Footer";
import { Camera, Cpu, Cloud, Shield, Wrench, Headphones, Video, Package, CheckCircle2, ArrowRight } from "lucide-react";

export default function ServicesPage() {
  return (
    <main dir="rtl" className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 pt-32 pb-20 px-4">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-10 left-10 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-300 text-sm backdrop-blur-sm mb-6">
            <Package className="w-4 h-4" />
            <span>פתרונות מקיפים לכל צורך</span>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
            השירותים שלנו
          </h1>
          <p className="text-xl md:text-2xl text-blue-100 leading-relaxed">
            פתרונות אבטחה מותאמים אישית מהתכנון ועד התמיכה השוטפת
          </p>
        </div>
      </section>

      {/* Main Services */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">השירותים המרכזיים</h2>
            <p className="text-xl text-slate-600">כל מה שצריך למערכת אבטחה מושלמת</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Service 1 */}
            <div className="group relative">
              <div className="absolute -inset-0.5 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
              <div className="relative bg-white rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-blue-100 h-full">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Camera className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-4">התקנת מצלמות</h3>
                <p className="text-slate-600 mb-6 leading-relaxed">
                  התקנה מקצועית של עד 4 מצלמות PoE באיכות HD עם כיסוי מלא של הנכס
                </p>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>מצלמות באיכות HD/4K</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>חיבור PoE (Power over Ethernet)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>ראיית לילה מתקדמת</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Service 2 */}
            <div className="group relative">
              <div className="absolute -inset-0.5 bg-gradient-to-br from-purple-500 to-pink-500 rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
              <div className="relative bg-white rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-purple-100 h-full">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Cpu className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-4">Mini PC חכם</h3>
                <p className="text-slate-600 mb-6 leading-relaxed">
                  GMKtec Mini PC מותקן מראש עם כל התוכנות הדרושות למעקב והקלטה
                </p>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
                    <span>עיבוד מקומי מהיר</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
                    <span>אחסון SSD מובנה</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
                    <span>תצורה מותאמת אישית</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Service 3 */}
            <div className="group relative">
              <div className="absolute -inset-0.5 bg-gradient-to-br from-green-500 to-emerald-500 rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
              <div className="relative bg-white rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-green-100 h-full">
                <div className="w-16 h-16 bg-gradient-to-br from-green-600 to-emerald-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Cloud className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-4">אחסון ענן</h3>
                <p className="text-slate-600 mb-6 leading-relaxed">
                  העלאה אוטומטית לענן מאובטח עם גיבוי והורדת קליפים
                </p>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                    <span>שרתים מאובטחים בישראל</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                    <span>הצפנה מקצה לקצה</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                    <span>גישה מכל מקום</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Service 4 */}
            <div className="group relative">
              <div className="absolute -inset-0.5 bg-gradient-to-br from-orange-500 to-red-500 rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
              <div className="relative bg-white rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-orange-100 h-full">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-600 to-red-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Video className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-4">צפייה חיה</h3>
                <p className="text-slate-600 mb-6 leading-relaxed">
                  שידור חי באיכות גבוהה מכל המצלמות דרך דשבורד מאובטח
                </p>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-orange-600 shrink-0" />
                    <span>צפייה ממכשירים מרובים</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-orange-600 shrink-0" />
                    <span>ממשק בעברית</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-orange-600 shrink-0" />
                    <span>בטוח ומוצפן</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Service 5 */}
            <div className="group relative">
              <div className="absolute -inset-0.5 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
              <div className="relative bg-white rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-cyan-100 h-full">
                <div className="w-16 h-16 bg-gradient-to-br from-cyan-600 to-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Wrench className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-4">תחזוקה ותמיכה</h3>
                <p className="text-slate-600 mb-6 leading-relaxed">
                  תמיכה טכנית מלאה, עדכוני תוכנה ותחזוקה שוטפת
                </p>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-cyan-600 shrink-0" />
                    <span>תמיכה 24/7</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-cyan-600 shrink-0" />
                    <span>עדכונים אוטומטיים</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-cyan-600 shrink-0" />
                    <span>ניטור מרחוק</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Service 6 */}
            <div className="group relative">
              <div className="absolute -inset-0.5 bg-gradient-to-br from-pink-500 to-rose-500 rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
              <div className="relative bg-white rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-pink-100 h-full">
                <div className="w-16 h-16 bg-gradient-to-br from-pink-600 to-rose-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Headphones className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-4">ייעוץ מקצועי</h3>
                <p className="text-slate-600 mb-6 leading-relaxed">
                  ייעוץ והדרכה מקצועית להתאמת הפתרון המושלם
                </p>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-pink-600 shrink-0" />
                    <span>סקר אבטחה חינם</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-pink-600 shrink-0" />
                    <span>תכנון מערכת מותאם</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-pink-600 shrink-0" />
                    <span>הדרכה מלאה</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="py-20 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">תהליך העבודה</h2>
            <p className="text-xl text-slate-600">4 שלבים פשוטים למערכת אבטחה מושלמת</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Step 1 */}
            <div className="relative">
              <div className="bg-white rounded-2xl p-8 shadow-lg border border-slate-100 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-full flex items-center justify-center mx-auto mb-4 text-white text-2xl font-bold">
                  1
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">יצירת קשר</h3>
                <p className="text-slate-600">
                  צרו קשר טלפוני או דרך האתר לקבלת ייעוץ ראשוני
                </p>
              </div>
              <ArrowRight className="hidden lg:block absolute top-1/2 -left-4 transform -translate-y-1/2 rotate-180 w-8 h-8 text-slate-300" />
            </div>

            {/* Step 2 */}
            <div className="relative">
              <div className="bg-white rounded-2xl p-8 shadow-lg border border-slate-100 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4 text-white text-2xl font-bold">
                  2
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">סקר מקצועי</h3>
                <p className="text-slate-600">
                  טכנאי מגיע לסקור את האתר ולתכנן את המערכת
                </p>
              </div>
              <ArrowRight className="hidden lg:block absolute top-1/2 -left-4 transform -translate-y-1/2 rotate-180 w-8 h-8 text-slate-300" />
            </div>

            {/* Step 3 */}
            <div className="relative">
              <div className="bg-white rounded-2xl p-8 shadow-lg border border-slate-100 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-green-600 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 text-white text-2xl font-bold">
                  3
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">התקנה מהירה</h3>
                <p className="text-slate-600">
                  התקנה מקצועית של כל המערכת תוך יום עבודה
                </p>
              </div>
              <ArrowRight className="hidden lg:block absolute top-1/2 -left-4 transform -translate-y-1/2 rotate-180 w-8 h-8 text-slate-300" />
            </div>

            {/* Step 4 */}
            <div>
              <div className="bg-white rounded-2xl p-8 shadow-lg border border-slate-100 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-600 to-red-600 rounded-full flex items-center justify-center mx-auto mb-4 text-white text-2xl font-bold">
                  4
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">הדרכה ותמיכה</h3>
                <p className="text-slate-600">
                  הדרכה מלאה ותמיכה שוטפת לאורך כל הדרך
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-900 via-slate-900 to-slate-900 py-24">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-10 left-10 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
        </div>

        <div className="relative max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            מוכנים להתחיל?
          </h2>
          <p className="text-xl md:text-2xl text-blue-100 mb-10">
            בואו נבנה יחד את מערכת האבטחה המושלמת עבורכם
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a 
              href="/subscribe" 
              className="px-10 py-5 bg-white text-slate-900 rounded-xl font-bold text-lg shadow-2xl hover:scale-105 transition-all duration-300"
            >
              קבלו הצעת מחיר
            </a>
            <a 
              href="tel:0548132603" 
              className="px-10 py-5 bg-white/10 backdrop-blur-md text-white rounded-xl font-bold text-lg border-2 border-white/20 hover:bg-white/20 hover:scale-105 transition-all duration-300"
            >
              צרו קשר: 054-813-2603
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </main>
  );
}
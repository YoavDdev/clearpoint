import Footer from "@/components/Footer";
import { Shield, Target, Users, Award, TrendingUp, CheckCircle2, Zap, Lock, Eye, Heart } from "lucide-react";

export default function AboutPage() {
  return (
    <main dir="rtl" className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 pt-32 pb-20 px-4">
        {/* Animated Background */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-10 left-10 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-300 text-sm backdrop-blur-sm mb-6">
            <Award className="w-4 h-4" />
            <span>המובילים בתחום האבטחה החכמה בישראל</span>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
            הסיפור שלנו
          </h1>
          <p className="text-xl md:text-2xl text-blue-100 leading-relaxed">
            מחויבים לספק את פתרונות האבטחה המתקדמים ביותר לעסקים ולבתים בישראל
          </p>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Mission */}
            <div className="group">
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-3xl blur opacity-20 group-hover:opacity-40 transition"></div>
                <div className="relative bg-white rounded-3xl p-10 shadow-xl border border-blue-100">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl flex items-center justify-center mb-6">
                    <Target className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-3xl font-bold text-slate-900 mb-4">המשימה שלנו</h2>
                  <p className="text-lg text-slate-600 leading-relaxed">
                    להפוך את האבטחה החכמה לנגישה וקלה לשימוש עבור כולם. אנו מאמינים שכל עסק ובית בישראל ראויים לטכנולוגיית אבטחה מתקדמת ללא הצורך בידע טכני מורכב.
                  </p>
                </div>
              </div>
            </div>

            {/* Vision */}
            <div className="group">
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-br from-purple-500 to-pink-500 rounded-3xl blur opacity-20 group-hover:opacity-40 transition"></div>
                <div className="relative bg-white rounded-3xl p-10 shadow-xl border border-purple-100">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center mb-6">
                    <Eye className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-3xl font-bold text-slate-900 mb-4">החזון שלנו</h2>
                  <p className="text-lg text-slate-600 leading-relaxed">
                    להיות החברה המובילה בישראל בתחום מערכות האבטחה החכמות, תוך שילוב חדשנות טכנולוגית עם שירות מעולה ותמיכה מלאה בעברית.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Our Values */}
      <section className="py-20 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">הערכים שלנו</h2>
            <p className="text-xl text-slate-600">העקרונות המנחים אותנו בכל מה שאנו עושים</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Value 1 */}
            <div className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-slate-100">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Shield className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">אמינות</h3>
              <p className="text-slate-600">מחויבות מלאה לאבטחת המידע והפרטיות של לקוחותינו</p>
            </div>

            {/* Value 2 */}
            <div className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-slate-100">
              <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <CheckCircle2 className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">איכות</h3>
              <p className="text-slate-600">שימוש בטכנולוגיות המתקדמות ביותר ורכיבים באיכות פרימיום</p>
            </div>

            {/* Value 3 */}
            <div className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-slate-100">
              <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Zap className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">מהירות</h3>
              <p className="text-slate-600">התקנה מהירה ושירות מענה זמין 24/7 ללקוחותינו</p>
            </div>

            {/* Value 4 */}
            <div className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-slate-100">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Heart className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">שירות</h3>
              <p className="text-slate-600">תמיכה אישית ומקצועית בעברית לכל לקוח</p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-gradient-to-br from-blue-900 via-slate-900 to-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Stat 1 */}
            <div className="text-center">
              <div className="text-5xl md:text-6xl font-bold bg-gradient-to-l from-blue-400 to-cyan-400 bg-clip-text text-transparent mb-2">
                500+
              </div>
              <p className="text-lg text-blue-200">לקוחות מרוצים</p>
            </div>

            {/* Stat 2 */}
            <div className="text-center">
              <div className="text-5xl md:text-6xl font-bold bg-gradient-to-l from-blue-400 to-cyan-400 bg-clip-text text-transparent mb-2">
                2000+
              </div>
              <p className="text-lg text-blue-200">מצלמות מותקנות</p>
            </div>

            {/* Stat 3 */}
            <div className="text-center">
              <div className="text-5xl md:text-6xl font-bold bg-gradient-to-l from-blue-400 to-cyan-400 bg-clip-text text-transparent mb-2">
                24/7
              </div>
              <p className="text-lg text-blue-200">תמיכה טכנית</p>
            </div>

            {/* Stat 4 */}
            <div className="text-center">
              <div className="text-5xl md:text-6xl font-bold bg-gradient-to-l from-blue-400 to-cyan-400 bg-clip-text text-transparent mb-2">
                99.9%
              </div>
              <p className="text-lg text-blue-200">זמינות מערכת</p>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">למה לבחור ב-Clearpoint?</h2>
            <p className="text-xl text-slate-600">היתרונות שהופכים אותנו למובילים בתחום</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Reason 1 */}
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition"></div>
              <div className="relative bg-white rounded-2xl p-8 border border-blue-100 shadow-lg">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center mb-4">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">טכנולוגיה מתקדמת</h3>
                <p className="text-slate-600 leading-relaxed">
                  שימוש במצלמות ומערכות מהמתקדמות בעולם, כולל יכולות AI לזיהוי חכם של אירועים
                </p>
              </div>
            </div>

            {/* Reason 2 */}
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition"></div>
              <div className="relative bg-white rounded-2xl p-8 border border-green-100 shadow-lg">
                <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-emerald-600 rounded-xl flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">צוות מומחים</h3>
                <p className="text-slate-600 leading-relaxed">
                  טכנאים מוסמכים ומנוסים עם הכשרה מתמשכת בטכנולוגיות החדישות ביותר
                </p>
              </div>
            </div>

            {/* Reason 3 */}
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition"></div>
              <div className="relative bg-white rounded-2xl p-8 border border-purple-100 shadow-lg">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center mb-4">
                  <Lock className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">אבטחה מקסימלית</h3>
                <p className="text-slate-600 leading-relaxed">
                  הצפנה מקצה לקצה, שרתים מאובטחים בישראל, ועמידה בכל תקני האבטחה הבינלאומיים
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
            בואו נדבר
          </h2>
          <p className="text-xl md:text-2xl text-blue-100 mb-10">
            נשמח לענות על כל שאלה ולעזור לכם למצוא את הפתרון המושלם
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a 
              href="/subscribe" 
              className="px-10 py-5 bg-white text-slate-900 rounded-xl font-bold text-lg shadow-2xl hover:scale-105 transition-all duration-300"
            >
              התחילו עכשיו
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
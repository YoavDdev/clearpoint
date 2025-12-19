import PlanCardsGrid from "@/components/PlanCardsGrid";
import Footer from "@/components/Footer";
import { Shield, Eye, Lock, Zap, Camera, Cloud, Cpu, BadgeCheck, User, LogIn, LayoutDashboard } from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import Link from "next/link";

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  const isLoggedIn = !!session?.user;
  const userName = session?.user?.email?.split('@')[0] || 'משתמש';

  return (
    <main dir="rtl" className="min-h-screen">
      {/* Welcome Banner for Logged In Users */}
      {isLoggedIn && (
        <div className="bg-gradient-to-l from-blue-600 to-cyan-600 py-4 px-4 shadow-lg">
          <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-white/90 text-sm">שלום,</p>
                <p className="text-white font-bold text-lg">{userName}</p>
              </div>
            </div>
            <div className="flex gap-3">
              {session?.user?.role === "admin" && (
                <Link
                  href="/admin"
                  className="flex items-center gap-2 px-6 py-2.5 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-all shadow-lg"
                >
                  <Shield className="w-5 h-5" />
                  <span>ממשק ניהול</span>
                </Link>
              )}
              <Link
                href="/dashboard"
                className="flex items-center gap-2 px-6 py-2.5 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-all shadow-lg"
              >
                <LayoutDashboard className="w-5 h-5" />
                <span>הדשבורד שלי</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section with Gradient Background */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 pt-32 pb-20 px-4">
        {/* Animated Background Pattern */}
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
        <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{animationDelay: '2s'}}></div>
        
        <div className="relative max-w-7xl mx-auto">
          {/* Hero Badge */}
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-300 text-sm backdrop-blur-sm">
              <BadgeCheck className="w-4 h-4" />
              <span>מערכת אבטחה מתקדמת לעסקים ובתים</span>
            </div>
          </div>

          {/* Main Headline */}
          <div className="text-center space-y-6 mb-12">
            <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight">
              <span className="block">השקט והביטחון</span>
              <span className="block bg-gradient-to-l from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                מתחילים כאן
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-blue-100 max-w-3xl mx-auto leading-relaxed">
              מערכת מעקב חכמה ומאובטחת עם צפייה חיה, הקלטה 24/7 ודשבורד בעברית
            </p>
          </div>

          {/* Feature Pills */}
          <div className="flex flex-wrap justify-center gap-3 mb-12">
            <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full text-white border border-white/20">
              <Shield className="w-5 h-5 text-blue-400" />
              <span className="font-medium">מאובטח לחלוטין</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full text-white border border-white/20">
              <Eye className="w-5 h-5 text-cyan-400" />
              <span className="font-medium">צפייה חיה</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full text-white border border-white/20">
              <Cloud className="w-5 h-5 text-blue-400" />
              <span className="font-medium">ענן חכם</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full text-white border border-white/20">
              <Zap className="w-5 h-5 text-yellow-400" />
              <span className="font-medium">התקנה מהירה</span>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {isLoggedIn ? (
              <Link
                href="/dashboard"
                className="group px-8 py-4 bg-gradient-to-l from-blue-600 to-cyan-600 text-white rounded-xl font-bold text-lg shadow-2xl shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2"
              >
                <span>עבור לדשבורד</span>
                <LayoutDashboard className="w-5 h-5" />
              </Link>
            ) : (
              <>
                <a 
                  href="#plans" 
                  className="group px-8 py-4 bg-gradient-to-l from-blue-600 to-cyan-600 text-white rounded-xl font-bold text-lg shadow-2xl shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <span>התחל עכשיו</span>
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </a>
                <Link
                  href="/login"
                  className="px-8 py-4 bg-white/10 backdrop-blur-md text-white rounded-xl font-bold text-lg border border-white/20 hover:bg-white/20 hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <LogIn className="w-5 h-5" />
                  <span>התחבר</span>
                </Link>
              </>
            )}
            <a 
              href="#features" 
              className="px-8 py-4 bg-white/10 backdrop-blur-md text-white rounded-xl font-bold text-lg border border-white/20 hover:bg-white/20 hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2"
            >
              <span>למד עוד</span>
            </a>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gradient-to-b from-white to-slate-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">למה Clearpoint?</h2>
            <p className="text-xl text-slate-600">טכנולוגיה מתקדמת לביטחון שלך</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Feature 1 */}
            <div className="group p-8 bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-slate-100">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Camera className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">4 מצלמות</h3>
              <p className="text-slate-600 leading-relaxed">כיסוי מלא של הנכס שלך עם עד 4 מצלמות באיכות HD</p>
            </div>

            {/* Feature 2 */}
            <div className="group p-8 bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-slate-100">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Eye className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">צפייה חיה</h3>
              <p className="text-slate-600 leading-relaxed">גישה מיידית לשידור חי מכל מקום בעולם</p>
            </div>

            {/* Feature 3 */}
            <div className="group p-8 bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-slate-100">
              <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Lock className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">הצפנה מתקדמת</h3>
              <p className="text-slate-600 leading-relaxed">אבטחת מידע ברמה בנקאית עם הצפנה מקצה לקצה</p>
            </div>

            {/* Feature 4 */}
            <div className="group p-8 bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-slate-100">
              <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Cpu className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Mini PC חכם</h3>
              <p className="text-slate-600 leading-relaxed">עיבוד מקומי מהיר עם יכולות AI ואחסון חכם</p>
            </div>
          </div>
        </div>
      </section>

      {/* Plans Section */}
      <section id="plans" className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">בחר את החבילה המתאימה</h2>
            <p className="text-xl text-slate-600">כל החבילות כוללות התקנה מלאה ותמיכה טכנית</p>
          </div>
          <PlanCardsGrid />
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-900 via-slate-900 to-slate-900 py-24">
        {/* Animated Background */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-10 left-10 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
        </div>

        <div className="relative max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            מוכנים להתחיל?
          </h2>
          <p className="text-xl md:text-2xl text-blue-100 mb-10 leading-relaxed">
            הצטרפו לאלפי עסקים ובתים שבחרו ב-Clearpoint לביטחון שלהם
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a 
              href="/subscribe" 
              className="group px-10 py-5 bg-white text-slate-900 rounded-xl font-bold text-lg shadow-2xl hover:shadow-white/20 hover:scale-105 transition-all duration-300 flex items-center justify-center gap-3"
            >
              <span>התחל עכשיו - חינם לחודש הראשון</span>
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </a>
            <a 
              href="tel:0548132603" 
              className="px-10 py-5 bg-white/10 backdrop-blur-md text-white rounded-xl font-bold text-lg border-2 border-white/20 hover:bg-white/20 hover:scale-105 transition-all duration-300 flex items-center justify-center gap-3"
            >
              <span>צרו קשר: 054-813-2603</span>
            </a>
          </div>

          <div className="mt-12 flex items-center justify-center gap-8 text-sm text-blue-200">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              <span>ללא התחייבות</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              <span>התקנה מהירה</span>
            </div>
            <div className="flex items-center gap-2">
              <BadgeCheck className="w-5 h-5" />
              <span>אחריות מלאה</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </main>
  );
}

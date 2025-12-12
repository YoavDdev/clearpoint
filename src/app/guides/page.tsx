import Footer from "@/components/Footer";
import { PlayCircle, Camera, Settings, Smartphone, Shield } from "lucide-react";

const guideCategories = [
  {
    title: "התחלת עבודה",
    icon: PlayCircle,
    color: "from-blue-600 to-cyan-600",
    guides: [
      { title: "מדריך התקנה ראשונית", description: "כל מה שצריך לדעת על התקנת המערכת", duration: "10 דקות" },
      { title: "התחברות ראשונה לדשבורד", description: "איך להתחבר ולהתחיל להשתמש", duration: "5 דקות" },
      { title: "הגדרת אזור מועדף", description: "הגדר את האזור שלך ושפת התצוגה", duration: "3 דקות" }
    ]
  },
  {
    title: "שימוש במצלמות",
    icon: Camera,
    color: "from-purple-600 to-pink-600",
    guides: [
      { title: "צפייה חיה", description: "איך לצפות בשידור חי מכל המצלמות", duration: "5 דקות" },
      { title: "גישה להקלטות", description: "איך למצוא ולצפות בהקלטות ישנות", duration: "8 דקות" },
      { title: "הורדת קטעי וידאו", description: "שמירת קטעים חשובים ל-PC או טלפון", duration: "7 דקות" },
      { title: "הגדרת איכות שידור", description: "התאמת איכות הוידאו לפי צורך", duration: "4 דקות" }
    ]
  },
  {
    title: "הגדרות מתקדמות",
    icon: Settings,
    color: "from-green-600 to-emerald-600",
    guides: [
      { title: "התראות וזיהוי תנועה", description: "הגדרת התראות אוטומטיות", duration: "10 דקות" },
      { title: "ניהול משתמשים", description: "הוספת משתמשים נוספים למערכת", duration: "6 דקות" },
      { title: "גיבוי והתאוששות", description: "איך לגבות ולשחזר הקלטות", duration: "12 דקות" }
    ]
  },
  {
    title: "אפליקציה ניידת",
    icon: Smartphone,
    color: "from-orange-600 to-red-600",
    guides: [
      { title: "הורדת האפליקציה", description: "התקנת האפליקציה במכשיר הנייד", duration: "5 דקות" },
      { title: "צפייה חיה בנייד", description: "צפייה במצלמות מהטלפון", duration: "6 דקות" },
      { title: "התראות Push", description: "הגדרת התראות בזמן אמת", duration: "7 דקות" }
    ]
  },
  {
    title: "פתרון בעיות",
    icon: Shield,
    color: "from-yellow-600 to-orange-600",
    guides: [
      { title: "מצלמה לא מתחברת", description: "פתרונות לבעיות חיבור נפוצות", duration: "10 דקות" },
      { title: "איכות וידאו ירודה", description: "שיפור איכות השידור", duration: "8 דקות" },
      { title: "בעיות גישה לדשבורד", description: "פתרון בעיות התחברות", duration: "6 דקות" }
    ]
  }
];

export default function GuidesPage() {
  return (
    <main dir="rtl" className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <section className="pt-32 pb-16 px-4 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">מדריכי שימוש</h1>
          <p className="text-xl text-blue-100">למד איך להפיק את המיטב מ-Clearpoint Security</p>
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          {guideCategories.map((category, idx) => {
            const IconComponent = category.icon;
            return (
              <div key={idx} className="mb-12">
                <div className="flex items-center gap-4 mb-6">
                  <div className={`w-12 h-12 bg-gradient-to-br ${category.color} rounded-xl flex items-center justify-center`}>
                    <IconComponent className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900">{category.title}</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {category.guides.map((guide, gIdx) => (
                    <div key={gIdx} className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6 hover:shadow-xl transition-all">
                      <h3 className="text-lg font-bold text-slate-900 mb-2">{guide.title}</h3>
                      <p className="text-slate-600 mb-4">{guide.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-blue-600 font-medium">{guide.duration}</span>
                        <button className="px-4 py-2 bg-gradient-to-l from-blue-600 to-cyan-600 text-white rounded-lg text-sm font-bold hover:scale-105 transition-all">
                          קרא מדריך
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="py-16 px-4 bg-slate-50">
        <div className="max-w-4xl mx-auto text-center">
          <h3 className="text-2xl font-bold text-slate-900 mb-4">צריך עזרה נוספת?</h3>
          <p className="text-slate-600 mb-6">הצוות שלנו זמין לעזור בכל שאלה</p>
          <a href="/contact" className="inline-block px-8 py-3 bg-gradient-to-l from-blue-600 to-cyan-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all">
            צור קשר עם התמיכה
          </a>
        </div>
      </section>

      <Footer />
    </main>
  );
}

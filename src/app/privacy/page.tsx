import Footer from "@/components/Footer";
import { ShieldCheck } from "lucide-react";

export default function PrivacyPage() {
  return (
    <main dir="rtl" className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <section className="pt-32 pb-16 px-4 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <div className="max-w-4xl mx-auto text-center">
          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">מדיניות פרטיות</h1>
          <p className="text-xl text-blue-100">עדכון אחרון: {new Date().toLocaleDateString('he-IL')}</p>
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg border border-slate-100 p-8 md:p-12">
          <div className="prose prose-slate max-w-none space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">1. מבוא</h2>
              <p className="text-slate-700 leading-relaxed">
                Clearpoint Security ("אנחנו", "שלנו") מחויבת להגן על הפרטיות שלך. מדיניות פרטיות זו מסבירה כיצד אנו אוספים, משתמשים, מגנים ומשתפים מידע אישי שלך כאשר אתה משתמש בשירותים שלנו.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">2. מידע שאנו אוספים</h2>
              <p className="text-slate-700 leading-relaxed mb-3">אנו אוספים מספר סוגים של מידע:</p>
              <ul className="list-disc list-inside text-slate-700 space-y-2 mr-4">
                <li><strong>מידע אישי:</strong> שם, כתובת אימייל, מספר טלפון, כתובת</li>
                <li><strong>מידע טכני:</strong> כתובת IP, סוג דפדפן, מערכת הפעלה</li>
                <li><strong>נתוני שימוש:</strong> תאריכי גישה, דפים שנצפו, זמן שימוש</li>
                <li><strong>נתוני וידאו:</strong> הקלטות מצלמות האבטחה שלך</li>
                <li><strong>מידע תשלום:</strong> פרטי כרטיס אשראי (מוצפנים ומאוחסנים בצורה מאובטחת)</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">3. כיצד אנו משתמשים במידע</h2>
              <p className="text-slate-700 leading-relaxed mb-3">אנו משתמשים במידע שלך לצרכים הבאים:</p>
              <ul className="list-disc list-inside text-slate-700 space-y-2 mr-4">
                <li>מתן ותחזוקת השירות</li>
                <li>עיבוד תשלומים ומשלוח חשבוניות</li>
                <li>שליחת התראות ועדכונים</li>
                <li>מתן תמיכה טכנית</li>
                <li>שיפור השירות וחוויית המשתמש</li>
                <li>זיהוי ומניעת הונאות</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">4. אבטחת המידע</h2>
              <p className="text-slate-700 leading-relaxed mb-3">
                אנו נוקטים באמצעי אבטחה מתקדמים להגנת המידע שלך:
              </p>
              <ul className="list-disc list-inside text-slate-700 space-y-2 mr-4">
                <li>הצפנת AES-256 לכל נתוני הוידאו</li>
                <li>הצפנת SSL/TLS לכל העברות הנתונים</li>
                <li>אחסון מאובטח בשרתים מוגנים</li>
                <li>גישה מוגבלת למידע רק לצוות מורשה</li>
                <li>ביקורות אבטחה ועדכוני תוכנה שוטפים</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">5. שיתוף מידע עם צדדים שלישיים</h2>
              <p className="text-slate-700 leading-relaxed mb-3">
                אנו לא מוכרים או משכירים את המידע האישי שלך לצדדים שלישיים. אנו עשויים לשתף מידע רק במקרים הבאים:
              </p>
              <ul className="list-disc list-inside text-slate-700 space-y-2 mr-4">
                <li>עם ספקי שירות שעוזרים לנו להפעיל את השירות (לדוגמה, עיבוד תשלומים)</li>
                <li>כאשר נדרש על פי חוק או צו בית משפט</li>
                <li>להגנה על הזכויות והבטיחות שלנו ושל משתמשינו</li>
                <li>בהסכמתך המפורשת</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">6. שמירת נתונים</h2>
              <p className="text-slate-700 leading-relaxed">
                אנו שומרים את המידע האישי שלך כל עוד חשבונך פעיל או כפי שנדרש לצורך מתן השירות. הקלטות וידאו נשמרות למשך 7-14 ימים (בהתאם לתוכנית המנוי) ולאחר מכן נמחקות אוטומטית, אלא אם נשמרו באופן ידני.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">7. הזכויות שלך</h2>
              <p className="text-slate-700 leading-relaxed mb-3">יש לך את הזכויות הבאות לגבי המידע האישי שלך:</p>
              <ul className="list-disc list-inside text-slate-700 space-y-2 mr-4">
                <li>גישה למידע האישי שלך</li>
                <li>תיקון מידע לא מדויק</li>
                <li>מחיקת המידע שלך (בכפוף לדרישות חוקיות)</li>
                <li>התנגדות לעיבוד מידע מסוים</li>
                <li>העברת המידע שלך לספק אחר</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">8. עוגיות (Cookies)</h2>
              <p className="text-slate-700 leading-relaxed">
                אנו משתמשים בעוגיות וטכנולוגיות דומות כדי לשפר את חוויית השימוש באתר, לנתח תנועה ולהתאים תוכן. ניתן לנהל את העדפות העוגיות דרך הגדרות הדפדפן שלך.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">9. פרטיות ילדים</h2>
              <p className="text-slate-700 leading-relaxed">
                השירות אינו מיועד לילדים מתחת לגיל 18. אנו לא אוספים ביודעין מידע אישי מילדים. אם גילית שילדך סיפק לנו מידע אישי, אנא צור קשר ונמחק אותו מיידית.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">10. שינויים במדיניות הפרטיות</h2>
              <p className="text-slate-700 leading-relaxed">
                אנו עשויים לעדכן מדיניות פרטיות זו מעת לעת. נודיע לך על כל שינוי מהותי באמצעות אימייל או הודעה בדשבורד. המשך שימושך בשירות לאחר שינויים כאלה מהווה הסכמה למדיניות המעודכנת.
              </p>
            </div>

            <div className="pt-8 border-t border-slate-200">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">צור קשר</h2>
              <p className="text-slate-700 leading-relaxed">
                לשאלות או חששות בנוגע למדיניות הפרטיות שלנו, ניתן ליצור קשר ב:
              </p>
              <p className="text-slate-700 mt-2">
                <strong>אימייל:</strong>{" "}
                <a href="mailto:privacy@clearpoint.co.il" className="text-blue-600 hover:text-blue-700 font-medium">
                  privacy@clearpoint.co.il
                </a>
              </p>
              <p className="text-slate-700 mt-1">
                <strong>טלפון:</strong>{" "}
                <a href="tel:0548132603" className="text-blue-600 hover:text-blue-700 font-medium">
                  054-813-2603
                </a>
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

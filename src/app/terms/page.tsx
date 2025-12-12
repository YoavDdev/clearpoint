import Footer from "@/components/Footer";
import { FileText } from "lucide-react";

export default function TermsPage() {
  return (
    <main dir="rtl" className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <section className="pt-32 pb-16 px-4 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <div className="max-w-4xl mx-auto text-center">
          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <FileText className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">תנאי שימוש</h1>
          <p className="text-xl text-blue-100">עדכון אחרון: {new Date().toLocaleDateString('he-IL')}</p>
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg border border-slate-100 p-8 md:p-12">
          <div className="prose prose-slate max-w-none space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">1. קבלת התנאים</h2>
              <p className="text-slate-700 leading-relaxed">
                השימוש בשירותי Clearpoint Security ("השירות") כפוף לתנאי שימוש אלה. באמצעות גישה או שימוש בשירות, אתה מסכים להיות מחויב לתנאים אלה. אם אינך מסכים לתנאים אלה, אנא אל תשתמש בשירות.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">2. תיאור השירות</h2>
              <p className="text-slate-700 leading-relaxed mb-3">
                Clearpoint Security מספקת מערכת מעקב ואבטחה מבוססת ענן הכוללת:
              </p>
              <ul className="list-disc list-inside text-slate-700 space-y-2 mr-4">
                <li>צפייה חיה במצלמות אבטחה</li>
                <li>הקלטה ואחסון בענן</li>
                <li>גישה מרחוק דרך דשבורד מקוון</li>
                <li>התראות וזיהוי תנועה</li>
                <li>ניהול עד 4 מצלמות</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">3. רישום וחשבון משתמש</h2>
              <p className="text-slate-700 leading-relaxed">
                לצורך שימוש בשירות, עליך ליצור חשבון משתמש. אתה מתחייב לספק מידע מדויק ומלא במהלך תהליך הרישום ולעדכן מידע זה במידת הצורך. אתה אחראי לשמירה על סודיות פרטי החשבון שלך ולכל הפעילויות המתרחשות תחת חשבונך.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">4. תשלומים ומנויים</h2>
              <p className="text-slate-700 leading-relaxed mb-3">
                השירות מוצע במסגרת מנוי חודשי או שנתי. התשלום מתבצע מראש עבור תקופת המנוי. ביטול המנוי ייכנס לתוקף בתום תקופת החיוב הנוכחית. לא ינתנו החזרים כספיים עבור תקופות שכבר שולמו.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">5. שימוש מותר ואסור</h2>
              <p className="text-slate-700 leading-relaxed mb-3">אתה מסכים לא:</p>
              <ul className="list-disc list-inside text-slate-700 space-y-2 mr-4">
                <li>להשתמש בשירות למטרות בלתי חוקיות</li>
                <li>להפר זכויות פרטיות של אחרים</li>
                <li>לנסות לגשת למערכות או נתונים של משתמשים אחרים</li>
                <li>להעביר וירוסים או קוד זדוני</li>
                <li>להעתיק, לשכפל או למכור את השירות</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">6. קניין רוחני</h2>
              <p className="text-slate-700 leading-relaxed">
                כל הזכויות, הבעלות והאינטרסים בשירות, כולל כל קניין רוחני, שייכים ל-Clearpoint Security. השימוש בשירות אינו מעניק לך זכויות בעלות כלשהן בשירות.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">7. הגבלת אחריות</h2>
              <p className="text-slate-700 leading-relaxed">
                השירות מסופק "כמות שהוא" ללא אחריות מכל סוג. Clearpoint Security לא תהיה אחראית לכל נזק ישיר, עקיף, מקרי, מיוחד או תוצאתי הנובע משימוש או אי-יכולת להשתמש בשירות.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">8. שינויים בתנאים</h2>
              <p className="text-slate-700 leading-relaxed">
                אנו שומרים את הזכות לשנות תנאים אלה בכל עת. שינויים יכנסו לתוקף מיידית עם פרסומם באתר. המשך שימושך בשירות לאחר פרסום שינויים מהווה הסכמה לתנאים המעודכנים.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">9. סיום השירות</h2>
              <p className="text-slate-700 leading-relaxed">
                אנו שומרים את הזכות להשעות או לסיים את גישתך לשירות בכל עת, מכל סיבה, ללא הודעה מוקדמת. במקרה של סיום, כל ההוראות המתייחסות לזכויות קניין, הגבלות אחריות ופיצויים ימשיכו לחול.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">10. דין חל ושיפוט</h2>
              <p className="text-slate-700 leading-relaxed">
                תנאים אלה יפורשו ויוסדרו על פי חוקי מדינת ישראל. כל מחלוקת הנובעת מתנאים אלה תהיה בסמכותם הבלעדית של בתי המשפט המוסמכים בישראל.
              </p>
            </div>

            <div className="pt-8 border-t border-slate-200">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">צור קשר</h2>
              <p className="text-slate-700 leading-relaxed">
                לשאלות לגבי תנאי שימוש אלה, ניתן ליצור קשר בכתובת:{" "}
                <a href="mailto:support@clearpoint.co.il" className="text-blue-600 hover:text-blue-700 font-medium">
                  support@clearpoint.co.il
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

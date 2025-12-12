import Footer from "@/components/Footer";
import { Award } from "lucide-react";

export default function LicensePage() {
  return (
    <main dir="rtl" className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <section className="pt-32 pb-16 px-4 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <div className="max-w-4xl mx-auto text-center">
          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Award className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">הסכם רישיון</h1>
          <p className="text-xl text-blue-100">עדכון אחרון: {new Date().toLocaleDateString('he-IL')}</p>
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg border border-slate-100 p-8 md:p-12">
          <div className="prose prose-slate max-w-none space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">1. הענקת רישיון</h2>
              <p className="text-slate-700 leading-relaxed">
                בכפוף לעמידתך בתנאי הסכם זה, Clearpoint Security מעניקה לך רישיון מוגבל, בלתי בלעדי, בלתי ניתן להעברה לשימוש בשירות למטרותיך האישיות או העסקיות.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">2. הגבלות השימוש</h2>
              <p className="text-slate-700 leading-relaxed mb-3">אינך רשאי:</p>
              <ul className="list-disc list-inside text-slate-700 space-y-2 mr-4">
                <li>להעתיק, לשנות או ליצור עבודות נגזרות מהשירות</li>
                <li>להנדס לאחור, לפרק או לנסות לחלץ קוד מקור</li>
                <li>להשכיר, להשאיל או למכור גישה לשירות</li>
                <li>להסיר או לשנות כל סימן זכויות יוצרים</li>
                <li>להשתמש בשירות בניגוד לחוק</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">3. בעלות על קניין רוחני</h2>
              <p className="text-slate-700 leading-relaxed">
                כל הזכויות בשירות, לרבות קוד, עיצוב, לוגואים וסימנים מסחריים, שייכות ל-Clearpoint Security. הרישיון אינו מעניק לך זכויות בעלות כלשהן.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">4. תוכן משתמש</h2>
              <p className="text-slate-700 leading-relaxed">
                אתה שומר על הבעלות המלאה בנתוני הוידאו וההקלטות שלך. אתה מעניק לנו רישיון מוגבל לאחסן ולעבד תוכן זה אך ורק לצורך מתן השירות לך.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">5. עדכוני תוכנה</h2>
              <p className="text-slate-700 leading-relaxed">
                Clearpoint Security רשאית לספק עדכונים, שדרוגים ותיקונים לשירות. עדכונים אלה כפופים לתנאי רישיון זה, אלא אם צוין אחרת.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">6. סיום הרישיון</h2>
              <p className="text-slate-700 leading-relaxed">
                רישיון זה בתוקף עד סיום המנוי שלך או הפרת תנאי ההסכם. עם סיום הרישיון, עליך להפסיק כל שימוש בשירות.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">7. אחריות מוגבלת</h2>
              <p className="text-slate-700 leading-relaxed">
                השירות מסופק "כמות שהוא" ללא אחריות מפורשת או משתמעת. אנו לא מתחייבים שהשירות יהיה נטול שגיאות או זמין ללא הפרעה.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">8. שיפוי</h2>
              <p className="text-slate-700 leading-relaxed">
                אתה מסכים לשפות את Clearpoint Security מכל תביעה, נזק או הוצאה הנובעים משימושך בשירות או הפרת תנאי הסכם זה.
              </p>
            </div>

            <div className="pt-8 border-t border-slate-200">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">צור קשר</h2>
              <p className="text-slate-700 leading-relaxed">
                לשאלות לגבי הסכם רישיון זה, ניתן ליצור קשר בכתובת:{" "}
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

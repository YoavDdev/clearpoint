'use client';

import Footer from "@/components/Footer";
import { useState } from "react";
import { ChevronDown, HelpCircle, Shield, Camera, CreditCard, Wrench } from "lucide-react";

const faqCategories = [
  {
    title: "כללי",
    icon: HelpCircle,
    color: "from-blue-600 to-cyan-600",
    questions: [
      {
        q: "מה זה Clearpoint Security?",
        a: "Clearpoint Security היא מערכת מעקב חכמה ומאובטחת המשלבת טכנולוגיה מתקדמת עם קלות שימוש. המערכת כוללת צפייה חיה, הקלטה ענן, ודשבורד בעברית לניהול מלא של המצלמות שלך."
      },
      {
        q: "כמה מצלמות אפשר לחבר למערכת?",
        a: "כל לקוח יכול לחבר עד 4 מצלמות למערכת. זה מספק כיסוי מלא לרוב הבתים והעסקים הקטנים."
      },
      {
        q: "האם המערכת עובדת בלי אינטרנט?",
        a: "המערכת דורשת חיבור אינטרנט לצפייה מרחוק ולהעלאת הקלטות לענן. המצלמות ימשיכו להקליט מקומית גם בלי אינטרנט, אך לא תוכל לצפות בהן מרחוק."
      },
      {
        q: "מה ההבדל בין Wi-Fi Cloud ל-SIM Cloud?",
        a: "Wi-Fi Cloud (₪149/חודש) - משתמשת באינטרנט הביתי שלך. מתאים אם יש לך Wi-Fi. אם תבטל מנוי - תוכל עדיין לצפות בלייב. SIM Cloud (₪189/חודש) - כוללת ראוטר SIM עם 500GB גלישה. מתאים למקומות ללא אינטרנט. חשוב: אם תבטל מנוי - לא יהיה אינטרנט ולכן המערכת לא תהיה זמינה."
      }
    ]
  },
  {
    title: "אבטחה",
    icon: Shield,
    color: "from-purple-600 to-pink-600",
    questions: [
      {
        q: "האם ההקלטות שלי מאובטחות?",
        a: "כן! כל ההקלטות מוצפנות בהצפנה ברמה בנקאית (AES-256) הן בשידור והן באחסון. רק אתה יכול לגשת להקלטות שלך באמצעות חשבון המשתמש המאובטח שלך."
      },
      {
        q: "מי יכול לראות את המצלמות שלי?",
        a: "רק אתה יכול לצפות במצלמות שלך. אף אחד אחר, כולל הצוות שלנו, לא יכול לגשת להקלטות או לשידור החי שלך ללא אישורך המפורש."
      },
      {
        q: "מה קורה אם שוכחים את הסיסמה?",
        a: "תוכל לאפס את הסיסמה שלך בקלות דרך דף ההתחברות. נשלח לך קישור אימות לאימייל שנרשם במערכת."
      },
      {
        q: "האם יש גיבוי להקלטות?",
        a: "כן, כל ההקלטות מגובות אוטומטית בענן ומאוחסנות בשרתים מאובטחים. בנוסף, ה-Mini PC שלך שומר עותק מקומי."
      }
    ]
  },
  {
    title: "מצלמות והתקנה",
    icon: Camera,
    color: "from-green-600 to-emerald-600",
    questions: [
      {
        q: "איך מתבצעת ההתקנה?",
        a: "ההתקנה מתבצעת בשני שלבים: (1) התקנה ראשונית במשרדנו להכנת הציוד, (2) התקנה אצלך בבית/עסק על ידי טכנאי מקצועי. כל התהליך לוקח בדרך כלל 2-3 שעות."
      },
      {
        q: "איזה סוג מצלמות אתם מתקינים?",
        a: "אנו משתמשים במצלמות IP איכותיות בטווח 2MP-5MP עם ראיית לילה, עמידות במים (IP66), וזיהוי תנועה חכם."
      },
      {
        q: "האם אפשר להוסיף מצלמות בעתיד?",
        a: "כן, תוכל להוסיף מצלמות נוספות (עד למקסימום 4) בכל זמן. פנה אלינו ונגיע להתקנה."
      },
      {
        q: "כמה זמן נשמרות ההקלטות?",
        a: "ההקלטות נשמרות בענן למשך 7-14 ימים (לפי התוכנית שבחרת). אחרי זה הן נמחקות אוטומטית, אלא אם שמרת אותן באופן ידני."
      }
    ]
  },
  {
    title: "תשלומים ומנויים",
    icon: CreditCard,
    color: "from-orange-600 to-red-600",
    questions: [
      {
        q: "מה כולל המחיר?",
        a: "המחיר כולל את כל הציוד (Mini PC, מצלמות, כבלים), התקנה מלאה, ומנוי חודשי לשירות הענן והתמיכה. אין עלויות נסתרות."
      },
      {
        q: "איך משלמים?",
        a: "ניתן לשלם באמצעות כרטיס אשראי, PayPal, או העברה בנקאית. התשלום הוא חודשי וניתן לביטול בכל עת."
      },
      {
        q: "האם יש תקופת ניסיון?",
        a: "כן! החודש הראשון בחינם, ללא התחייבות. אם לא תהיה מרוצה, תוכל לבטל ללא עלות."
      },
      {
        q: "מה קורה אם אני מבטל את המנוי?",
        a: "תלוי בתוכנית שלך: (1) Wi-Fi Cloud - תוכל להמשיך לצפות בשידור חי (האינטרנט שלך), אבל לא תהיה גישה להקלטות בענן. (2) SIM Cloud - המערכת תהיה לא זמינה לגמרי (כולל צפייה חיה) כי המנוי כולל את האינטרנט SIM. בשני המקרים: הקלטות חדשות לא יישמרו בענן, והציוד נשאר אצלך - שילמת עליו. ניתן לחדש מנוי בכל עת."
      },
      {
        q: "האם יש הנחות לתקופה ארוכה?",
        a: "כן! בתשלום שנתי מראש תקבל 2 חודשים חינם (10 חודשים במחיר של 12)."
      },
      {
        q: "האם הציוד שייך לי או לכם?",
        a: "הציוד (Mini PC, מצלמות, כבלים) שייך לך! שילמת על ההתקנה והציוד בתשלום החד-פעמי. המנוי החודשי הוא רק עבור השירותים: אחסון בענן, גישה לדשבורד, תמיכה טכנית ועדכוני תוכנה. אם תבטל מנוי, הציוד נשאר אצלך."
      }
    ]
  },
  {
    title: "תמיכה ותחזוקה",
    icon: Wrench,
    color: "from-yellow-600 to-orange-600",
    questions: [
      {
        q: "איך מקבלים תמיכה טכנית?",
        a: "תמיכה זמינה בטלפון (054-813-2603), אימייל (support@clearpoint.co.il), ודרך מרכז התמיכה בדשבורד. אנו עונים תוך 24 שעות בימי עבודה."
      },
      {
        q: "מה קורה אם מצלמה מתקלקלת?",
        a: "כל הציוד מגיע עם אחריות מלאה. אם משהו מתקלקל, נגיע לתקן או להחליף ללא עלות נוספת (במסגרת האחריות)."
      },
      {
        q: "האם צריך לעדכן את המערכת?",
        a: "לא! כל העדכונים מתבצעים אוטומטית בענן ואצל ה-Mini PC. אין צורך בפעולה מצדך."
      },
      {
        q: "איך יודעים שהמצלמות עובדות תקין?",
        a: "הדשבורד מציג סטטוס בזמן אמת של כל מצלמה. בנוסף, תקבל התראות אוטומטיות אם מצלמה מתנתקת או מפסיקה להקליט."
      }
    ]
  }
];

export default function FAQPage() {
  const [openItem, setOpenItem] = useState<string | null>(null);

  const toggleItem = (id: string) => {
    setOpenItem(openItem === id ? null : id);
  };

  return (
    <main dir="rtl" className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Hero Section */}
      <section className="pt-32 pb-16 px-4 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            שאלות נפוצות
          </h1>
          <p className="text-xl text-blue-100">
            כל מה שרצית לדעת על Clearpoint Security
          </p>
        </div>
      </section>

      {/* FAQ Content */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          {faqCategories.map((category, categoryIndex) => {
            const IconComponent = category.icon;
            return (
              <div key={categoryIndex} className="mb-12">
                {/* Category Header */}
                <div className="flex items-center gap-4 mb-6">
                  <div className={`w-12 h-12 bg-gradient-to-br ${category.color} rounded-xl flex items-center justify-center`}>
                    <IconComponent className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900">{category.title}</h2>
                </div>

                {/* Questions */}
                <div className="space-y-4">
                  {category.questions.map((item, itemIndex) => {
                    const itemId = `${categoryIndex}-${itemIndex}`;
                    const isOpen = openItem === itemId;

                    return (
                      <div
                        key={itemId}
                        className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden transition-all hover:shadow-xl"
                      >
                        <button
                          onClick={() => toggleItem(itemId)}
                          className="w-full px-6 py-5 flex items-center justify-between text-right hover:bg-slate-50 transition-colors"
                        >
                          <span className="text-lg font-bold text-slate-900 flex-1">
                            {item.q}
                          </span>
                          <ChevronDown
                            className={`w-6 h-6 text-slate-600 transition-transform flex-shrink-0 mr-4 ${
                              isOpen ? 'rotate-180' : ''
                            }`}
                          />
                        </button>
                        
                        {isOpen && (
                          <div className="px-6 pb-5 pt-2">
                            <p className="text-slate-700 leading-relaxed">
                              {item.a}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-16 px-4 bg-slate-50">
        <div className="max-w-4xl mx-auto text-center">
          <h3 className="text-2xl font-bold text-slate-900 mb-4">לא מצאת את התשובה?</h3>
          <p className="text-slate-600 mb-6">אנחנו כאן לעזור! צור קשר ונשמח לענות על כל שאלה</p>
          <a
            href="/contact"
            className="inline-block px-8 py-3 bg-gradient-to-l from-blue-600 to-cyan-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
          >
            צור קשר
          </a>
        </div>
      </section>

      <Footer />
    </main>
  );
}

import Footer from "@/components/Footer";
import { Mail, Phone, MapPin, Clock, Send } from "lucide-react";

export default function ContactPage() {
  return (
    <main dir="rtl" className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Hero Section */}
      <section className="pt-32 pb-16 px-4 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            צור קשר
          </h1>
          <p className="text-xl text-blue-100">
            נשמח לענות על כל שאלה ולסייע לך בכל נושא
          </p>
        </div>
      </section>

      {/* Contact Info Cards */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
            {/* Phone */}
            <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-8 text-center hover:shadow-xl transition-all">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Phone className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">טלפון</h3>
              <a href="tel:0548132603" className="text-blue-600 hover:text-blue-700 font-medium text-lg">
                054-813-2603
              </a>
              <p className="text-slate-600 text-sm mt-2">שעות פעילות: א׳-ה׳ 9:00-18:00</p>
            </div>

            {/* Email */}
            <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-8 text-center hover:shadow-xl transition-all">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">אימייל</h3>
              <a href="mailto:support@clearpoint.co.il" className="text-blue-600 hover:text-blue-700 font-medium text-lg">
                support@clearpoint.co.il
              </a>
              <p className="text-slate-600 text-sm mt-2">מענה תוך 24 שעות</p>
            </div>

            {/* Location */}
            <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-8 text-center hover:shadow-xl transition-all">
              <div className="w-16 h-16 bg-gradient-to-br from-green-600 to-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">כתובת</h3>
              <p className="text-slate-700 font-medium">תל אביב, ישראל</p>
              <p className="text-slate-600 text-sm mt-2">שירות התקנה בכל הארץ</p>
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-8 md:p-12">
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-10">
                <h2 className="text-3xl font-bold text-slate-900 mb-3">שלח לנו הודעה</h2>
                <p className="text-slate-600">מלא את הפרטים ונחזור אליך בהקדם</p>
              </div>

              <form className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Full Name */}
                  <div>
                    <label htmlFor="fullName" className="block text-slate-700 font-medium mb-2">
                      שם מלא *
                    </label>
                    <input
                      type="text"
                      id="fullName"
                      required
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="הכנס שם מלא"
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label htmlFor="phone" className="block text-slate-700 font-medium mb-2">
                      טלפון *
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      required
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="05X-XXX-XXXX"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-slate-700 font-medium mb-2">
                    אימייל *
                  </label>
                  <input
                    type="email"
                    id="email"
                    required
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="example@email.com"
                  />
                </div>

                {/* Subject */}
                <div>
                  <label htmlFor="subject" className="block text-slate-700 font-medium mb-2">
                    נושא
                  </label>
                  <select
                    id="subject"
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  >
                    <option value="">בחר נושא</option>
                    <option value="general">פניה כללית</option>
                    <option value="technical">תמיכה טכנית</option>
                    <option value="sales">מכירות</option>
                    <option value="billing">חיוב ותשלומים</option>
                    <option value="installation">התקנה</option>
                  </select>
                </div>

                {/* Message */}
                <div>
                  <label htmlFor="message" className="block text-slate-700 font-medium mb-2">
                    הודעה *
                  </label>
                  <textarea
                    id="message"
                    required
                    rows={6}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                    placeholder="כתוב את ההודעה שלך כאן..."
                  ></textarea>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  className="w-full px-8 py-4 bg-gradient-to-l from-blue-600 to-cyan-600 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center justify-center gap-3"
                >
                  <span>שלח הודעה</span>
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Quick Link */}
      <section className="py-16 px-4 bg-slate-50">
        <div className="max-w-4xl mx-auto text-center">
          <h3 className="text-2xl font-bold text-slate-900 mb-4">מחפש תשובה מהירה?</h3>
          <p className="text-slate-600 mb-6">בדוק את דף השאלות הנפוצות שלנו</p>
          <a
            href="/faq"
            className="inline-block px-8 py-3 bg-white text-slate-900 rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 border border-slate-200"
          >
            עבור לשאלות נפוצות
          </a>
        </div>
      </section>

      <Footer />
    </main>
  );
}

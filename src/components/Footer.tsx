import Link from "next/link";
import { Shield, Mail, Phone, MapPin, Facebook, Instagram, Linkedin, Twitter } from "lucide-react";

export default function Footer() {
  return (
    <footer dir="rtl" className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          {/* Company Info */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center">
                <Shield className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold">Clearpoint</h3>
                <p className="text-sm text-blue-400">Security Solutions</p>
              </div>
            </div>
            <p className="text-slate-400 leading-relaxed">
              מערכת מעקב חכמה ומאובטחת המשלבת טכנולוגיה מתקדמת עם קלות שימוש לביטחון מירבי של העסק והבית שלך.
            </p>
            {/* Social Media */}
            <div className="flex gap-3">
              <a 
                href="#" 
                className="w-10 h-10 bg-slate-800 hover:bg-blue-600 rounded-lg flex items-center justify-center transition-all duration-300 hover:scale-110"
                aria-label="Facebook"
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a 
                href="#" 
                className="w-10 h-10 bg-slate-800 hover:bg-blue-600 rounded-lg flex items-center justify-center transition-all duration-300 hover:scale-110"
                aria-label="Instagram"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a 
                href="#" 
                className="w-10 h-10 bg-slate-800 hover:bg-blue-600 rounded-lg flex items-center justify-center transition-all duration-300 hover:scale-110"
                aria-label="LinkedIn"
              >
                <Linkedin className="w-5 h-5" />
              </a>
              <a 
                href="#" 
                className="w-10 h-10 bg-slate-800 hover:bg-blue-600 rounded-lg flex items-center justify-center transition-all duration-300 hover:scale-110"
                aria-label="Twitter"
              >
                <Twitter className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-bold mb-6 text-white">קישורים מהירים</h4>
            <ul className="space-y-3">
              <li>
                <Link href="/#features" className="text-slate-400 hover:text-blue-400 transition-colors duration-200 flex items-center gap-2 group">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  <span>למה Clearpoint?</span>
                </Link>
              </li>
              <li>
                <Link href="/#plans" className="text-slate-400 hover:text-blue-400 transition-colors duration-200 flex items-center gap-2 group">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  <span>חבילות ומחירים</span>
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-slate-400 hover:text-blue-400 transition-colors duration-200 flex items-center gap-2 group">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  <span>אודות</span>
                </Link>
              </li>
              <li>
                <Link href="/services" className="text-slate-400 hover:text-blue-400 transition-colors duration-200 flex items-center gap-2 group">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  <span>שירותים</span>
                </Link>
              </li>
              <li>
                <Link href="/login" className="text-slate-400 hover:text-blue-400 transition-colors duration-200 flex items-center gap-2 group">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  <span>התחברות</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-lg font-bold mb-6 text-white">תמיכה ושירות</h4>
            <ul className="space-y-3">
              <li>
                <Link href="/dashboard/support" className="text-slate-400 hover:text-blue-400 transition-colors duration-200 flex items-center gap-2 group">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  <span>מרכז תמיכה</span>
                </Link>
              </li>
              <li>
                <Link href="/subscribe" className="text-slate-400 hover:text-blue-400 transition-colors duration-200 flex items-center gap-2 group">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  <span>הרשמה</span>
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-slate-400 hover:text-blue-400 transition-colors duration-200 flex items-center gap-2 group">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  <span>שאלות נפוצות</span>
                </Link>
              </li>
              <li>
                <Link href="/guides" className="text-slate-400 hover:text-blue-400 transition-colors duration-200 flex items-center gap-2 group">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  <span>מדריכי שימוש</span>
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-slate-400 hover:text-blue-400 transition-colors duration-200 flex items-center gap-2 group">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  <span>צור קשר</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="text-lg font-bold mb-6 text-white">צור קשר</h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3 text-slate-400 group">
                <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-blue-600 transition-colors">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-1">טלפון</p>
                  <a href="tel:0548132603" className="hover:text-blue-400 transition-colors">
                    054-813-2603
                  </a>
                </div>
              </li>
              <li className="flex items-start gap-3 text-slate-400 group">
                <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-blue-600 transition-colors">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-1">אימייל</p>
                  <a href="mailto:support@clearpoint.co.il" className="hover:text-blue-400 transition-colors">
                    support@clearpoint.co.il
                  </a>
                </div>
              </li>
              <li className="flex items-start gap-3 text-slate-400 group">
                <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-blue-600 transition-colors">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-1">כתובת</p>
                  <p className="leading-relaxed">
                    תל אביב, ישראל
                  </p>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-slate-700 mb-8"></div>

        {/* Bottom Bar */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          {/* Copyright */}
          <p className="text-slate-400 text-sm text-center md:text-right">
            © {new Date().getFullYear()} Clearpoint Security. כל הזכויות שמורות.
          </p>

          {/* Legal Links */}
          <div className="flex flex-wrap justify-center gap-6 text-sm">
            <Link href="/terms" className="text-slate-400 hover:text-blue-400 transition-colors">
              תנאי שימוש
            </Link>
            <span className="text-slate-700">•</span>
            <Link href="/privacy" className="text-slate-400 hover:text-blue-400 transition-colors">
              מדיניות פרטיות
            </Link>
            <span className="text-slate-700">•</span>
            <Link href="/license" className="text-slate-400 hover:text-blue-400 transition-colors">
              הסכם רישיון
            </Link>
          </div>
        </div>
      </div>

      {/* Decorative Bottom Gradient */}
      <div className="h-1 bg-gradient-to-l from-blue-600 via-cyan-500 to-blue-600"></div>
    </footer>
  );
}

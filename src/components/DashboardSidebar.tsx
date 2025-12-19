'use client';

import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { Home, Video, HelpCircle, Settings, LogOut, Menu, X, CreditCard, Repeat, FileText, Shield, Globe } from "lucide-react";
import { useState } from "react";
import { signOut } from "next-auth/react";

export default function DashboardSidebar({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push("/login");
  };

  const menuItems = [
    { href: "/dashboard", icon: Home, label: "דף הבית", description: "צפייה חיה במצלמות" },
    { href: "/dashboard?mode=recordings", icon: Video, label: "הקלטות", description: "צפייה בהקלטות קודמות" },
    { href: "/dashboard/subscription", icon: Repeat, label: "המנוי שלי", description: "פרטי התוכנית שלי" },
    { href: "/dashboard/invoices", icon: FileText, label: "חשבוניות", description: "כל החשבוניות שלי" },
    { href: "/dashboard/support", icon: HelpCircle, label: "עזרה ותמיכה", description: "קבלו עזרה מהצוות" },
  ];

  const isActive = (href: string) => {
    // Special handling for recordings mode
    if (href === "/dashboard?mode=recordings") {
      return pathname === "/dashboard" && searchParams.get('mode') === 'recordings';
    }
    // Home page is only active when no mode parameter
    if (href === "/dashboard") {
      return pathname === href && !searchParams.get('mode');
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile Menu Button - Fixed Position for Mobile */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-3 left-3 z-50 p-2.5 bg-blue-600 text-white rounded-lg shadow-lg hover:bg-blue-700 transition-colors"
        aria-label="תפריט"
      >
        {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Sidebar */}
      <aside
        dir="rtl"
        className={`
          fixed lg:static inset-y-0 right-0 z-40
          w-80 bg-white border-l border-slate-200
          transform transition-transform duration-300 ease-in-out
          ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
          flex flex-col
        `}
      >
        {/* Logo/Header */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center">
              <Home className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Clearpoint</h1>
              <p className="text-sm text-slate-600">מערכת האבטחה שלך</p>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`
                  group block p-4 rounded-xl transition-all duration-200
                  ${active 
                    ? 'bg-gradient-to-l from-blue-600 to-cyan-600 text-white shadow-lg' 
                    : 'hover:bg-slate-50 text-slate-700'
                  }
                `}
              >
                <div className="flex items-start gap-4">
                  <div className={`
                    w-12 h-12 rounded-lg flex items-center justify-center shrink-0
                    ${active ? 'bg-white/20' : 'bg-slate-100 group-hover:bg-slate-200'}
                  `}>
                    <Icon className={`w-6 h-6 ${active ? 'text-white' : 'text-slate-600'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-lg font-bold mb-1 ${active ? 'text-white' : 'text-slate-900'}`}>
                      {item.label}
                    </p>
                    <p className={`text-sm ${active ? 'text-blue-100' : 'text-slate-500'}`}>
                      {item.description}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-slate-200 space-y-2">
          <Link
            href="/"
            className="flex items-center gap-3 p-3 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Globe className="w-5 h-5" />
            <span className="font-medium">עמוד ראשי</span>
          </Link>
          {isAdmin && (
            <Link
              href="/admin"
              className="flex items-center gap-3 p-3 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
            >
              <Shield className="w-5 h-5" />
              <span className="font-medium">ממשק ניהול</span>
            </Link>
          )}
          <Link
            href="/settings"
            className="flex items-center gap-3 p-3 text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
          >
            <Settings className="w-5 h-5" />
            <span className="font-medium">הגדרות</span>
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 p-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">התנתקות</span>
          </button>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  );
}

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { 
  LayoutDashboard, 
  Users, 
  Camera, 
  Monitor,
  Mail,
  Settings,
  AlertCircle,
  CheckCircle,
  Bell,
  LogOut,
  FileText,
  Home,
  Menu,
  X
} from "lucide-react";
import { signOut } from "next-auth/react";

const navigation = [
  {
    name: "סקירה כללית",
    href: "/admin",
    icon: LayoutDashboard,
    description: "מבט כולל על המערכת"
  },
  {
    name: "לקוחות",
    href: "/admin/customers",
    icon: Users,
    description: "ניהול לקוחות"
  },
  {
    name: "חשבוניות",
    href: "/admin/invoices",
    icon: FileText,
    description: "ניהול חשבוניות ותשלומים"
  },
  {
    name: "מצלמות",
    href: "/admin/cameras",
    icon: Camera,
    description: "ניטור מצלמות"
  },
  {
    name: "Mini PCs",
    href: "/admin/mini-pcs",
    icon: Monitor,
    description: "מחשבים קטנים"
  },
  {
    name: "התראות ומיילים",
    href: "/admin/notifications",
    icon: Mail,
    description: "ניהול הודעות"
  },
  {
    name: "אבחון מערכת",
    href: "/admin/diagnostics",
    icon: AlertCircle,
    description: "בדיקות מערכת"
  },
  {
    name: "תמיכה",
    href: "/admin/support",
    icon: Bell,
    description: "בקשות תמיכה"
  },
  {
    name: "הגדרות",
    href: "/admin/settings",
    icon: Settings,
    description: "הגדרות מערכת"
  }
];

export function ModernAdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push("/login");
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2.5 bg-blue-600 text-white rounded-lg shadow-lg hover:bg-blue-700 transition-colors"
        aria-label="תפריט"
      >
        {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Sidebar */}
      <div
        className={`
          fixed right-0 top-0 h-screen w-72 bg-white border-l border-slate-200 shadow-lg overflow-y-auto
          transform transition-transform duration-300 ease-in-out z-40
          ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
        `}
        dir="rtl"
      >
      {/* Header */}
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
            <CheckCircle className="text-white" size={28} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Clearpoint</h1>
            <p className="text-sm text-slate-600">לוח בקרה מנהל</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-4 space-y-2">
        {navigation.map((item) => {
          const isActive = pathname === item.href || 
                          (item.href !== '/admin' && pathname?.startsWith(item.href));
          
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsMobileMenuOpen(false)}
              className={`
                group relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all
                ${isActive 
                  ? 'bg-gradient-to-l from-blue-500 to-cyan-500 text-white shadow-lg' 
                  : 'text-slate-700 hover:bg-slate-100'
                }
              `}
            >
              <item.icon size={22} className={isActive ? 'text-white' : 'text-slate-600 group-hover:text-blue-500'} />
              
              <div className="flex-1">
                <div>
                  <span className="font-semibold">{item.name}</span>
                </div>
                <p className={`text-xs ${isActive ? 'text-white/80' : 'text-slate-500'}`}>
                  {item.description}
                </p>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-200 bg-white space-y-2">
        <Link
          href="/dashboard"
          className="w-full flex items-center gap-3 p-3 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
        >
          <Home className="w-5 h-5" />
          <span className="font-medium">דשבורד משתמש</span>
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 p-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">התנתקות</span>
        </button>
        <div className="text-center pt-2 border-t border-slate-200">
          <p className="text-xs text-slate-600">
            מערכת ניהול Clearpoint Security
          </p>
          <p className="text-xs text-slate-500 mt-1">
            גרסה 2.0
          </p>
        </div>
      </div>
      </div>

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

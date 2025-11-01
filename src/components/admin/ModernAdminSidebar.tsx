"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Users, 
  Camera, 
  Monitor,
  Mail,
  Settings,
  AlertCircle,
  CheckCircle,
  Bell
} from "lucide-react";

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

  return (
    <div className="fixed right-0 top-0 h-screen w-72 bg-white border-l border-slate-200 shadow-lg overflow-y-auto" dir="rtl">
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
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-200 bg-slate-50">
        <div className="text-center">
          <p className="text-xs text-slate-600">
            מערכת ניהול Clearpoint Security
          </p>
          <p className="text-xs text-slate-500 mt-1">
            גרסה 2.0
          </p>
        </div>
      </div>
    </div>
  );
}

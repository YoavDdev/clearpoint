"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Camera,
  CreditCard,
  LifeBuoy,
  LogOut,
  Settings,
  UserPlus,
  CameraIcon,
  MessageSquare,
  FileText,
  BarChart3,
  Shield,
  Plus,
  Database,
} from "lucide-react";

// Navigation sections for better organization
const navigationSections = [
  {
    title: "ניהול ראשי",
    items: [
      { href: "/admin", label: "לוח בקרה", icon: <LayoutDashboard size={20} />, description: "סקירה כללית של המערכת" },
      { href: "/admin/analytics", label: "דוחות ונתונים", icon: <BarChart3 size={20} />, description: "נתוני שימוש וביצועים" },
    ]
  },
  {
    title: "ניהול לקוחות",
    items: [
      { href: "/admin/customers", label: "לקוחות", icon: <Users size={20} />, description: "ניהול לקוחות ומנויים" },
      { href: "/admin/customers/new", label: "לקוח חדש", icon: <UserPlus size={20} />, description: "הוספת לקוח חדש למערכת", isAction: true },
      { href: "/admin/requests", label: "בקשות הצטרפות", icon: <FileText size={20} />, description: "בקשות מאתר האינטרנט" },
    ]
  },
  {
    title: "ניהול מצלמות",
    items: [
      { href: "/admin/cameras", label: "מצלמות", icon: <Camera size={20} />, description: "ניהול וניטור מצלמות" },
      { href: "/admin/diagnostics", label: "אבחון מצלמות", icon: <Database size={20} />, description: "אבחון מצלמות במסד הנתונים" },
      { href: "/admin/cameras/new", label: "מצלמה חדשה", icon: <Plus size={20} />, description: "הוספת מצלמה חדשה", isAction: true },
    ]
  },
  {
    title: "תמיכה ושירות",
    items: [
      { href: "/admin/support", label: "פניות תמיכה", icon: <LifeBuoy size={20} />, description: "טיפול בפניות לקוחות" },
      { href: "/admin/messages", label: "הודעות מערכת", icon: <MessageSquare size={20} />, description: "הודעות והתראות" },
    ]
  },
  {
    title: "מערכת והגדרות",
    items: [
      { href: "/admin/billing", label: "חיובים ותשלומים", icon: <CreditCard size={20} />, description: "ניהול חיובים ומנויים" },
      { href: "/admin/settings", label: "הגדרות מערכת", icon: <Settings size={20} />, description: "הגדרות כלליות" },
    ]
  }
];

export default function Sidebar({ open }: { open: boolean }) {
  const pathname = usePathname();

  return (
    <aside
      className={`fixed top-[64px] right-0 z-40 h-[calc(100vh-64px)] w-80 bg-gradient-to-b from-slate-900 to-slate-800 text-white flex flex-col transform transition-all duration-300 shadow-2xl ${
        open ? "translate-x-0" : "translate-x-full"
      }`}
    >
      {/* Header */}
      <div className="p-6 border-b border-slate-700/50">
        <div className="flex items-center gap-3 justify-end">
          <div className="text-right">
            <h2 className="font-bold text-xl text-white">מערכת ניהול</h2>
            <p className="text-slate-300 text-sm">Clearpoint Security</p>
          </div>
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <Shield size={20} className="text-white" />
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-4 py-6">
        <div className="space-y-8">
          {navigationSections.map((section, sectionIndex) => (
            <div key={sectionIndex}>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 text-right px-3">
                {section.title}
              </h3>
              <ul className="space-y-1">
                {section.items.map((item) => {
                  const isActive = pathname === item.href;
                  const isAction = item.isAction;
                  
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={`group flex items-center justify-between px-3 py-3 rounded-xl font-medium transition-all duration-200 ${
                          isActive
                            ? "bg-blue-600 text-white shadow-lg shadow-blue-600/25"
                            : isAction
                            ? "hover:bg-green-600/20 text-green-300 border border-green-600/30 hover:border-green-500"
                            : "hover:bg-slate-700/50 text-slate-300 hover:text-white"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`shrink-0 transition-transform group-hover:scale-110 ${
                            isActive ? "text-white" : isAction ? "text-green-400" : "text-slate-400"
                          }`}>
                            {item.icon}
                          </span>
                          <div className="text-right">
                            <div className="font-medium text-sm">{item.label}</div>
                            <div className={`text-xs mt-0.5 ${
                              isActive ? "text-blue-100" : "text-slate-500"
                            }`}>
                              {item.description}
                            </div>
                          </div>
                        </div>
                        {isAction && (
                          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-700/50">
        <button className="flex items-center justify-center w-full gap-3 py-3 rounded-xl bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white border border-red-600/30 hover:border-red-500 text-sm font-medium transition-all duration-200 group">
          <LogOut size={18} className="transition-transform group-hover:scale-110" />
          <span>התנתקות מהמערכת</span>
        </button>
      </div>
    </aside>
  );
}

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
} from "lucide-react";

const navLinks = [
  { href: "/admin", label: "ניהול", icon: <LayoutDashboard size={18} /> },
  { href: "/admin/customers", label: "לקוחות", icon: <Users size={18} /> },
  { href: "/admin/cameras", label: "מצלמות", icon: <Camera size={18} /> },
  { href: "/admin/billing", label: "חיובים", icon: <CreditCard size={18} /> },
  { href: "/admin/support", label: "תמיכה", icon: <LifeBuoy size={18} /> },
];

export default function Sidebar({ open }: { open: boolean }) {
  const pathname = usePathname();

  return (
<aside
  className={`fixed top-[64px] right-0 z-40 h-[calc(100vh-64px)] w-64 bg-zinc-900 text-white flex flex-col justify-between transform transition-transform duration-300 ${
    open ? "translate-x-0" : "translate-x-full"
  }`}
>
      {/* Logo */}
      <div className="p-6 font-bold text-lg text-center border-b border-zinc-800">
        קלירפוינט ניהול
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 text-sm">
        <ul className="space-y-2">
          {navLinks.map(({ href, label, icon }) => (
            <li key={href}>
              <Link
                href={href}
                className={`flex items-center justify-end gap-2 px-3 py-2 rounded-md font-medium transition-all ${
                  pathname === href
                    ? "bg-zinc-800 text-white"
                    : "hover:bg-zinc-800 text-zinc-300"
                }`}
              >
                <span>{label}</span>
                <span className="shrink-0">{icon}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Logout Button */}
      <div className="p-4 border-t border-zinc-800">
        <button className="flex items-center justify-center w-full gap-2 py-2 rounded-md bg-red-600 hover:bg-red-700 text-sm font-medium">
          <LogOut size={16} />
          <span>התנתקות</span>
        </button>
      </div>
    </aside>
  );
}

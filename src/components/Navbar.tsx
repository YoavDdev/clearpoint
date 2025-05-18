"use client";

import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";
import { useState } from "react";
import { Menu } from "lucide-react";

export default function Navbar() {
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="fixed top-0 inset-x-0 z-50 bg-white/60 dark:bg-black/40 backdrop-blur-md border-b border-gray-200 dark:border-zinc-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between text-sm md:text-base font-sans text-gray-900 dark:text-white">
        {/* Brand logo/text */}
        <div className="text-lg md:text-xl font-semibold tracking-tight">
          קלירפוינט
        </div>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-6">

          <Link href="/" className="hover:opacity-60 transition">בית</Link>
          <Link href="/about" className="hover:opacity-60 transition">עלינו</Link>
          <Link href="/services" className="hover:opacity-60 transition">שירותים</Link>
          {session && (
            <>
              <Link href="/dashboard" className="hover:opacity-60 transition">לוח בקרה</Link>
              <Link href="/support" className="hover:opacity-60 transition">תמיכה</Link>
            </>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          className="md:hidden p-2 rounded hover:bg-gray-100 dark:hover:bg-zinc-800"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          <Menu size={20} />
        </button>

        {/* Auth button */}
        <div className="hidden md:block">
          {!session ? (
            <button
              onClick={() => signIn()}
              className="px-4 py-1.5 bg-gray-900 text-white rounded-full text-sm hover:opacity-90 transition"
            >
              התחברות
            </button>
          ) : (
            <button
              onClick={() => signOut()}
              className="px-4 py-1.5 bg-red-500 text-white rounded-full text-sm hover:bg-red-600 transition"
            >
              התנתקות
            </button>
          )}
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="md:hidden px-4 pt-2 pb-3 space-y-2 text-sm font-medium bg-white dark:bg-zinc-900 border-t border-gray-200 dark:border-zinc-700">
          <Link href="/" className="block hover:opacity-60 transition">בית</Link>
          <Link href="/about" className="block hover:opacity-60 transition">עלינו</Link>
          <Link href="/services" className="block hover:opacity-60 transition">שירותים</Link>
          {session && (
            <>
              <Link href="/dashboard" className="block hover:opacity-60 transition">לוח בקרה</Link>
              <Link href="/support" className="block hover:opacity-60 transition">תמיכה</Link>
            </>
          )}
          {!session ? (
            <button
              onClick={() => signIn()}
              className="w-full text-right px-4 py-2 bg-gray-900 text-white rounded-md hover:opacity-90 transition"
            >
              התחברות
            </button>
          ) : (
            <button
              onClick={() => signOut()}
              className="w-full text-right px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition"
            >
              התנתקות
            </button>
          )}
        </div>
      )}
    </nav>
  );
}
"use client";

import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";

export default function Navbar() {
  const { data: session } = useSession();

  return (
    <nav className="flex items-center justify-between p-6 bg-gray-800 text-white">
      <div className="flex space-x-6">
        <Link href="/">Home</Link>
        <Link href="/about">About</Link>
        <Link href="/services">Services</Link>
        {session && (
  <>
    <Link href="/dashboard">Dashboard</Link>
    <Link href="/billing">Billing</Link>
    <Link href="/support">Support</Link> {/* Add this line */}
  </>
)}
      </div>

      <div>
        {!session ? (
          <button onClick={() => signIn()} className="bg-blue-600 px-4 py-2 rounded">
            Login
          </button>
        ) : (
          <button onClick={() => signOut()} className="bg-red-600 px-4 py-2 rounded">
            Logout
          </button>
        )}
      </div>
    </nav>
  );
}

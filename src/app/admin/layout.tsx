'use client';

import { ReactNode } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import Link from "next/link";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <div>Loading...</div>;
  }

  if (!session || session.user?.email !== "admin@clearpoint.com") {
    redirect("/");
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-800 text-white flex flex-col p-6 space-y-6">
        <div className="text-2xl font-bold mb-8">
          ClearPoint Admin
        </div>
        <nav className="flex flex-col space-y-4">
          <Link href="/admin" className="hover:text-gray-300">Admin Home</Link>
          <Link href="/admin/customers" className="hover:text-gray-300">Customers</Link>
          <Link href="/admin/devices" className="hover:text-gray-300">Devices</Link>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 bg-gray-100">
        {children}
      </main>
    </div>
  );
}

// app/dashboard/layout.tsx
"use client";

import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { ReactNode, useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";


export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();

  const [cameras, setCameras] = useState<any[]>([]);

  useEffect(() => {
    const fetchCameras = async () => {
      if (!session?.user?.access_token) return;

      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: {
            headers: { Authorization: `Bearer ${session.user.access_token}` },
          },
        }
      );

      const { data } = await supabase
        .from("cameras")
        .select("*")
        .eq("user_email", session.user.email);

      if (data) setCameras(data);
    };

    fetchCameras();
  }, [session]);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100 pt-16">
      {/* Sidebar */}
      <aside className="w-full md:w-72 bg-white border-l border-gray-200 shadow px-4 py-6 hidden md:flex flex-col justify-between text-right">
        <div className="space-y-6">
          <div>
            <div className="font-bold text-lg text-gray-800">
              שלום, {session?.user?.email?.split("@")[0] || "משתמש"} 👋
            </div>
            <div className="text-sm text-gray-500">{session?.user?.email}</div>
          </div>

          <div className="text-sm space-y-2">
            <div>🎥 מצלמות מחוברות: <span className="font-bold text-blue-600">{cameras.length}</span></div>
            <div>💳 סוג מנוי: <span className="font-semibold">Premium</span></div>
            <div>⏱ גישה להיסטוריה: <span className="text-gray-500">7 ימים</span></div>
          </div>

          <div>
            <div className="text-sm font-semibold text-gray-700 mb-2 mt-6">⚙️ פעולות מהירות</div>
            <ul className="space-y-2 text-sm">
                <li>           <Link
              href="/dashboard"
              className="text-blue-600 hover:underline"
            >
              📺 עבור לחדר צפייה חיה
            </Link></li>
              <li>
                <Link href="/dashboard/footage" className="text-blue-600 hover:underline">⏪ צפייה בהקלטות</Link>
              </li>
              <li>
                <Link href="/support" className="text-blue-600 hover:underline">❓ תמיכה</Link>
              </li>
              <li>
                <a href="#" className="text-blue-600 hover:underline">🧾 חיובים</a>
              </li>
            </ul>
          </div>

          <div>
            <div className="text-sm font-semibold text-gray-700 mb-2">💾 שימוש באחסון</div>
            <div className="mt-1 bg-gray-200 h-2 rounded-full">
              <div className="bg-green-500 h-2 rounded-full w-2/3"></div>
            </div>
            <div className="text-xs text-gray-500 mt-1">66% מנוצל מתוך 100GB</div>
          </div>
        </div>

        <button className="text-sm text-red-500 hover:underline text-right mt-6">🚪 התנתקות</button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-y-auto">
        

        {children}
      </main>
    </div>
  );
}

"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import CameraCard from "@/components/CameraCard";
import PlanCard from "@/components/dashboard/PlanCard";
import SupportCard from "@/components/dashboard/SupportCard";
import DownloadCard from "@/components/dashboard/DownloadCard";
import { motion } from "framer-motion";
import DownloadRequestForm from "@/components/DownloadRequestForm";


export default function DashboardPage() {
  const { data: session } = useSession();
  const [cameras, setCameras] = useState<any[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<any | null>(null);

  useEffect(() => {
    const fetchCameras = async () => {
      if (!session?.user?.access_token) return;

      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: {
            headers: {
              Authorization: `Bearer ${session.user.access_token}`,
            },
          },
        }
      );

      const { data } = await supabase
        .from("cameras")
        .select("*")
        .eq("user_email", session.user.email);

      if (data) {
        setCameras(data);
        setSelectedCamera(data[0]);
      }
    };

    fetchCameras();
  }, [session]);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100 pt-16">
      {/* Sidebar */}
      <aside className="w-full md:w-72 bg-white border-l border-gray-200 shadow px-4 py-6 hidden md:flex flex-col justify-between text-right">
  <div className="space-y-6">

    {/* Account Info */}
    <div>
    <div className="font-bold text-lg text-gray-800">
  שלום, {session?.user?.email?.split("@")[0] || "משתמש"} 👋
</div>      <div className="text-sm text-gray-500">{session?.user?.email}</div>
    </div>

    {/* Options */}
    <div>
      <div className="text-sm font-semibold text-gray-700 mb-2">⚙️ אפשרויות</div>
      <ul className="space-y-2 text-sm text-blue-600">
        <li><a href="#" className="hover:underline">היסטוריית חיובים</a></li>
        <li><a href="/support" className="hover:underline">תמיכה</a></li>
      </ul>
    </div>

    {/* Storage Usage */}
    <div>
      <div className="text-sm font-semibold text-gray-700 mb-2">💾 שימוש באחסון</div>
      <div className="mt-1 bg-gray-200 h-2 rounded-full">
        <div className="bg-green-500 h-2 rounded-full w-2/3"></div>
      </div>
      <div className="text-xs text-gray-500 mt-1">66% מנוצל</div>
    </div>
  </div>

  {/* Logout */}
  <button className="text-sm text-red-500 hover:underline text-right mt-6">התנתקות</button>
</aside>


      {/* Main content */}
      <main className="flex-1 p-6 overflow-y-auto">
        <h1 className="text-3xl font-bold text-right mb-6">לוח הבקרה שלך</h1>

        {/* Live View Panel */}
        <div className="w-full max-w-6xl mx-auto mb-4">
          <h2 className="text-xl font-semibold text-right mb-4">📺 חדר צפייה חיה</h2>

          <div className="flex flex-col lg:flex-row gap-4">
            {selectedCamera && (
              <div className="flex flex-col lg:flex-row gap-4 w-full">
                {/* Info Box */}
                <div className="bg-white rounded-2xl shadow p-4 w-full lg:w-72 text-sm text-right flex flex-col justify-between">
                  <div>
                    <div className="font-bold text-md mb-2">🎥 מצלמה נבחרת</div>
                    <div className="mb-2 font-semibold">{selectedCamera.name}</div>
                    <div className="text-gray-600">📶 מצב: {selectedCamera.is_stream_active ? "🟢 פעילה" : "🔴 לא פעילה"}</div>
                    <div className="text-gray-600">🎞 איכות: HD</div>
                  </div>
                  <div className="space-y-2 mt-4">
                    <button className="w-full bg-blue-50 hover:bg-blue-100 rounded px-4 py-2 text-sm text-blue-700">צלם תמונה</button>
                    <button className="w-full bg-blue-50 hover:bg-blue-100 rounded px-4 py-2 text-sm text-blue-700">⏪ צפייה לאחור (עד שבוע)</button>
                    <button className="w-full bg-gray-200 hover:bg-gray-300 rounded px-4 py-2 text-sm">⬇️ הורד קטע</button>
                    <a
    href="/dashboard/footage"
    className="w-full block text-center bg-yellow-100 hover:bg-yellow-200 text-yellow-800 rounded px-4 py-2 text-sm mt-2"
  >
    ⏪ עבור לצפייה בהקלטות
  </a>
                  </div>
                </div>

                {/* Large Camera View */}
                <motion.div
                  key={selectedCamera.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="flex-1"
                >
                  <CameraCard camera={selectedCamera} />
                </motion.div>

              </div>
            )}
          </div>
        </div>

        {/* 📌 Mini Navbar Section */}
        <div className="w-full max-w-6xl mx-auto mt-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <PlanCard />
            <SupportCard />
            <DownloadCard />
          </div>
        </div>

        {/* Additional Cameras */}
        <div className="w-full max-w-6xl mx-auto">
          <h2 className="text-xl font-semibold text-right mb-4 mt-12">📷 מצלמות נוספות</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 justify-items-center">
            {cameras.filter(cam => cam.id !== selectedCamera?.id).map((camera) => (
              <div
                key={camera.id}
                className="cursor-pointer transition-transform hover:scale-105 w-full max-w-[480px]"
                onClick={() => setSelectedCamera(camera)}
              >
                <div className="h-[160px]">
                  <CameraCard camera={camera} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

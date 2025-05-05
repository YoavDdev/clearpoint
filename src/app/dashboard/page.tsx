"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import CameraCard from "@/components/CameraCard";
import { motion } from "framer-motion";

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

  const otherCameras = cameras.filter((cam) => cam.id !== selectedCamera?.id);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 xl:px-0">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Top: Big centered camera spans 2 columns */}
        {selectedCamera && (
          <motion.div
            key={selectedCamera.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="col-span-full justify-self-center"
          >
            <CameraCard camera={selectedCamera} />
          </motion.div>
        )}

        {/* Bottom: Other cameras side-by-side */}
        {otherCameras.slice(0, 2).map((camera) => (
          <div
            key={camera.id}
            onClick={() => setSelectedCamera(camera)}
            className="w-full cursor-pointer transition-transform hover:scale-[1.01]"
          >
            <div className="aspect-[16/9] w-full">
              <CameraCard camera={camera} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

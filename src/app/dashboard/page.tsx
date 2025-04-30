'use client';

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { createClient } from '@supabase/supabase-js';
import LiveStreamPlayer from "@/components/LiveStreamPlayer";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const [cameras, setCameras] = useState<any[]>([]);
  const [editingCameraId, setEditingCameraId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    async function fetchCameras() {
      if (status === "loading") return;
              // @ts-ignore
      if (!session || !session.user || !session.user.access_token) {
        console.log("No session or missing access_token");
        return;
      }

      console.log("Logged in user email:", session?.user?.email);
      console.log("Fetching cameras where user_email =", session?.user?.email);

      // ✅ Create dynamic client INSIDE fetchCameras
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: {
            headers: {
                        // @ts-ignore
              Authorization: `Bearer ${session.user.access_token}`, // ✅ Correct token passing
            },
          },
        }
      );

      const { data, error } = await supabase
        .from('cameras')
        .select('*')
        .eq('user_email', session.user.email);

      if (error) {
        console.error("Error fetching cameras:", error);
      } else {
        console.log("Fetched cameras:", data);
        setCameras(data || []);
      }
    }

    fetchCameras();
  }, [session, status]);

  const handleRename = async (cameraId: any) => {
    const updatedCameras = cameras.map((cam) =>
      cam.id === cameraId ? { ...cam, name: newName } : cam
    );
    setCameras(updatedCameras);

    // ✅ Create dynamic client again to update securely
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
                    // @ts-ignore
            Authorization: `Bearer ${session?.user?.access_token}`,
          },
        },
      }
    );

    await supabase
      .from('cameras')
      .update({ name: newName })
      .eq('id', cameraId);

    setEditingCameraId(null);
    setNewName("");
  };

  const updateCameraStatus = async (cameraId: string, isOnline: boolean) => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            // @ts-ignore
            Authorization: `Bearer ${session?.user?.access_token}`,
          },
        },
      }
    );
  
    const { error } = await supabase
      .from("cameras")
      .update({ is_stream_active: isOnline, last_seen_at: new Date().toISOString() })

      .eq("id", cameraId);
  
    if (error) {
      console.error("❌ Failed to update camera status:", error);
    } else {
      console.log(`✅ Camera ${cameraId} marked as ${isOnline ? "online" : "offline"}`);
    }
  };
  

  return (
    <main className="flex flex-col items-center min-h-screen p-6 sm:p-8">
      <h1 className="text-2xl sm:text-4xl font-bold text-center max-w-[90%] break-words mb-8">
        Welcome to Your Cameras
      </h1>

      {/* Camera Cards */}
      <div className="w-full max-w-6xl flex justify-center">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {cameras.map((camera) => (
            <div
              key={camera.id}
              className="w-72 h-72 bg-white border border-gray-200 rounded-2xl shadow-md overflow-hidden flex flex-col"
            >
<LiveStreamPlayer
  path={camera.id}
  onSuccess={() => updateCameraStatus(camera.id, true)}
  onError={() => updateCameraStatus(camera.id, false)}
/>
              <div className="flex flex-col items-center justify-center p-4">
                {editingCameraId === camera.id ? (
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onBlur={() => handleRename(camera.id)}
                    className="border border-gray-300 rounded-lg p-1 text-center text-sm w-40 focus:outline-none focus:ring-1 focus:ring-blue-400"
                    placeholder="Camera name"
                    autoFocus
                  />
                ) : (
                  <div className="flex items-center gap-2 text-center font-semibold text-gray-800 text-base">
                    <span>{camera.name}</span>
                    <button
                      onClick={() => {
                        setEditingCameraId(camera.id);
                        setNewName(camera.name);
                      }}
                      className="text-gray-400 hover:text-blue-400 text-xs"
                    >
                      ✏️
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

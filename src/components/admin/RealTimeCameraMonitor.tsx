"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

interface CameraHealth {
  id: string;
  name: string;
  user_name: string;
  is_stream_active: boolean;
  last_seen_at: string | null;
  stream_status?: string;
  disk_root_pct?: number;
  disk_ram_pct?: number;
  log_message?: string;
}

export function RealTimeCameraMonitor() {
  const [cameras, setCameras] = useState<CameraHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const fetchCameraData = async () => {
    try {
      // Fetch camera data with user info
      const { data: cameraData } = await supabase
        .from("cameras")
        .select(`
          id,
          name,
          is_stream_active,
          last_seen_at,
          user:users!cameras_user_id_fkey(full_name)
        `)
        .order("name");

      if (cameraData) {
        // Fetch health data for each camera
        const healthPromises = cameraData.map(async (camera: any) => {
          try {
            const res = await fetch(`/api/camera-health/${camera.id}`);
            const healthData = await res.json();
            return {
              id: camera.id,
              name: camera.name,
              user_name: Array.isArray(camera.user) 
                ? camera.user[0]?.full_name || "Unknown"
                : camera.user?.full_name || "Unknown",
              is_stream_active: camera.is_stream_active,
              last_seen_at: camera.last_seen_at,
              stream_status: healthData.success ? healthData.health?.stream_status : "unknown",
              disk_root_pct: healthData.success ? healthData.health?.disk_root_pct : null,
              disk_ram_pct: healthData.success ? healthData.health?.disk_ram_pct : null,
              log_message: healthData.success ? healthData.health?.log_message : null,
            };
          } catch (error) {
            return {
              id: camera.id,
              name: camera.name,
              user_name: Array.isArray(camera.user) 
                ? camera.user[0]?.full_name || "Unknown"
                : camera.user?.full_name || "Unknown",
              is_stream_active: camera.is_stream_active,
              last_seen_at: camera.last_seen_at,
              stream_status: "error",
              disk_root_pct: null,
              disk_ram_pct: null,
              log_message: "Failed to fetch health data",
            };
          }
        });

        const camerasWithHealth = await Promise.all(healthPromises);
        setCameras(camerasWithHealth);
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error("Failed to fetch camera data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCameraData();
    
    // Update every 30 seconds
    const interval = setInterval(fetchCameraData, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string | undefined, isActive: boolean) => {
    if (!isActive) return "bg-red-100 text-red-700 border-red-200";
    if (status === "ok") return "bg-green-100 text-green-700 border-green-200";
    if (status === "warning") return "bg-yellow-100 text-yellow-700 border-yellow-200";
    return "bg-red-100 text-red-700 border-red-200";
  };

  const getLastSeenStatus = (lastSeen: string | null) => {
    if (!lastSeen) return { text: "לא ידוע", color: "text-gray-500" };
    
    const now = new Date();
    const lastSeenDate = new Date(lastSeen);
    const diffMinutes = Math.floor((now.getTime() - lastSeenDate.getTime()) / 60000);
    
    if (diffMinutes < 2) return { text: "עכשיו", color: "text-green-600" };
    if (diffMinutes < 5) return { text: `${diffMinutes} דקות`, color: "text-green-600" };
    if (diffMinutes < 15) return { text: `${diffMinutes} דקות`, color: "text-yellow-600" };
    if (diffMinutes < 60) return { text: `${diffMinutes} דקות`, color: "text-orange-600" };
    
    const diffHours = Math.floor(diffMinutes / 60);
    return { text: `${diffHours} שעות`, color: "text-red-600" };
  };

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center">
          🔴 מוניטור מצלמות בזמן אמת
        </h3>
        <div className="text-xs text-gray-500">
          עודכן: {lastUpdate.toLocaleTimeString("he-IL")}
        </div>
      </div>
      
      <div className="space-y-4">
        {cameras.map((camera) => {
          const lastSeenStatus = getLastSeenStatus(camera.last_seen_at);
          
          return (
            <div
              key={camera.id}
              className={`p-4 rounded-lg border-2 transition-all ${
                camera.is_stream_active ? "bg-green-50" : "bg-red-50"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h4 className="font-medium text-lg">{camera.name}</h4>
                  <p className="text-sm text-gray-600">{camera.user_name}</p>
                </div>
                <div className="text-left">
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium border ${
                    getStatusColor(camera.stream_status, camera.is_stream_active)
                  }`}>
                    {camera.is_stream_active ? "🟢 פעיל" : "🔴 לא פעיל"}
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">סטטוס זרם:</span>
                  <p className="font-medium">
                    {camera.stream_status === "ok" ? "תקין" : 
                     camera.stream_status === "warning" ? "אזהרה" : 
                     camera.stream_status === "error" ? "שגיאה" : "לא ידוע"}
                  </p>
                </div>
                
                <div>
                  <span className="text-gray-600">נראה לאחרונה:</span>
                  <p className={`font-medium ${lastSeenStatus.color}`}>
                    {lastSeenStatus.text}
                  </p>
                </div>
                
                <div>
                  <span className="text-gray-600">שימוש דיסק:</span>
                  <p className={`font-medium ${
                    camera.disk_root_pct && camera.disk_root_pct > 90 ? "text-red-600" :
                    camera.disk_root_pct && camera.disk_root_pct > 80 ? "text-yellow-600" : "text-green-600"
                  }`}>
                    {camera.disk_root_pct ? `${camera.disk_root_pct}%` : "לא זמין"}
                  </p>
                </div>
                
                <div>
                  <span className="text-gray-600">שימוש RAM:</span>
                  <p className={`font-medium ${
                    camera.disk_ram_pct && camera.disk_ram_pct > 90 ? "text-red-600" :
                    camera.disk_ram_pct && camera.disk_ram_pct > 80 ? "text-yellow-600" : "text-green-600"
                  }`}>
                    {camera.disk_ram_pct ? `${camera.disk_ram_pct}%` : "לא זמין"}
                  </p>
                </div>
              </div>
              
              {camera.log_message && (
                <div className="mt-3 p-2 bg-gray-100 rounded text-xs">
                  <span className="text-gray-600">הודעת מערכת:</span>
                  <p className="text-gray-800 mt-1">{camera.log_message}</p>
                </div>
              )}
            </div>
          );
        })}
        
        {cameras.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>לא נמצאו מצלמות במערכת</p>
          </div>
        )}
      </div>
      
      <div className="mt-4 pt-4 border-t border-gray-200">
        <button
          onClick={fetchCameraData}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          🔄 רענן נתונים
        </button>
      </div>
    </div>
  );
}

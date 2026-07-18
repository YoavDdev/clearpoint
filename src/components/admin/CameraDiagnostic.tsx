"use client";

import { useEffect, useState } from "react";

interface CameraData {
  id: string;
  name: string;
  is_stream_active: boolean | null;
  user_id: string;
  stream_path: string;
  created_at: string;
  last_seen_at: string | null;
  user: {
    full_name: string;
    email: string;
  }[] | {
    full_name: string;
    email: string;
  } | null;
}

export function CameraDiagnostic() {
  const [cameras, setCameras] = useState<CameraData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCameras = async () => {
      try {
        const response = await fetch("/api/admin/cameras");
        const result = await response.json();

        if (!response.ok) {
          console.error("Error fetching cameras:", result.error);
          setCameras([]);
        } else {
          setCameras(result.cameras || []);
        }
      } catch (error) {
        console.error("Failed to fetch cameras:", error);
        setCameras([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCameras();
  }, []);

  const deleteCamera = async (cameraId: string, cameraName: string) => {
    const confirmed = confirm(`האם אתה בטוח שברצונך למחוק את המצלמה "${cameraName}"?`);
    if (!confirmed) return;

    try {
      const res = await fetch("/api/admin/cameras", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cameraId }),
      });
      const result = await res.json();

      if (!result.success) {
        alert("שגיאה במחיקת המצלמה: " + result.error);
      } else {
        alert("המצלמה נמחקה בהצלחה");
        window.location.reload();
      }
    } catch (error) {
      alert("שגיאה במחיקת המצלמה");
    }
  };

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-12 bg-gray-200 rounded"></div>
            <div className="h-12 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const activeCameras = cameras.filter(c => c.is_stream_active === true);
  const inactiveCameras = cameras.filter(c => c.is_stream_active === false);
  const unknownCameras = cameras.filter(c => c.is_stream_active === null);

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">🔍 אבחון מצלמות במסד הנתונים</h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-green-50 p-3 rounded border border-green-200">
          <div className="text-lg font-bold text-green-600">{activeCameras.length}</div>
          <div className="text-sm text-green-700">מצלמות פעילות</div>
        </div>
        <div className="bg-red-50 p-3 rounded border border-red-200">
          <div className="text-lg font-bold text-red-600">{inactiveCameras.length}</div>
          <div className="text-sm text-red-700">מצלמות לא פעילות</div>
        </div>
        <div className="bg-gray-50 p-3 rounded border border-gray-200">
          <div className="text-lg font-bold text-gray-600">{unknownCameras.length}</div>
          <div className="text-sm text-gray-700">סטטוס לא ידוע</div>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="font-medium text-gray-800">כל המצלמות במסד הנתונים:</h4>
        
        {cameras.length === 0 ? (
          <p className="text-gray-500 text-center py-4">לא נמצאו מצלמות</p>
        ) : (
          <div className="space-y-3">
            {cameras.map((camera) => {
              const user = Array.isArray(camera.user) ? camera.user[0] : camera.user;
              
              return (
                <div
                  key={camera.id}
                  className={`p-4 rounded-lg border-2 ${
                    camera.is_stream_active === true
                      ? "bg-green-50 border-green-200"
                      : camera.is_stream_active === false
                      ? "bg-red-50 border-red-200"
                      : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="font-medium">{camera.name}</h5>
                      <p className="text-sm text-gray-600">
                        לקוח: {user?.full_name || "לא ידוע"} ({user?.email || "לא ידוע"})
                      </p>
                      <p className="text-xs text-gray-500">
                        נוצר: {new Date(camera.created_at).toLocaleDateString("he-IL")}
                      </p>
                      <p className="text-xs text-gray-500">
                        נראה לאחרונה: {camera.last_seen_at 
                          ? new Date(camera.last_seen_at).toLocaleString("he-IL")
                          : "אף פעם"
                        }
                      </p>
                    </div>
                    
                    <div className="text-left space-y-2">
                      <div>
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                          camera.is_stream_active === true
                            ? "bg-green-100 text-green-700"
                            : camera.is_stream_active === false
                            ? "bg-red-100 text-red-700"
                            : "bg-gray-100 text-gray-700"
                        }`}>
                          {camera.is_stream_active === true
                            ? "🟢 פעיל"
                            : camera.is_stream_active === false
                            ? "🔴 לא פעיל"
                            : "❓ לא ידוע"
                          }
                        </span>
                      </div>
                      
                      <button
                        onClick={() => deleteCamera(camera.id, camera.name)}
                        className="text-red-600 hover:text-red-800 text-xs bg-white px-2 py-1 rounded border hover:bg-red-50"
                      >
                        🗑️ מחק
                      </button>
                    </div>
                  </div>
                  
                  <div className="mt-3 text-xs text-gray-600">
                    <p><strong>ID:</strong> {camera.id}</p>
                    <p><strong>RTSP Path:</strong> {camera.stream_path}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from "react";
import SurveillanceCameraView from "@/components/SurveillanceCameraView";
import FootageView from "@/components/FootageView";
import { Eye, Calendar, Settings, AlertTriangle, Video, Monitor } from "lucide-react";

export default function DashboardPage() {
  const [cameras, setCameras] = useState<any[]>([]);
  const [tunnelName, setTunnelName] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isMounted, setIsMounted] = useState(false);
  const [viewMode, setViewMode] = useState<'live' | 'recordings'>('live');

  useEffect(() => {
    async function loadCameras() {
      try {
        const res = await fetch("/api/user-cameras");
        
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const result = await res.json();

        if (result.success) {
          setCameras(result.cameras);
          setTunnelName(result.tunnel_name);
        } else {
          console.error("API Error:", result.error);
        }
      } catch (error) {
        console.error("Fetch Error:", error);
        if (error instanceof Error) {
          console.error("Error details:", {
            message: error.message,
            stack: error.stack
          });
        }
      }
    }

    loadCameras();
  }, []);

  // Set mounted state on client side
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleString('he-IL', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Determine grid layout based on camera count
  const getGridLayout = (cameraCount: number) => {
    if (cameraCount === 1) return "grid-cols-1";
    if (cameraCount === 2) return "grid-cols-1 lg:grid-cols-2";
    if (cameraCount === 3) return "grid-cols-1 lg:grid-cols-2 xl:grid-cols-3";
    return "grid-cols-1 lg:grid-cols-2";
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header Bar */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 rtl:space-x-reverse">
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <Eye className="w-6 h-6 text-blue-400" />
              <h1 className="text-xl font-bold text-white">Clearpoint Security</h1>
            </div>
            
            {/* Mode Switcher */}
            <div className="flex items-center bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setViewMode('live')}
                className={`flex items-center space-x-2 rtl:space-x-reverse px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'live'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:text-white hover:bg-gray-600'
                }`}
              >
                <Monitor className="w-4 h-4" />
                <span>צפייה חיה</span>
              </button>
              <button
                onClick={() => setViewMode('recordings')}
                className={`flex items-center space-x-2 rtl:space-x-reverse px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'recordings'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:text-white hover:bg-gray-600'
                }`}
              >
                <Video className="w-4 h-4" />
                <span>הקלטות</span>
              </button>
            </div>
            
            <div className="hidden md:flex items-center space-x-4 rtl:space-x-reverse text-sm text-gray-300">
              <div className="flex items-center space-x-1 rtl:space-x-reverse">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span>מחובר</span>
              </div>
              <div className="flex items-center space-x-1 rtl:space-x-reverse">
                <Calendar className="w-4 h-4" />
                <span>{isMounted ? formatTime(currentTime) : '--:--:--'}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <div className="text-sm text-gray-300">
              <span className="font-medium">{cameras.length}</span> מצלמות פעילות
            </div>
            <button className="p-2 hover:bg-gray-700 rounded-lg transition-colors">
              <Settings className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        {viewMode === 'live' ? (
          // Live View Mode
          cameras.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-96">
              <AlertTriangle className="w-16 h-16 text-yellow-500 mb-4" />
              <p className="text-xl text-gray-400 mb-2">לא נמצאו מצלמות</p>
              <p className="text-gray-500">לא קיימות מצלמות פעילות בחשבון זה</p>
            </div>
          ) : (
            <div className={`grid ${getGridLayout(cameras.length)} gap-4`}>
              {cameras.slice(0, 4).map((camera, index) => (
                <SurveillanceCameraView 
                  key={camera.id} 
                  camera={camera} 
                  tunnelName={tunnelName!}
                  cameraNumber={index + 1}
                />
              ))}
            </div>
          )
        ) : (
          // Recordings View Mode
          <FootageView cameras={cameras} />
        )}
      </div>
    </div>
  );
}

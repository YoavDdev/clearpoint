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

  // Responsive grid layout optimized for 4 cameras
  const getGridLayout = (cameraCount: number) => {
    if (cameraCount === 1) return "grid-cols-1";
    if (cameraCount === 2) return "grid-cols-1 sm:grid-cols-2";
    if (cameraCount === 3) return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
    // Optimized for 4 cameras: 1 col on mobile, 2 cols on tablet, 2x2 on desktop
    return "grid-cols-1 sm:grid-cols-2";
  };

  // Get responsive gap and padding
  const getResponsiveSpacing = () => {
    return "gap-3 sm:gap-4 lg:gap-6";
  };

  // Get responsive container padding
  const getContainerPadding = () => {
    return "p-3 sm:p-4 lg:p-6";
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Responsive Header Bar */}
      <div className="bg-gray-800 border-b border-gray-700 px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between flex-wrap gap-2 sm:gap-0">
          <div className="flex items-center space-x-2 sm:space-x-4 rtl:space-x-reverse">
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <Eye className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />
              <h1 className="text-lg sm:text-xl font-bold text-white">Clearpoint Security</h1>
            </div>
            
            {/* Responsive Mode Switcher */}
            <div className="flex items-center bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setViewMode('live')}
                className={`flex items-center space-x-1 sm:space-x-2 rtl:space-x-reverse px-2 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                  viewMode === 'live'
                    ? 'bg-red-600 text-white'
                    : 'text-gray-300 hover:text-white hover:bg-gray-600'
                }`}
              >
                <Monitor className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">צפייה חיה</span>
                <span className="sm:hidden">חי</span>
              </button>
              <button
                onClick={() => setViewMode('recordings')}
                className={`flex items-center space-x-1 sm:space-x-2 rtl:space-x-reverse px-2 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                  viewMode === 'recordings'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:text-white hover:bg-gray-600'
                }`}
              >
                <Video className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">הקלטות</span>
                <span className="sm:hidden">הקלטות</span>
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

      {/* Responsive Main Content */}
      <div className={getContainerPadding()}>
        {viewMode === 'live' ? (
          // Live View Mode
          cameras.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 sm:h-80 lg:h-96">
              <AlertTriangle className="w-12 h-12 sm:w-16 sm:h-16 text-yellow-500 mb-4" />
              <p className="text-lg sm:text-xl text-gray-400 mb-2 text-center">לא נמצאו מצלמות</p>
              <p className="text-sm sm:text-base text-gray-500 text-center">לא קיימות מצלמות פעילות בחשבון זה</p>
            </div>
          ) : (
            <div className={`grid ${getGridLayout(cameras.length)} ${getResponsiveSpacing()}`}>
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

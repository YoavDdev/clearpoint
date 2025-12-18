'use client';

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import SurveillanceCameraView from "@/components/SurveillanceCameraView";
import FootageView from "@/components/FootageView";
import { AlertTriangle, Video, Monitor, Maximize, Clock, Minimize, Eye, Calendar, Settings, Lock, CreditCard } from "lucide-react";

export const dynamic = 'force-dynamic';

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const modeParam = searchParams.get('mode');
  
  const [cameras, setCameras] = useState<any[]>([]);
  const [tunnelName, setTunnelName] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isMounted, setIsMounted] = useState(false);
  const [viewMode, setViewMode] = useState<'live' | 'recordings'>(
    modeParam === 'recordings' ? 'recordings' : 'live'
  );
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>('active');
  const [connectionType, setConnectionType] = useState<string | null>(null);

  // Update view mode when URL parameter changes
  useEffect(() => {
    setViewMode(modeParam === 'recordings' ? 'recordings' : 'live');
  }, [modeParam]);

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
          setSubscriptionStatus(result.subscription_status || 'inactive');
          setConnectionType(result.connection_type);
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

  // Listen for fullscreen changes (ESC key, browser controls)
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setIsFullscreen(false);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
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

  // Toggle fullscreen mode using browser Fullscreen API
  const toggleFullscreen = async () => {
    if (!isFullscreen) {
      // Enter fullscreen
      try {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } catch (error) {
        console.error('Error entering fullscreen:', error);
        // Fallback to overlay mode if fullscreen API fails
        setIsFullscreen(true);
      }
    } else {
      // Exit fullscreen
      try {
        if (document.fullscreenElement) {
          await document.exitFullscreen();
        }
        setIsFullscreen(false);
      } catch (error) {
        console.error('Error exiting fullscreen:', error);
        setIsFullscreen(false);
      }
    }
  };

  // Fullscreen grid layout - always 2x2 for up to 4 cameras
  const getFullscreenGridLayout = (cameraCount: number) => {
    if (cameraCount === 1) return "grid-cols-1";
    return "grid-cols-2"; // Always 2x2 for 2-4 cameras in fullscreen
  };

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50">
      {/* Simple, Clean Header - Mobile Responsive */}
      <div className="bg-white border-b border-slate-200 px-3 sm:px-6 py-4 sm:py-6">
        <div className="max-w-7xl mx-auto">
          {/* Welcome Section */}
          <div className="mb-4 sm:mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1 sm:mb-2">שלום! 👋</h1>
            <p className="text-base sm:text-lg text-slate-600">ברוכים הבאים למערכת האבטחה שלכם</p>
          </div>

          {/* Status Cards - Stack on Mobile */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {/* Current Time - Mobile Responsive */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-3 sm:p-4 border border-purple-100">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-slate-600">השעה כעת</p>
                  <p className="text-lg sm:text-xl font-bold text-slate-900">
                    {isMounted ? new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                  </p>
                </div>
              </div>
            </div>

            {/* Status - Mobile Responsive */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-3 sm:p-4 border border-green-100">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-slate-600">סטטוס</p>
                  <p className="text-lg sm:text-xl font-bold text-green-600">מחובר ופעיל</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Subscription Warning Banner */}
      {subscriptionStatus !== 'active' && (
        <div className="bg-gradient-to-l from-orange-600 to-red-600 px-3 sm:px-6 py-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3 text-white">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Lock className="w-5 h-5" />
                </div>
                <div className="text-center sm:text-right">
                  <p className="font-bold text-base sm:text-lg">המנוי שלך לא פעיל</p>
                  <p className="text-sm opacity-90">
                    {connectionType === 'sim' 
                      ? 'המערכת אינה זמינה ללא מנוי פעיל (כולל אינטרנט SIM). חדש מנוי לחזרה לשירות מלא.'
                      : 'ניתן לצפות בשידור חי בלבד. חדש את המנוי כדי לגשת להקלטות.'}
                  </p>
                </div>
              </div>
              <a
                href="/dashboard/subscription"
                className="flex items-center gap-2 px-6 py-3 bg-white text-orange-600 rounded-xl font-bold hover:bg-orange-50 transition-all shadow-lg whitespace-nowrap"
              >
                <CreditCard className="w-5 h-5" />
                <span>חדש מנוי</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Large, Clear Mode Switcher - Mobile Responsive */}
      <div className="bg-white border-b border-slate-200 px-3 sm:px-6 py-3 sm:py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
            <button
              onClick={() => router.push('/dashboard')}
              className={`flex-1 flex items-center justify-center gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4 rounded-xl font-bold text-base sm:text-lg transition-all ${
                viewMode === 'live'
                  ? 'bg-gradient-to-l from-red-600 to-pink-600 text-white shadow-lg sm:scale-105'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Monitor className="w-5 h-5 sm:w-6 sm:h-6" />
              <div className="flex flex-col sm:flex-row items-center gap-0 sm:gap-2">
                <span>צפייה חיה</span>
                <span className="text-xs sm:text-sm opacity-75 hidden sm:inline">ראה מה קורה עכשיו</span>
              </div>
            </button>
            <button
              onClick={() => {
                if (subscriptionStatus === 'active') {
                  router.push('/dashboard?mode=recordings');
                }
              }}
              disabled={subscriptionStatus !== 'active'}
              className={`flex-1 flex items-center justify-center gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4 rounded-xl font-bold text-base sm:text-lg transition-all ${
                subscriptionStatus !== 'active'
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                  : viewMode === 'recordings'
                  ? 'bg-gradient-to-l from-blue-600 to-cyan-600 text-white shadow-lg sm:scale-105'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {subscriptionStatus !== 'active' && <Lock className="w-4 h-4 sm:w-5 sm:h-5" />}
              <Video className="w-5 h-5 sm:w-6 sm:h-6" />
              <div className="flex flex-col sm:flex-row items-center gap-0 sm:gap-2">
                <span>הקלטות</span>
                <span className="text-xs sm:text-sm opacity-75 hidden sm:inline">
                  {subscriptionStatus !== 'active' ? 'דורש מנוי פעיל' : 'צפה בהקלטות קודמות'}
                </span>
              </div>
            </button>
            {viewMode === 'live' && cameras.length > 0 && (
              <button 
                onClick={toggleFullscreen}
                className="px-4 sm:px-6 py-3 sm:py-4 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-900 transition-all flex items-center justify-center gap-2 sm:w-auto w-full"
              >
                <Maximize className="w-5 h-5" />
                <span className="sm:hidden">מסך מלא</span>
                <span className="hidden sm:inline">מסך מלא</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Fullscreen Mode */}
      {isFullscreen && viewMode === 'live' && cameras.length > 0 ? (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
          {/* Fullscreen Grid - Perfect 2x2 for up to 4 cameras */}
          <div className={`grid ${getFullscreenGridLayout(cameras.length)} gap-2 w-full h-full p-2`}>
            {cameras.slice(0, 4).map((camera, index) => (
              <div key={camera.id} className="w-full h-full">
                <SurveillanceCameraView 
                  camera={camera} 
                  tunnelName={tunnelName!}
                  cameraNumber={index + 1}
                  isFullscreen={true}
                />
              </div>
            ))}
          </div>
          
          {/* Fullscreen Exit Button */}
          <button
            onClick={toggleFullscreen}
            className="absolute top-4 right-4 z-60 flex items-center space-x-2 rtl:space-x-reverse px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors text-white font-medium"
          >
            <Minimize className="w-4 h-4" />
            <span>יציאה ממסך מלא</span>
          </button>
        </div>
      ) : (
        /* Normal Dashboard Mode */
        <div className="p-3 sm:p-4 lg:p-6">
          <div className="max-w-7xl mx-auto">
            {viewMode === 'live' ? (
              // Live View Mode
              // Check if SIM plan without active subscription (no internet = no access)
              subscriptionStatus !== 'active' && connectionType === 'sim' ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mb-6">
                    <Lock className="w-12 h-12 text-red-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">השירות אינו זמין</h2>
                  <p className="text-lg text-slate-600 text-center max-w-md mb-2">
                    מכיוון שהמנוי שלך כולל אינטרנט SIM, ללא מנוי פעיל אין חיבור לאינטרנט ולכן המערכת אינה זמינה.
                  </p>
                  <p className="text-base text-slate-500 text-center max-w-md">
                    חדש את המנוי כדי להמשיך להשתמש במערכת.
                  </p>
                  <a 
                    href="/dashboard/subscription"
                    className="mt-6 px-6 py-3 bg-gradient-to-l from-orange-600 to-red-600 text-white rounded-xl font-bold hover:scale-105 transition-all shadow-lg"
                  >
                    חדש מנוי עכשיו
                  </a>
                </div>
              ) : cameras.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="w-24 h-24 bg-yellow-100 rounded-full flex items-center justify-center mb-6">
                    <AlertTriangle className="w-12 h-12 text-yellow-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">אין מצלמות פעילות</h2>
                  <p className="text-lg text-slate-600 text-center max-w-md">
                    לא מצאנו מצלמות פעילות בחשבון שלך. אנא צור קשר עם התמיכה לעזרה.
                  </p>
                  <a 
                    href="/dashboard/support"
                    className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
                  >
                    פנה לתמיכה
                  </a>
                </div>
              ) : (
                <div className={`grid ${getGridLayout(cameras.length)} gap-3 sm:gap-4 lg:gap-6`}>
                  {cameras.slice(0, 4).map((camera, index) => (
                    <div key={camera.id} className="bg-white rounded-xl shadow-lg overflow-hidden border border-slate-200 hover:shadow-xl transition-shadow">
                      <SurveillanceCameraView 
                        camera={camera} 
                        tunnelName={tunnelName!}
                        cameraNumber={index + 1}
                      />
                    </div>
                  ))}
                </div>
              )
            ) : (
              // Recordings View Mode
              <FootageView cameras={cameras} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>}>
      <DashboardContent />
    </Suspense>
  );
}

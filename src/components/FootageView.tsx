'use client';

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import SimpleDateTabs from './SimpleDateTabs';
import SimpleCameraPlayer from './SimpleCameraPlayer';
import { Loader2, Camera, VideoOff } from 'lucide-react';

interface VodClip {
  id: string;
  timestamp: string;
  duration: number;
  url: string;
  thumbnail_url?: string;
}

interface FootageViewProps {
  cameras: { id: string; name: string }[];
}

export default function FootageView({ cameras }: FootageViewProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedCameraId, setSelectedCameraId] = useState<string>(cameras[0]?.id || '');
  const [allCameraClips, setAllCameraClips] = useState<{[cameraId: string]: VodClip[]}>({});
  const [retentionDays, setRetentionDays] = useState<number>(14);
  const [loading, setLoading] = useState(true);
  const [hasSubscription, setHasSubscription] = useState<boolean>(true);
  const [checkingSubscription, setCheckingSubscription] = useState(true);

  // Check subscription status (initial + polling every 6 hours)
  useEffect(() => {
    async function checkSubscription() {
      try {
        const res = await fetch('/api/user-cameras');
        const result = await res.json();
        if (result.success) {
          const isActive = result.subscription_status === 'active';
          setHasSubscription(isActive);
          
          // If subscription became inactive, redirect
          if (!isActive && !checkingSubscription) {
            console.warn('⚠️ Subscription no longer active - redirecting');
            window.location.href = '/dashboard/no-subscription';
          }
          
          if (result.plan_duration_days) {
            setRetentionDays(result.plan_duration_days);
          }
        }
      } catch (error) {
        console.error('Error checking subscription:', error);
      } finally {
        setCheckingSubscription(false);
      }
    }
    
    // Initial check
    checkSubscription();
    
    // Poll every 6 hours (even if page stays open)
    const interval = setInterval(() => {
      console.log('🔄 Periodic subscription check (6h polling)');
      checkSubscription();
    }, 6 * 60 * 60 * 1000); // 6 hours
    
    return () => clearInterval(interval);
  }, [checkingSubscription]);

  // Load recordings for selected date
  useEffect(() => {
    loadRecordingsForDate(selectedDate);
  }, [selectedDate, cameras]);

  const loadRecordingsForDate = async (date: Date) => {
    setLoading(true);
    const dateStr = format(date, 'yyyy-MM-dd');
    const allClips: {[cameraId: string]: VodClip[]} = {};

    try {
      for (const camera of cameras) {
        const res = await fetch('/api/user-footage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cameraId: camera.id, date: dateStr }),
        });

        const data = await res.json();
        
        // Sort clips by timestamp
        const sortedClips = (data || []).sort((a: VodClip, b: VodClip) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        
        allClips[camera.id] = sortedClips;
      }

      setAllCameraClips(allClips);
    } catch (error) {
      console.error('Error loading recordings:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedCamera = cameras.find(c => c.id === selectedCameraId);
  const currentClips = allCameraClips[selectedCameraId] || [];

  // Show message if no subscription
  if (!checkingSubscription && !hasSubscription) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6 flex items-center justify-center" dir="rtl">
        <div className="max-w-2xl w-full">
          <div className="bg-white rounded-2xl shadow-xl border border-blue-200 p-12 text-center">
            <div className="text-8xl mb-6">🔒</div>
            
            <h1 className="text-3xl font-bold text-slate-900 mb-4">
              נדרש מנוי פעיל
            </h1>
            
            <p className="text-lg text-slate-600 mb-8">
              כדי לצפות בהקלטות, נדרש מנוי פעיל למערכת Clearpoint Security.
              <br />
              צפייה חיה במצלמות זמינה גם ללא מנוי.
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8 text-right">
              <h3 className="font-bold text-blue-900 mb-3 text-lg">💡 מה כולל המנוי?</h3>
              <ul className="space-y-2 text-sm text-blue-800">
                <li className="flex items-start gap-2">
                  <span>✅</span>
                  <span>גישה להקלטות עד 14 ימים אחורה</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>✅</span>
                  <span>יכולת לגזור ולהוריד קטעי וידאו</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>✅</span>
                  <span>צפייה חיה ללא הגבלה</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>✅</span>
                  <span>תמיכה טכנית מלאה</span>
                </li>
              </ul>
            </div>

            <div className="space-y-4">
              <a
                href="mailto:support@clearpoint.co.il"
                className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-l from-blue-600 to-cyan-600 text-white rounded-xl font-bold text-lg hover:scale-105 transition-all shadow-lg"
              >
                📧 צור קשר לרכישת מנוי
              </a>
              
              <div>
                <a
                  href="/dashboard"
                  className="text-slate-600 hover:text-slate-900 font-medium text-sm"
                >
                  ← חזור לצפייה חיה
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (cameras.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <VideoOff className="w-16 h-16 text-slate-600 mb-4" />
        <h2 className="text-2xl font-bold text-slate-300 mb-2">אין מצלמות זמינות</h2>
        <p className="text-slate-500">לא נמצאו מצלמות בחשבון שלך</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-3 sm:p-4 lg:p-6" dir="rtl">
      {/* Super Clean Header - Mobile Responsive */}
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 lg:p-8 mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-800 mb-1 sm:mb-2">📹 הקלטות</h1>
          <p className="text-base sm:text-lg lg:text-xl text-slate-600">בחר תאריך ומצלמה לצפייה</p>
        </div>

        <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
          {/* Date Selection - Mobile Responsive */}
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-800 mb-3 sm:mb-4">1️⃣ בחר תאריך</h2>
            <SimpleDateTabs
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
              retentionDays={retentionDays}
            />
          </div>

          {/* Camera Selection - Mobile Responsive */}
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-800 mb-3 sm:mb-4">2️⃣ בחר מצלמה</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {cameras.map((camera) => (
                  <button
                    key={camera.id}
                    onClick={() => setSelectedCameraId(camera.id)}
                    className={`
                      p-4 sm:p-6 rounded-lg sm:rounded-xl font-bold text-lg sm:text-xl transition-all transform
                      ${selectedCameraId === camera.id
                        ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-2xl scale-105'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:scale-105'
                      }
                    `}
                  >
                    <Camera className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 sm:mb-3" />
                    <div>{camera.name}</div>
                  </button>
              ))}
            </div>
          </div>


      {/* Loading State - Mobile Responsive */}
      {loading && (
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-8 sm:p-12 text-center border-2 border-blue-200">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
            <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 text-blue-600 animate-spin" />
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-slate-800 mb-2">
            טוען הקלטות...
          </h3>
          <p className="text-sm sm:text-base text-slate-600">
            מחפש הקלטות עבור התאריך שנבחר
          </p>
        </div>
      )}

          {/* Video Player - Mobile Responsive */}
          {!loading && selectedCamera && (
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-800 mb-3 sm:mb-4">3️⃣ צפייה</h2>
              <SimpleCameraPlayer
                cameraName={selectedCamera.name}
                clips={currentClips}
                onCutClip={() => {}} // Enable cutting button
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

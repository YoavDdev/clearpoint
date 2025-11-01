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

  // Load retention days from user plan
  useEffect(() => {
    async function loadPlanInfo() {
      try {
        const res = await fetch('/api/user-cameras');
        const result = await res.json();
        if (result.success && result.plan_duration_days) {
          setRetentionDays(result.plan_duration_days);
        }
      } catch (error) {
        console.error('Error loading plan info:', error);
      }
    }
    loadPlanInfo();
  }, []);

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6" dir="rtl">
      {/* Super Clean Header */}
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
          <h1 className="text-4xl font-bold text-slate-800 mb-2">📹 הקלטות</h1>
          <p className="text-xl text-slate-600">בחר תאריך ומצלמה לצפייה</p>
        </div>

        <div className="max-w-7xl mx-auto space-y-6">
          {/* Date Selection */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-slate-800 mb-4">1️⃣ בחר תאריך</h2>
            <SimpleDateTabs
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
              retentionDays={retentionDays}
            />
          </div>

          {/* Camera Selection */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-slate-800 mb-4">2️⃣ בחר מצלמה</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {cameras.map((camera) => (
                  <button
                    key={camera.id}
                    onClick={() => setSelectedCameraId(camera.id)}
                    className={`
                      p-6 rounded-xl font-bold text-xl transition-all transform
                      ${selectedCameraId === camera.id
                        ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-2xl scale-105'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:scale-105'
                      }
                    `}
                  >
                    <Camera className="w-8 h-8 mx-auto mb-3" />
                    <div>{camera.name}</div>
                  </button>
              ))}
            </div>
          </div>


      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-12 bg-slate-800 rounded-lg border border-slate-700">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin mb-3" />
          <p className="text-slate-300">טוען הקלטות...</p>
        </div>
      )}

          {/* Video Player */}
          {!loading && selectedCamera && currentClips.length > 0 && (
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-slate-800 mb-4">3️⃣ צפייה</h2>
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

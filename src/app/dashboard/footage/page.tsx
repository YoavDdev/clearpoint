'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { format, parseISO, isBefore } from 'date-fns';
import { he } from 'date-fns/locale';
import FootageTimelinePlayer from '@/components/FootageTimelinePlayer';
import {
  Loader2,
  Camera,
  Video,
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type VodClip = {
  url: string;
  timestamp: string;
  camera_id: string;
};

export default function FootagePage() {
  const [clips, setClips] = useState<VodClip[]>([]);
  const [cameras, setCameras] = useState<{ id: string; name: string }[]>([]);
  const [selectedCamera, setSelectedCamera] = useState('');
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [retentionDays, setRetentionDays] = useState<number>(14);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [cameraDropdownOpen, setCameraDropdownOpen] = useState(false);
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);

  useEffect(() => {
    const fetchCamerasAndPlan = async () => {
      const res = await fetch('/api/user-cameras');
      const result = await res.json();

      if (result.success) {
        const filtered = result.cameras.filter((c: any) => c.id);
        setCameras(filtered);

        if (filtered.length > 0) {
          setSelectedCamera(filtered[0].id);
          fetchAvailableDates(filtered[0].id);
        }

        if (result.plan_duration_days) {
          setRetentionDays(result.plan_duration_days);
        }
      } else {
        console.error('Error loading cameras:', result.error);
      }
    };

    fetchCamerasAndPlan();
  }, []);

  const fetchAvailableDates = async (cameraId: string) => {
    const res = await fetch(`/api/user-footage-dates?cameraId=${cameraId}`);
    const result = await res.json();

    if (result.success) {
      setAvailableDates(result.dates);
    }
  };

  const fetchClips = async (cameraId: string, date: string) => {
    setLoading(true);
    setSearched(true);
    setSelectedCamera(cameraId);
    setSelectedDate(date);

    const res = await fetch('/api/user-footage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cameraId, date }),
    });

    const data = await res.json();
    const now = Date.now();
    const filtered = data.filter((clip: VodClip) => {
      const clipDate = new Date(clip.timestamp).getTime();
      const ageInDays = (now - clipDate) / 86400000;
      return ageInDays <= retentionDays;
    });

    const sorted = filtered.sort(
      (a: VodClip, b: VodClip) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    setClips(sorted);
    setLoading(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-32">
      <div className="mb-8 text-right">
        <h1 className="text-3xl font-bold text-gray-900">ניהול צילומים</h1>
        <p className="mt-2 text-sm text-gray-600">
          צפה ונתח את צילומי האבטחה שלך. זמין עד {retentionDays} ימים אחורה.
        </p>
      </div>

      {/* Camera selection */}
      <div className="mb-4">
        <button
          onClick={() => setCameraDropdownOpen(!cameraDropdownOpen)}
          className="flex items-center justify-between w-full p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-400"
        >
          <div className="flex items-center space-x-2">
            <Camera className="w-5 h-5 text-blue-500" />
            <span className="font-medium text-gray-700">
              {selectedCamera
                ? cameras.find((c) => c.id === selectedCamera)?.name || 'נבחרה מצלמה'
                : 'בחר מצלמה'}
            </span>
          </div>
          {cameraDropdownOpen ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>

        {cameraDropdownOpen && (
          <div className="mt-1 p-3 bg-white rounded-lg border border-gray-200 shadow-lg">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {cameras.map((cam) => (
                <button
                  key={cam.id}
                  onClick={() => {
                    setSelectedCamera(cam.id);
                    fetchAvailableDates(cam.id);
                    setClips([]);
                    setSelectedDate('');
                    setDateDropdownOpen(true);
                  }}
                  className={`p-3 rounded-lg text-right ${
                    selectedCamera === cam.id
                      ? 'bg-blue-50 border border-blue-200'
                      : 'hover:bg-gray-50 border border-transparent hover:border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div
                      className={`p-1.5 rounded-md ${
                        selectedCamera === cam.id
                          ? 'bg-blue-100 text-blue-600'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      <Camera className="w-4 h-4" />
                    </div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
                      פעילה
                    </span>
                  </div>
                  <h3 className="mt-2 font-medium text-gray-900">{cam.name}</h3>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Date selection */}
      {selectedCamera && (
        <div className="mb-4">
          <button
            onClick={() => setDateDropdownOpen(!dateDropdownOpen)}
            className="flex items-center justify-between w-full p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-400"
          >
            <div className="flex items-center space-x-2">
              <CalendarIcon className="w-5 h-5 text-blue-500" />
              <span className="font-medium text-gray-700">
                {selectedDate
                  ? new Date(selectedDate).toLocaleDateString('he-IL', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })
                  : 'בחר תאריך'}
              </span>
            </div>
            {dateDropdownOpen ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>

          {dateDropdownOpen && (
            <div className="mt-1 p-4 bg-white rounded-lg border border-gray-200 shadow-lg text-right w-full">
              <Calendar
                className="w-full border-0"
                locale="he-IL"
                calendarType="hebrew"
                value={selectedDate ? new Date(selectedDate) : null}
                onClickDay={(date) => {
                  const dayStr = format(date, 'yyyy-MM-dd');
                  if (availableDates.includes(dayStr)) {
                    setSelectedDate(dayStr);
                    fetchClips(selectedCamera, dayStr);
                    setDateDropdownOpen(false);
                    setCameraDropdownOpen(false); // Close camera section when date is selected
                  }
                }}
                tileDisabled={({ date }) => {
                  const dateStr = format(date, 'yyyy-MM-dd');
                  const retentionLimit = new Date(Date.now() - retentionDays * 86400000);
                  return isBefore(date, retentionLimit) || !availableDates.includes(dateStr);
                }}
                minDetail="month"
                next2Label={null}
                prev2Label={null}
                showNeighboringMonth={false}
                tileClassName={({ date }) => {
                  const dateStr = format(date, 'yyyy-MM-dd');
                  return availableDates.includes(dateStr)
                    ? 'react-calendar__tile--available'
                    : '';
                }}
              />

              <div className="flex justify-between items-center pt-2 border-t border-gray-100 mt-2">
                <button
                  onClick={() => {
                    const today = format(new Date(), 'yyyy-MM-dd');
                    if (availableDates.includes(today)) {
                      setSelectedDate(today);
                      fetchClips(selectedCamera, today);
                      setDateDropdownOpen(false);
                    }
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  קפוץ להיום
                </button>
                <span className="text-xs text-gray-500">
                  זמין עד {retentionDays} ימים אחורה
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Player */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-medium text-gray-900">
            {selectedDate
              ? `צפייה בצילומים - ${new Date(selectedDate).toLocaleDateString('he-IL', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}`
              : 'בחרו מצלמה ותאריך'}
          </h2>
          {selectedCamera && selectedDate && (
            <p className="text-sm text-gray-500 mt-1">
              מצלמה: {cameras.find((c) => c.id === selectedCamera)?.name || 'לא ידוע'}
            </p>
          )}
        </div>

        <div className="p-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-2" />
              <p className="text-gray-600">טוען קטעי וידאו...</p>
            </div>
          ) : clips.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">ציר זמן</h3>
                <span className="text-sm text-gray-500">{clips.length} קטעים</span>
              </div>
              <FootageTimelinePlayer clips={clips} />
            </div>
          ) : selectedDate ? (
            <div className="text-center py-12">
              <Video className="mx-auto h-10 w-10 text-gray-400 mb-3" />
              <h3 className="text-gray-900 font-medium">אין קטעי וידאו זמינים</h3>
              <p className="text-gray-500 text-sm mt-1 mb-4">
                לא נמצאו הקלטות בתאריך הנבחר
              </p>
              <button
                onClick={() => setDateDropdownOpen(true)}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                בחר תאריך אחר
              </button>
            </div>
          ) : (
            <div className="text-center py-12">
              <Video className="mx-auto h-10 w-10 text-gray-400 mb-3" />
              <p className="text-gray-900">בחרו מצלמה ותאריך</p>
              <p className="text-gray-500 text-sm mt-1">כדי לצפות בצילומים</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

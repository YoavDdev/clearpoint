'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { format, parseISO, isBefore } from 'date-fns';
import { he } from 'date-fns/locale';
import FootageTimelinePlayer from '@/components/FootageTimelinePlayer';
import { Loader2 } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';

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
    if (result.success) setAvailableDates(result.dates);
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
      (a: VodClip, b: VodClip) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    setClips(sorted);
    setLoading(false);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto pt-32 text-right">
      <h1 className="text-3xl font-semibold mb-3">📹 צפייה בצילומים</h1>
      <p className="text-sm text-gray-500 mb-8">בחר מצלמה ויום בלוח השנה לצפייה בקטעים. ניתן לצפות עד {retentionDays} ימים אחורה.</p>

      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 mb-10">
        {cameras.map((cam) => (
          <button
            key={cam.id}
            onClick={() => {
              setSelectedCamera(cam.id);
              fetchAvailableDates(cam.id);
              setClips([]);
              setSelectedDate('');
            }}
            className={`rounded-xl shadow-sm border px-4 py-3 text-right hover:border-blue-600 transition ${
              selectedCamera === cam.id ? 'border-blue-600 bg-blue-50' : 'bg-white'
            }`}
          >
            <div className="flex justify-between items-center">
              <h2 className="font-semibold text-lg">{cam.name}</h2>
              <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">פעילה</span>
            </div>
          </button>
        ))}
      </div>

      {selectedCamera && (
        <div className="mb-10">
          <div className="bg-white rounded-xl border shadow-sm p-4">
            <h2 className="font-medium text-lg mb-3">📅 בחר תאריך</h2>
            <DayPicker
              mode="single"
              selected={selectedDate ? parseISO(selectedDate) : undefined}
              onDayClick={(day) => {
                const dayStr = format(day, 'yyyy-MM-dd');
                if (availableDates.includes(dayStr)) {
                  fetchClips(selectedCamera, dayStr);
                }
              }}
              modifiers={{
                available: availableDates.map((d) => parseISO(d)),
              }}
              modifiersClassNames={{
                available: 'bg-green-100 text-green-900',
              }}
              disabled={(date) => {
                const now = new Date();
                const retentionDate = new Date(now.getTime() - retentionDays * 86400000);
                return !availableDates.includes(format(date, 'yyyy-MM-dd')) || isBefore(date, retentionDate);
              }}
              weekStartsOn={0}
              locale={he}
            />
          </div>
        </div>
      )}

      {searched && clips.length === 0 && !loading && (
        <p className="text-center text-gray-500">לא נמצאו קטעים לתאריך זה או שהם חורגים מחלון השימור שלך.</p>
      )}

      {clips.length > 0 && !loading && (
        <div className="rounded-xl border p-4 shadow-sm bg-white">
          <h2 className="text-xl font-medium mb-4">🎬 תצוגת צילום מתאריך: {selectedDate}</h2>
          <FootageTimelinePlayer clips={clips} />
        </div>
      )}

      {loading && (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="animate-spin h-6 w-6 text-blue-600" />
        </div>
      )}
    </div>
  );
}
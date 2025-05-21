'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { format } from 'date-fns';
import FootageTimelinePlayer from '@/components/FootageTimelinePlayer';

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
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    const fetchCameras = async () => {
      const res = await fetch('/api/user-cameras');
      const result = await res.json();

      if (result.success) {
        const filtered = result.cameras.filter((c: any) => c.id);
        setCameras(filtered);
        if (filtered.length > 0) setSelectedCamera(filtered[0].id);
      } else {
        console.error('Error loading cameras:', result.error);
      }
    };

    fetchCameras();
  }, []);

  const fetchClips = async () => {
    if (!selectedCamera || !selectedDate) return;

    const res = await fetch('/api/user-footage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cameraId: selectedCamera, date: selectedDate }),
    });

    const data = await res.json();
    const sorted = data.sort((a: VodClip, b: VodClip) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    setClips(sorted);
  };

  return (
    <div className="p-4 max-w-5xl mx-auto pt-32">
      <h1 className="text-2xl font-semibold mb-4">צפייה בצילומים</h1>

      <div className="flex flex-wrap gap-4 mb-6 items-center">
        <select
          value={selectedCamera}
          onChange={(e) => setSelectedCamera(e.target.value)}
          className="border p-2 rounded"
        >
          {cameras.map((cam) => (
            <option key={cam.id} value={cam.id}>
              {cam.name}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="border p-2 rounded"
        />

        <button
          onClick={fetchClips}
          className="bg-blue-600 text-white px-4 py-2 rounded shadow"
        >
          חפש קטעים
        </button>
      </div>

      {clips.length === 0 ? (
        <p>לא נמצאו קטעים ליום זה.</p>
      ) : (
        <FootageTimelinePlayer clips={clips} />
      )}
    </div>
  );
}

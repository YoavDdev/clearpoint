"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { createClient } from "@supabase/supabase-js";
import ReactPlayer from "react-player";

interface Camera {
  id: string;
  name: string;
}

interface VODFile {
  id: string;
  file_url: string;
  date: string;
  start_time: string;
  duration_minutes: number;
  camera_id: string;
  cameras: {
    name: string;
  };
}

export default function FootagePage() {
  const { data: session } = useSession();
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [vodFiles, setVodFiles] = useState<VODFile[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [startTime, setStartTime] = useState<string>("00:00");
  const [endTime, setEndTime] = useState<string>("23:59");
  const [message, setMessage] = useState("");

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: { Authorization: `Bearer ${session?.user?.access_token}` },
      },
    }
  );

  useEffect(() => {
    if (!session?.user) return;
    const fetchCameras = async () => {
      const { data } = await supabase
        .from("cameras")
        .select("id, name")
        .eq("user_email", session.user.email);
      if (data) setCameras(data);
    };
    fetchCameras();
  }, [session]);

  useEffect(() => {
    if (!selectedCameraId || !selectedDate) return;
    const fetchVODs = async () => {
      const { data } = await supabase
        .from("vod_files")
        .select("*, cameras(name)")
        .eq("user_email", session?.user?.email)
        .eq("camera_id", selectedCameraId)
        .eq("date", selectedDate)
        .gte("start_time", startTime)
        .lte("start_time", endTime)
        .order("start_time", { ascending: true });

      setVodFiles(data || []);
      if (!data || data.length === 0) {
        setMessage("אין קטעי וידאו זמינים ביום הזה.");
      } else {
        setMessage("");
      }
    };
    fetchVODs();
  }, [selectedCameraId, selectedDate, startTime, endTime]);

  return (
    <div className="max-w-4xl mx-auto p-4 pt-16">
      <h1 className="text-2xl font-bold mb-6">🎥 צפייה בהקלטות</h1>

      {/* Step 1: Choose Camera */}
      <div className="mb-4">
        <label className="block mb-1 font-semibold">בחר מצלמה</label>
        <select
          className="w-full border p-2 rounded"
          value={selectedCameraId ?? ""}
          onChange={(e) => {
            setSelectedCameraId(e.target.value);
            setSelectedDate("");
            setVodFiles([]);
            setMessage("");
          }}
        >
          <option value="">-- בחר מצלמה --</option>
          {cameras.map((camera) => (
            <option key={camera.id} value={camera.id}>
              {camera.name}
            </option>
          ))}
        </select>
      </div>

      {/* Step 2: Choose Date */}
      {selectedCameraId && (
        <div className="mb-4">
          <label className="block mb-1 font-semibold">בחר תאריך</label>
          <input
            type="date"
            className="w-full border p-2 rounded"
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value);
              setVodFiles([]);
              setMessage("");
            }}
          />
        </div>
      )}

      {/* Step 3: Choose Time */}
      {selectedDate && (
        <div className="mb-4 flex gap-4">
          <div className="flex-1">
            <label className="block mb-1 font-semibold">משעה</label>
            <input
              type="time"
              className="w-full border p-2 rounded"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>
          <div className="flex-1">
            <label className="block mb-1 font-semibold">עד שעה</label>
            <input
              type="time"
              className="w-full border p-2 rounded"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Step 4: Results */}
      {message && <p className="text-red-500 text-center my-4">{message}</p>}

      {vodFiles.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6">
          {vodFiles.map((video) => (
            <div key={video.id} className="bg-white rounded shadow p-4">
              <ReactPlayer url={video.file_url} controls width="100%" />
              <p className="font-bold mt-2">{video.cameras?.name}</p>
              <p className="text-sm text-gray-600">🕒 {video.start_time}</p>
              <a
                href={video.file_url}
                download
                className="mt-3 inline-block bg-gray-800 text-white text-sm px-4 py-2 rounded hover:bg-black transition"
              >
                ⬇️ הורד את הווידאו
              </a>
              <p className="text-xs text-gray-500 mt-1">לחץ כדי לשמור את הווידאו למחשב</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { DeleteButton } from "./DeleteButton";
import React from "react";
import { FixedSizeList as List } from "react-window";
import {
  Search,
  Filter,
  Download,
  Activity,
  AlertCircle,
  CheckCircle,
  User,
  Camera,
  Trash2,
} from "lucide-react";

interface Camera {
  id: string;
  name: string;
  serial_number: string;
  stream_path: string;
  user_id: string;
  is_stream_active: boolean | null;
  user: {
    full_name: string;
  } | null;
}

interface DeviceHealth {
  stream_status: string;
}

export function CamerasTable({ cameras }: { cameras: Camera[] }) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [healthData, setHealthData] = useState<Record<string, DeviceHealth | null>>({});

  // Removed health monitoring - no longer needed for cameras

  const filtered = cameras.filter((cam) => {
    const matchesName = cam.user?.full_name?.toLowerCase().includes(search.toLowerCase());
    return matchesName;
  });

  const sorted = [...filtered].sort((a, b) => {
    return a.name.localeCompare(b.name);
  });

  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const camera = sorted[index];

    return (
      <div dir="rtl" style={style} className="grid grid-cols-[2fr_1.5fr_2fr_1fr_1fr_1fr] border-b border-slate-200 px-6 py-4 text-sm items-center hover:bg-slate-50 transition-colors">
        <div className="font-medium text-slate-800">{camera.name}</div>
        <div className="text-slate-600">{camera.serial_number}</div>
        <div className="text-slate-700">{camera.user?.full_name || "ללא לקוח"}</div>
        <div>
          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium ${
            camera.is_stream_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
          }`}>
            {camera.is_stream_active ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
            {camera.is_stream_active ? "פעיל" : "לא פעיל"}
          </span>
        </div>
        <div>
          <button
            onClick={() => downloadScript(camera.id, camera.stream_path, camera.user_id, camera.name)}
            className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors group"
            title="הורד סקריפט מצלמה"
          >
            <Download size={16} className="group-hover:scale-110 transition-transform" />
          </button>
        </div>
        <div>
          <DeleteButton cameraId={camera.id} />
        </div>
      </div>
    );
  };

  // ✅ PRESERVED: Critical downloadScript function - unchanged functionality
  const downloadScript = (
    cameraId: string,
    rtsp: string,
    userId: string,
    cameraName: string
  ) => {
    const script = `#!/bin/bash

# ==== Camera Info ====
# Name: ${cameraName}
USER_ID="${userId}"
CAMERA_ID="${cameraId}"
RTSP_URL="${rtsp}"

# ==== Folder Paths ====
BASE_DIR=~/clearpoint-recordings/\${USER_ID}
FOOTAGE_DIR=\${BASE_DIR}/footage/\${CAMERA_ID}
LIVE_DIR=/mnt/ram-ts/\${USER_ID}/live/\${CAMERA_ID}

mkdir -p "\${FOOTAGE_DIR}"
mkdir -p "\${LIVE_DIR}"

echo "📂 Folders created:"
echo "  - \${FOOTAGE_DIR}"
echo "  - \${LIVE_DIR}"

# ==== VOD Recording ====
echo "🎥 Starting VOD recording..."
ffmpeg -rtsp_transport tcp -i "\${RTSP_URL}" \
  -c:v copy -c:a aac -f segment -segment_time 900 -reset_timestamps 1 -strftime 1 \
  "\${FOOTAGE_DIR}/%Y-%m-%d_%H-%M-%S.mp4" > /dev/null 2>&1 &

# ==== Live Streaming ====
echo "🔴 Starting live stream..."
ffmpeg -rtsp_transport tcp -i "\${RTSP_URL}" \
  -c copy -f hls -hls_time 1.5 -hls_list_size 8 -hls_flags "program_date_time+delete_segments+append_list" \
  -hls_segment_filename "\${LIVE_DIR}/stream-%03d.ts" \
  "\${LIVE_DIR}/stream.m3u8" > /dev/null 2>&1 &

# ==== Cleanup Old Segments (Optional, every 5 min) ====
echo "🧹 Cleaning old .ts every 5 min in background..."
while true; do
  find "\${LIVE_DIR}" -name "stream-*.ts" -mmin +5 -delete
  sleep 300
done &

echo "✅ All processes running in background."`;

    const blob = new Blob([script], { type: "text/x-sh" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `camera-${cameraId}.sh`;
    a.click();
    URL.revokeObjectURL(url);
    alert(`📄 קובץ camera-${cameraId}.sh נוצר והורד בהצלחה`);
  };

  return (
    <div dir="rtl">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div className="text-right">
              <p className="text-slate-600 text-sm font-medium">סה"כ מצלמות</p>
              <p className="text-3xl font-bold text-slate-800">{cameras.length}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Camera size={24} className="text-blue-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div className="text-right">
              <p className="text-slate-600 text-sm font-medium">פעילות</p>
              <p className="text-3xl font-bold text-green-600">
                {cameras.filter(c => c.is_stream_active).length}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <CheckCircle size={24} className="text-green-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div className="text-right">
              <p className="text-slate-600 text-sm font-medium">לא פעילות</p>
              <p className="text-3xl font-bold text-red-600">
                {cameras.filter(c => !c.is_stream_active).length}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <AlertCircle size={24} className="text-red-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div className="text-right">
              <p className="text-slate-600 text-sm font-medium">עם לקוחות</p>
              <p className="text-3xl font-bold text-blue-600">
                {cameras.filter(c => c.user?.full_name).length}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <User size={24} className="text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-8">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 w-full lg:w-auto">
            <div className="relative flex-1 lg:w-80">
              <Search size={20} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="חיפוש לפי שם לקוח..."
                className="w-full pr-10 pl-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 text-right"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            
          </div>
        </div>
      </div>

      {/* Cameras Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <div dir="rtl" className="grid grid-cols-[2fr_1.5fr_2fr_1fr_1fr_1fr] bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold text-sm px-6 py-4">
            <div className="flex items-center gap-2">
              <Camera size={16} />
              <span>שם מצלמה</span>
            </div>
            <div>מס' סידורי</div>
            <div className="flex items-center gap-2">
              <User size={16} />
              <span>לקוח</span>
            </div>
            <div className="flex items-center gap-2">
              <Activity size={16} />
              <span>סטטוס</span>
            </div>
            <div className="flex items-center gap-2">
              <Download size={16} />
              <span>סקריפט</span>
            </div>
            <div className="flex items-center gap-2">
              <Trash2 size={16} />
              <span>מחק</span>
            </div>
          </div>
          <List
            height={600}
            itemCount={sorted.length}
            itemSize={80}
            width="100%"
          >
            {Row}
          </List>
        </div>
      </div>
    </div>
  );
}

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
  HardDrive,
  Cpu,
  Clock,
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
  disk_root_pct: number;
  disk_ram_pct: number;
  last_checked: string;
  log_message: string;
}

export function CamerasTable({ cameras }: { cameras: Camera[] }) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [healthData, setHealthData] = useState<Record<string, DeviceHealth | null>>({});

  useEffect(() => {
    async function fetchHealth() {
      const entries = await Promise.all(
        cameras.map(async (cam) => {
          try {
            const res = await fetch(`/api/camera-health/${cam.id}`);
            const json = await res.json();
            return [cam.id, json.success ? json.health : null];
          } catch (err) {
            return [cam.id, null];
          }
        })
      );
      setHealthData(Object.fromEntries(entries));
    }
    fetchHealth();
    const interval = setInterval(fetchHealth, 60000);
    return () => clearInterval(interval);
  }, [cameras]);

  const filtered = cameras.filter((cam) => {
    const matchesName = cam.user?.full_name?.toLowerCase().includes(search.toLowerCase());
    const status = healthData[cam.id]?.stream_status?.toLowerCase();
    const matchesStatus = filterStatus ? status === filterStatus : true;
    return matchesName && matchesStatus;
  });

  const sorted = [...filtered].sort((a, b) => {
    const aHealth = healthData[a.id];
    const bHealth = healthData[b.id];

    const aStatus = aHealth?.stream_status?.toLowerCase() ?? "unknown";
    const bStatus = bHealth?.stream_status?.toLowerCase() ?? "unknown";

    if (aStatus !== "ok" && bStatus === "ok") return -1;
    if (aStatus === "ok" && bStatus !== "ok") return 1;

    const aTime = new Date(aHealth?.last_checked || 0).getTime();
    const bTime = new Date(bHealth?.last_checked || 0).getTime();

    return aTime - bTime;
  });

  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const camera = sorted[index];
    const health = healthData[camera.id];
    const isOk = health?.stream_status?.toLowerCase() === "ok";
    const isError = health?.stream_status?.toLowerCase() === "error";
    const isWarning = health?.stream_status?.toLowerCase() === "warning";
    const lastCheckedAgoSec = health?.last_checked
      ? Math.floor((Date.now() - new Date(health.last_checked).getTime()) / 1000)
      : null;

    return (
      <div dir="rtl" style={style} className="grid grid-cols-[1fr_1fr_1fr_1fr_0.7fr_0.7fr_1.2fr_1.5fr_0.8fr_0.8fr] border-b border-slate-200 px-6 py-4 text-sm items-center hover:bg-slate-50 transition-colors">
        <div className="font-medium text-slate-800">{camera.name}</div>
        <div className="text-slate-600">{camera.serial_number}</div>
        <div className="text-slate-700">{camera.user?.full_name || "ללא לקוח"}</div>
        <div>
          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium ${
            isOk ? "bg-green-100 text-green-700" : 
            isError ? "bg-red-100 text-red-700" :
            isWarning ? "bg-orange-100 text-orange-700" :
            "bg-slate-100 text-slate-600"
          }`}>
            {isOk ? <CheckCircle size={12} /> : 
             isError ? <AlertCircle size={12} /> :
             isWarning ? <Activity size={12} /> :
             <Clock size={12} />}
            {health?.stream_status || "לא ידוע"}
          </span>
        </div>
        <div className="text-slate-600">
          <span className={`font-medium ${
            (health?.disk_root_pct ?? 0) > 90 ? "text-red-600" :
            (health?.disk_root_pct ?? 0) > 75 ? "text-orange-600" :
            "text-slate-700"
          }`}>
            {health?.disk_root_pct ?? "—"}%
          </span>
        </div>
        <div className="text-slate-600">
          <span className={`font-medium ${
            (health?.disk_ram_pct ?? 0) > 90 ? "text-red-600" :
            (health?.disk_ram_pct ?? 0) > 75 ? "text-orange-600" :
            "text-slate-700"
          }`}>
            {health?.disk_ram_pct ?? "—"}%
          </span>
        </div>
        <div className={`text-xs ${
          lastCheckedAgoSec != null
            ? lastCheckedAgoSec < 120
              ? "text-green-600"
              : lastCheckedAgoSec < 300
              ? "text-orange-600"
              : "text-red-600"
            : "text-slate-400"
        }`}>
          {health?.last_checked
            ? new Date(health.last_checked).toLocaleTimeString("he-IL")
            : "ללא בדיקה"}
        </div>
        <div className="text-xs text-slate-500 truncate max-w-[150px]" title={health?.log_message || ""}>
          {health?.log_message || "ללא לוג"}
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
                {Object.values(healthData).filter(h => h?.stream_status?.toLowerCase() === 'ok').length}
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
              <p className="text-slate-600 text-sm font-medium">שגיאות</p>
              <p className="text-3xl font-bold text-red-600">
                {Object.values(healthData).filter(h => h?.stream_status?.toLowerCase() === 'error').length}
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
              <p className="text-slate-600 text-sm font-medium">אזהרות</p>
              <p className="text-3xl font-bold text-orange-600">
                {Object.values(healthData).filter(h => h?.stream_status?.toLowerCase() === 'warning').length}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <Activity size={24} className="text-orange-600" />
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
            
            <div className="relative">
              <Filter size={20} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <select
                className="pr-10 pl-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white text-right appearance-none"
                value={filterStatus || ""}
                onChange={(e) => setFilterStatus(e.target.value || null)}
              >
                <option value="">כל הסטטוסים</option>
                <option value="ok">פעיל</option>
                <option value="error">שגיאה</option>
                <option value="warning">אזהרה</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Cameras Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <div dir="rtl" className="grid grid-cols-[1fr_1fr_1fr_1fr_0.7fr_0.7fr_1.2fr_1.5fr_0.8fr_0.8fr] bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold text-sm px-6 py-4">
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
              <HardDrive size={16} />
              <span>דיסק</span>
            </div>
            <div className="flex items-center gap-2">
              <Cpu size={16} />
              <span>RAM</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock size={16} />
              <span>בדיקה אחרונה</span>
            </div>
            <div>לוג</div>
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

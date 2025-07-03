"use client";

import { useEffect, useState } from "react";
import { DeleteButton } from "./DeleteButton";
import React from "react";
import { FixedSizeList as List } from "react-window";

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
    const lastCheckedAgoSec = health?.last_checked
      ? Math.floor((Date.now() - new Date(health.last_checked).getTime()) / 1000)
      : null;

    return (
      <div dir="rtl" style={style} className="grid grid-cols-[1fr_1fr_1fr_1fr_0.7fr_0.7fr_1.2fr_1.5fr_0.8fr_0.8fr] border-b px-4 py-2 text-sm items-center hover:bg-gray-50">
        <div>{camera.name}</div>
        <div>{camera.serial_number}</div>
        <div>{camera.user?.full_name || "-"}</div>
        <div>
          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
            isOk ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
          }`}>{health?.stream_status || "—"}</span>
        </div>
        <div>{health?.disk_root_pct ?? "—"}%</div>
        <div>{health?.disk_ram_pct ?? "—"}%</div>
        <div className={
          lastCheckedAgoSec != null
            ? lastCheckedAgoSec < 120
              ? "text-green-600"
              : lastCheckedAgoSec < 300
              ? "text-yellow-600"
              : "text-red-600"
            : "text-gray-400"
        }>
          {health?.last_checked
            ? new Date(health.last_checked).toLocaleTimeString("he-IL")
            : "—"}
        </div>
        <div className="italic text-xs text-gray-500">
          {health?.log_message || "—"}
        </div>
        <div>
          <button
            onClick={() => downloadScript(camera.id, camera.stream_path, camera.user_id, camera.name)}
            className="text-green-600 text-xs hover:underline"
          >📄 הורד</button>
        </div>
        <div>
          <DeleteButton cameraId={camera.id} />
        </div>
      </div>
    );
  };

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
    <main dir="rtl" className="pt-20 p-6 bg-gray-100 min-h-screen">
      <div className="mb-4">
        <h1 className="text-3xl font-bold">ניהול מצלמות</h1>
        <span className="text-sm text-gray-500">סה"כ {cameras.length} מצלמות</span>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input
          type="text"
          placeholder="חיפוש לפי שם לקוח..."
          className="w-full max-w-xs p-2 border rounded"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="p-2 border rounded"
          value={filterStatus || ""}
          onChange={(e) => setFilterStatus(e.target.value || null)}
        >
          <option value="">כל הסטטוסים</option>
          <option value="ok">פעיל</option>
          <option value="error">שגיאה</option>
          <option value="warning">אזהרה</option>
        </select>
      </div>

      <div className="overflow-hidden border rounded-xl bg-white">
        <div dir="rtl" className="grid grid-cols-[1fr_1fr_1fr_1fr_0.7fr_0.7fr_1.2fr_1.5fr_0.8fr_0.8fr] bg-gray-100 text-gray-700 font-semibold text-sm px-4 py-2">
          <div>שם מצלמה</div>
          <div>מס' סידורי</div>
          <div>לקוח</div>
          <div>סטטוס</div>
          <div>דיסק</div>
          <div>RAM</div>
          <div>בדיקה אחרונה</div>
          <div>לוג</div>
          <div>הורד</div>
          <div>מחק</div>
        </div>
        <List
          height={600}
          itemCount={sorted.length}
          itemSize={60}
          width="100%"
        >
          {Row}
        </List>
      </div>
    </main>
  );
}

"use client";

import { useState } from "react";
import { DeleteButton } from "./DeleteButton";
import React from "react";

interface Camera {
  id: string;
  name: string;
  stream_path: string;
  user_id: string;
  serial_number: string;
  last_seen_at: string | null;
  is_stream_active: boolean | null;
  user: {
    full_name: string;
  } | null;
}

export function CamerasTable({ cameras }: { cameras: Camera[] }) {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => alert("הועתק ללוח״"));
  };

  const downloadScript = (cameraId: string, rtsp: string, userId: string) => {
    const script = `#!/bin/bash

# ==== Camera Info ====
USER_ID="${userId}"
CAMERA_ID="${cameraId}"
RTSP_URL="${rtsp}"

# ==== Folder Paths ====
BASE_DIR=~/clearpoint-recordings/\${USER_ID}
FOOTAGE_DIR=\${BASE_DIR}/footage/\${CAMERA_ID}
LIVE_DIR=\${BASE_DIR}/live/\${CAMERA_ID}

mkdir -p "\${FOOTAGE_DIR}"
mkdir -p "\${LIVE_DIR}"

echo "\ud83d\udcc2 Folders created:"
echo "  - $FOOTAGE_DIR"
echo "  - $LIVE_DIR"

# ==== VOD Recording ====
echo "\ud83c\udfa5 Starting VOD recording..."
ffmpeg -rtsp_transport tcp -i "\${RTSP_URL}" \
  -c:v copy -c:a aac -f segment -segment_time 900 -reset_timestamps 1 -strftime 1 \
  "\${FOOTAGE_DIR}/%Y-%m-%d_%H-%M-%S.mp4" > /dev/null 2>&1 &

# ==== Live Streaming ====
echo "\ud83d\udd34 Starting live stream..."
ffmpeg -rtsp_transport tcp -i "\${RTSP_URL}" \
  -c copy -f hls -hls_time 2 -hls_list_size 5 -hls_flags delete_segments+append_list \
  -hls_segment_filename "\${LIVE_DIR}/stream-%03d.ts" \
  "\${LIVE_DIR}/stream.m3u8" > /dev/null 2>&1 &

# ==== Serve Live Folder over HTTP ====
echo "\ud83c\udf10 Starting local HTTP server..."
npx serve -s "\${LIVE_DIR}" -l 8080 > /dev/null 2>&1 &

# ==== Cleanup Old Segments (Optional, every 5 min) ====
echo "\ud83e\uddf9 Cleaning old .ts every 5 min in background..."
while true; do
  find "\${LIVE_DIR}" -name "stream-*.ts" -mmin +5 -delete
  sleep 300
done &

echo "\u2705 All processes running in background."`;

    const blob = new Blob([script], { type: "text/x-sh" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `camera-${cameraId}.sh`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = cameras.filter((cam) =>
    cam.user?.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main dir="rtl" className="pt-20 p-6 bg-gray-100 min-h-screen">
      <div className="mb-4">
        <h1 className="text-3xl font-bold">ניהול מצלמות</h1>
        <span className="text-sm text-gray-500">
          סה\"כ {cameras.length} מצלמות
        </span>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-6">
        <input
          type="text"
          placeholder="חיפוש לפי שם לקוח..."
          className="w-full max-w-sm p-2 border rounded"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-gray-500">לא נמצאו מצלמות תואמות.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl shadow border bg-white">
          <table className="min-w-full text-sm text-right">
            <thead className="bg-gray-100 text-gray-700 font-semibold">
              <tr>
                <th className="px-4 py-3">שם מצלמה</th>
                <th className="px-4 py-3">מספר סידורי</th>
                <th className="px-4 py-3">לקוח</th>
                <th className="px-4 py-3">סטטוס</th>
<th className="px-4 py-3">הורדות</th>
                <th className="px-4 py-3">מחק</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((camera) => {
                const isOnline = camera.is_stream_active === true;
                const isExpanded = expanded[camera.id];

                return (
                  <React.Fragment key={camera.id}>
                    <tr key={`${camera.id}-main`} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-2">
                       
                   
                          {camera.name} 
                       
                      </td>
                      <td className="px-4 py-2">{camera.serial_number}</td>
                      <td className="px-4 py-2">{camera.user?.full_name || "-"}</td>
                      <td className="px-4 py-2">
                        <span
                          className={`inline-block px-2 py-1 text-xs rounded-full font-medium ${
                            isOnline
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {isOnline ? "פעיל" : "לא פעיל"}
                        </span>
                      </td>
<td className="px-4 py-2">
<button
  title="הורד קובץ הפעלה למצלמה"
  onClick={() =>
    downloadScript(camera.id, camera.stream_path, camera.user_id)
  }
  className="text-sm text-green-600 hover:underline"
>
  📄 הורד סקריפט .sh
</button>
</td>
                      <td className="px-4 py-2">
                        <DeleteButton cameraId={camera.id} />
                      </td>
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
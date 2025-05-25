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

  const downloadScript = (cameraId: string, vod: string, live: string) => {
    const script = `#!/bin/bash\n\n# VOD Recording\n${vod}\n\n# Live Streaming\n${live}\n`;
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

  const generateFFmpeg = (camera: Camera) => {
    const vodPath = `./recordings/${camera.user_id}/${camera.id}/%Y-%m-%d_%H-%M-%S.mp4`;
    const livePath = `./public/stream/${camera.id}.m3u8`;

    const masked = (camera.stream_path || "").replace(
      /(rtsp:\/\/.*?:)(.*?)(@)/,
      "$1****$3"
    );

    const vod = `ffmpeg -rtsp_transport tcp -i \"${masked}\" \\
  -c:v copy -c:a aac -f segment -segment_time 900 -reset_timestamps 1 -strftime 1 \\
  ${vodPath}`;

    const live = `ffmpeg -rtsp_transport tcp -i \"${masked}\" \\
  -c copy -f hls -hls_time 2 -hls_list_size 3 -hls_flags delete_segments \\
  ${livePath}`;

    return { vod, live, vodRaw: camera.stream_path, masked };
  };

  return (
    <main dir="rtl" className="pt-20 p-6 bg-gray-100 min-h-screen">
      <div className="mb-4">
        <h1 className="text-3xl font-bold">ניהול מצלמות</h1>
        <span className="text-sm text-gray-500">
          סה"כ {cameras.length} מצלמות
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
                <th className="px-4 py-3">פקודות</th>
                <th className="px-4 py-3">מחק</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((camera) => {
                const isOnline = camera.is_stream_active === true;
                const { vod, live, vodRaw, masked } = generateFFmpeg(camera);
                const isExpanded = expanded[camera.id];

                return (
                   <React.Fragment key={camera.id}>
                    <tr key={`${camera.id}-main`} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-2">
                        <button
                          onClick={() => toggleExpanded(camera.id)}
                          className="text-blue-600 hover:underline"
                        >
                          {camera.name} {isExpanded ? "▲" : "▼"}
                        </button>
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
                      <td className="px-4 py-2 text-xs">
                        {isExpanded && (
                          <div className="space-y-2">
                            <div>
                              <strong>🎥 VOD:</strong>
                              <pre className="bg-gray-100 p-2 mt-1 whitespace-pre-wrap overflow-x-auto">{vod}</pre>
                              <button
                                onClick={() => copyToClipboard(vod)}
                                className="text-blue-500 hover:underline"
                              >
                                העתק פקודת VOD
                              </button>
                            </div>
                            <div>
                              <strong>🔴 LIVE:</strong>
                              <pre className="bg-gray-100 p-2 mt-1 whitespace-pre-wrap overflow-x-auto">{live}</pre>
                              <button
                                onClick={() => copyToClipboard(live)}
                                className="text-blue-500 hover:underline"
                              >
                                העתק פקודת LIVE
                              </button>
                            </div>
                            <div>
                              <button
                                onClick={() =>
                                  downloadScript(
                                    camera.id,
                                    vod.replace(masked, vodRaw),
                                    live.replace(masked, vodRaw)
                                  )
                                }
                                className="text-green-600 hover:underline"
                              >
                                📄 הורד סקריפט .sh
                              </button>
                            </div>
                          </div>
                        )}
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
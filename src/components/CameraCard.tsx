import LiveStreamPlayer from "./LiveStreamPlayer";
import { Mic, Volume2, Camera } from "lucide-react";

export default function CameraCard({
  camera,
  ...rest
}: {
  camera: any;
  [key: string]: any;
}) {
  const { name, is_stream_active, last_seen_at } = camera;

  return (
    <div className="relative w-full max-w-3xl bg-gray-900 border border-gray-800 shadow-md overflow-hidden">
      {/* Stream Area with Floating Icons + Live Badge */}
      <div className="relative aspect-video bg-black">
        <LiveStreamPlayer
          streamUrl={`/stream/${camera.id}.m3u8`} // ✅ changed from "path" to "cameraId"

        />

        {/* 🔴 LIVE Badge */}
        <div className="absolute top-2 left-2 bg-red-600 text-white text-xs font-semibold px-2 py-0.5 rounded z-10">
          ● LIVE
        </div>

        {/* Floating Controls */}
        <div className="absolute bottom-2 right-2 flex gap-2 z-10">
          <button
            title="הפעל קול"
            className="bg-white bg-opacity-80 hover:bg-opacity-100 p-2 rounded-full shadow hover:scale-105 transition"
          >
            <Volume2 size={18} />
          </button>
          <button
            title="שיחה דו-כיוונית"
            className="bg-white bg-opacity-80 hover:bg-opacity-100 p-2 rounded-full shadow hover:scale-105 transition"
          >
            <Mic size={18} />
          </button>
          <button
            title="צילום מסך"
            className="bg-white bg-opacity-80 hover:bg-opacity-100 p-2 rounded-full shadow hover:scale-105 transition"
          >
            <Camera size={18} />
          </button>
        </div>
      </div>

      {/* Info Block */}
      <div className="px-4 py-3 text-sm text-white bg-gray-800 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div className="font-semibold text-base">{name}</div>
        <div className="flex flex-col text-xs text-gray-300 sm:text-left sm:items-end mt-2 sm:mt-0">
          <span>{is_stream_active ? "🟢 פעילה" : "🔴 לא פעילה"}</span>
          {last_seen_at && (
            <span>נראתה לאחרונה: {new Date(last_seen_at).toLocaleString("he-IL")}</span>
          )}
        </div>
      </div>
    </div>
  );
}

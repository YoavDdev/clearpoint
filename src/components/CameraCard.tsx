import LiveStreamPlayer from "./LiveStreamPlayer";
import { Mic, Volume2, Camera } from "lucide-react"; // Optional icons, can swap

export default function CameraCard({
  camera,
  ...rest
}: {
  camera: any;
  [key: string]: any;
}) {
  const { name, is_stream_active, last_seen_at } = camera;

  return (
    <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-lg overflow-hidden">
      {/* Stream Area with Floating Icons */}
      <div className="relative aspect-video bg-black">
        <LiveStreamPlayer
          path={camera.id}
          onSuccess={() => console.log(`✅ Camera ${camera.id} online`)}
          onError={() => console.log(`❌ Camera ${camera.id} offline`)}
        />

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

      {/* Info Block Below */}
      <div className="bg-white border-t px-4 py-3 text-sm text-gray-700 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div className="font-semibold text-base">{name}</div>
        <div className="flex flex-col text-xs text-gray-500 sm:text-left sm:items-end mt-2 sm:mt-0">
          <span>{is_stream_active ? "🟢 פעילה" : "🔴 לא פעילה"}</span>
          {last_seen_at && (
            <span>נראתה לאחרונה: {new Date(last_seen_at).toLocaleString("he-IL")}</span>
          )}
        </div>
      </div>
    </div>
  );
}

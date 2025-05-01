import LiveStreamPlayer from "./LiveStreamPlayer";

export default function CameraCard({ camera }: { camera: any }) {
  const { name, is_stream_active, last_seen_at } = camera;

  return (
    <div className="w-full max-w-3xl bg-white rounded-2xl shadow-lg overflow-hidden">
      {/* Large Stream Area */}
      <div className="aspect-video bg-black">
        <LiveStreamPlayer
          path={camera.id}
          onSuccess={() => console.log(`✅ Camera ${camera.id} online`)}
          onError={() => console.log(`❌ Camera ${camera.id} offline`)}
        />
      </div>

      {/* Info Section */}
      <div className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between text-right text-sm text-gray-700">
        <div className="font-semibold text-lg">{name}</div>
        <div className="flex flex-col sm:text-left sm:items-end text-xs text-gray-500 mt-2 sm:mt-0">
          <span>{is_stream_active ? "🟢 פעילה" : "🔴 לא פעילה"}</span>
          {last_seen_at && (
            <span>נראתה לאחרונה: {new Date(last_seen_at).toLocaleString("he-IL")}</span>
          )}
        </div>
      </div>
    </div>
  );
}

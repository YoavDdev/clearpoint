import LiveStreamPlayer from "./LiveStreamPlayer";

export default function CameraCard({
  camera,
  isCompact = false,
}: {
  camera: any;
  isCompact?: boolean; // 👈 default: false
}) {
  if (!camera || !camera.id) return null;

  return (
    <div className="w-full h-full bg-black">
      <LiveStreamPlayer
        streamUrl={`/stream/${camera.id}.m3u8`}
        objectFit={isCompact ? "cover" : "contain"}
      />
    </div>
  );
}

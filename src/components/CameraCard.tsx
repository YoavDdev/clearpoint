import LiveStreamPlayer from "./LiveStreamPlayer";

export default function CameraCard({
  camera,
  ...rest
}: {
  camera: any;
  [key: string]: any;
}) {
  const { name } = camera;

  return (
    <div className="bg-white shadow-md overflow-hidden border border-gray-200">
      <div className="flex justify-center items-center bg-black ">
        <LiveStreamPlayer streamUrl={`/stream/${camera.id}.m3u8`} />
      </div>
      <div className="px-4 py-3 text-right text-sm text-gray-800 font-semibold">
        {name}
      </div>
    </div>
  );
}

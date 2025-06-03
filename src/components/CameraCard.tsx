import LiveStreamPlayer from "./LiveStreamPlayer";

export default function CameraCard({
  camera,
  tunnelName,
}: {
  camera: any;
  tunnelName: string;
}) {
  const { id, name } = camera;
  const streamUrl = `https://${tunnelName}.clearpoint.co.il/${id}/stream.m3u8`;

  return (
    <div className="bg-white shadow-md overflow-hidden border border-gray-200">
      <div className="flex justify-center items-center bg-black">
        <LiveStreamPlayer streamUrl={streamUrl} />
      </div>
      <div className="px-4 py-3 text-right text-sm text-gray-800 font-semibold">
        {name}
      </div>
    </div>
  );
}

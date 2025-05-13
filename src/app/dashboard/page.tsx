'use client';

import { useEffect, useState } from "react";
import CameraCard from "@/components/CameraCard";

export default function DashboardPage() {
  const [cameras, setCameras] = useState<any[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<any | null>(null);

  useEffect(() => {
    async function loadCameras() {
      const res = await fetch("/api/user-cameras");
      const result = await res.json();

      if (result.success) {
        const realCameras = result.cameras;
        const mockCameras = [
          { id: "mock-1", name: "מצלמה מדומה 1" },
          { id: "mock-2", name: "מצלמה מדומה 2" },
          { id: "mock-3", name: "מצלמה מדומה 3" },
        ];
        const all = [...realCameras, ...mockCameras].slice(0, 4); // limit to 4
        setCameras(all);
        setSelectedCamera(all[0]);
      }
    }
    loadCameras();
  }, []);

  const otherCameras = cameras.filter((cam) => cam.id !== selectedCamera?.id);

  function handleSwap(camera: any) {
    if (!selectedCamera) return;
    setSelectedCamera(camera);
  }

  return (
    <div className="w-full h-full max-h-[calc(100vh-100px)] overflow-hidden bg-black ">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[calc(100vh-100px)]">
  {/* Main Camera */}
  <div className="md:col-span-2 h-full">
    <CameraCard camera={selectedCamera} />
  </div>

  {/* Small Cameras – vertical on desktop, below main on mobile */}
  <div className="flex flex-col md:h-full gap-4 md:gap-0 md:divide-y md:divide-black">
    {otherCameras.slice(0, 3).map((camera) => (
      <div
        key={camera.id}
        className="h-[33vh] md:flex-1 cursor-pointer"
        onClick={() => handleSwap(camera)}
      >
        <CameraCard camera={camera} isCompact={true} />
      </div>
    ))}
  </div>
</div>

  </div>  
  );
}

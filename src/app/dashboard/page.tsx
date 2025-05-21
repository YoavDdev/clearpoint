'use client';

import { useEffect, useState } from "react";
import CameraCard from "@/components/CameraCard";

export default function DashboardPage() {
  const [cameras, setCameras] = useState<any[]>([]);

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

        setCameras([...realCameras, ...mockCameras]);
      } else {
        console.error("Error:", result.error);
      }
    }

    loadCameras();
  }, []);

  return (
    <main className="pt-[128px] px-4">
      {cameras.length === 0 ? (
        <p className="text-center text-gray-500">לא קיימות מצלמות בחשבון זה.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {cameras.map((camera) => (
            <CameraCard key={camera.id} camera={camera} />
          ))}
        </div>
      )}
    </main>
  );
}

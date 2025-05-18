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
        setCameras(result.cameras);
      } else {
        console.error("Error:", result.error);
      }
    }
    loadCameras();
  }, []);
  useEffect(() => {
    async function loadCameras() {
      const res = await fetch("/api/user-cameras");
      const result = await res.json();
  
      if (result.success) {
        const realCameras = result.cameras;
  
        // 👇 Mock 3 fake cameras
        const mockCameras = [
          {
            id: "mock-1",
            name: "מצלמה מדומה 1",
          },
          {
            id: "mock-2",
            name: "מצלמה מדומה 2",
          },
          {
            id: "mock-3",
            name: "מצלמה מדומה 3",
          },
        ];
  
        setCameras([...realCameras, ...mockCameras]);
      } else {
        console.error("Error:", result.error);
      }
    }
    loadCameras();
  }, []);
  
  

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-6 text-right">המצלמות שלי</h1>

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

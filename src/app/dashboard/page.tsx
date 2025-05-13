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

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-4">המצלמות שלי</h1>

      {cameras.length === 0 ? (
        <p>לא קיימות מצלמות בחשבון זה.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {cameras.map((camera) => (
            <CameraCard key={camera.id} camera={camera} />
          ))}
        </div>
      )}
    </main>
  );
}

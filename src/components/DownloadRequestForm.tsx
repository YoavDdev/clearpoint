"use client";

import { useState } from "react";

export default function DownloadRequestForm({ cameraId }: { cameraId: string }) {
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [duration, setDuration] = useState(15); // default 15 minutes
  const [loading, setLoading] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const res = await fetch("/api/request-clip", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cameraId, date, startTime, duration }),
    });

    const data = await res.json();
    setLoading(false);

    if (data.success) {
      setDownloadUrl(data.downloadUrl);
    } else {
      alert("Failed to generate clip");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-6 space-y-4 max-w-md text-right">
      <h2 className="text-xl font-semibold">📥 בקשת קטע וידאו</h2>

      <div className="space-y-1">
        <label className="block font-medium">תאריך</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full border p-2 rounded" required />
      </div>

      <div className="space-y-1">
        <label className="block font-medium">שעת התחלה</label>
        <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-full border p-2 rounded" required />
      </div>

      <div className="space-y-1">
        <label className="block font-medium">משך (בדקות)</label>
        <select value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="w-full border p-2 rounded">
          <option value={5}>5 דקות</option>
          <option value={10}>10 דקות</option>
          <option value={15}>15 דקות</option>
          <option value={30}>30 דקות</option>
        </select>
      </div>

      <button type="submit" className="bg-blue-600 text-white py-2 px-4 rounded w-full">
        {loading ? "מייצר קטע..." : "צור קובץ להורדה"}
      </button>

      {downloadUrl && (
        <div className="mt-4 text-green-600">
          ✅ מוכן להורדה:{" "}
          <a href={downloadUrl} className="underline text-blue-600" target="_blank" rel="noopener noreferrer">
            לחץ להורדה
          </a>
        </div>
      )}
    </form>
  );
}

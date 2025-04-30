"use client";

import { useState } from "react";
import Link from "next/link";
import { DeleteButton } from "./DeleteButton";

type Camera = {
  id: string;
  name: string;
  image_url: string;
  serial_number: string;
  last_seen_at: string | null;
  is_stream_active: boolean | null;
  user: {
    full_name: string;
  } | null;
};

export function CamerasTable({ cameras }: { cameras: Camera[] }) {
  const [search, setSearch] = useState("");

  const filtered = cameras.filter((cam) =>
    cam.user?.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
    
      <div className="mb-4">
        <input
          type="text"
          placeholder="חיפוש לפי שם בעלים..."
          className="w-full max-w-sm p-2 border rounded"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-gray-600">לא נמצאו מצלמות תואמות.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg shadow bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100 text-right">
              <tr>
                <th className="px-4 py-3 text-sm font-semibold text-gray-700">שם מצלמה</th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-700">מספר סידורי</th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-700">בעלים</th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-700">סטטוס</th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-700">פעולות</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-right">
              {filtered.map((camera) => {
                const isOnline = camera.is_stream_active === true;

                return (
                  <tr key={camera.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">{camera.name}</td>
                    <td className="px-4 py-3">{camera.serial_number}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {camera.user?.full_name || "-"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col items-start">
                        <span
                          className={`inline-block px-2 py-1 text-xs rounded-full ${
                            isOnline ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                          }`}
                        >
                          {isOnline ? "פעיל" : "לא פעיל"}
                        </span>
                        {camera.last_seen_at && (
                          <span className="text-[10px] text-gray-400 mt-1">
                            נראה לאחרונה:{" "}
                            {new Date(camera.last_seen_at).toLocaleTimeString("he-IL")}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 flex gap-3 justify-start">
                      {isOnline ? (
                        <Link href={`/admin/live/${camera.id}`}>
                          <button className="text-blue-600 text-sm hover:underline">
                            צפייה בשידור חי
                          </button>
                        </Link>
                      ) : (
                        <button className="text-gray-400 text-sm cursor-not-allowed">
                          צפייה בשידור חי
                        </button>
                      )}
                      <DeleteButton cameraId={camera.id} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

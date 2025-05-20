'use client';

import { useState } from 'react';

export default function FootagePage() {
  const [selectedCamera, setSelectedCamera] = useState('');
  const [selectedDate, setSelectedDate] = useState('');

  return (
    <div className="pt-[128px] px-4">
      <h1 className="text-2xl font-bold mb-6 text-right">הקלטות וידאו</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {/* Camera Selector */}
        <div className="flex flex-col">
          <label className="text-sm text-gray-600 mb-1">בחר מצלמה</label>
          <select
            className="rounded-md border border-gray-300 px-3 py-2 text-right"
            value={selectedCamera}
            onChange={(e) => setSelectedCamera(e.target.value)}
          >
            <option value="">בחר מצלמה</option>
            <option value="camera1">מצלמה 1</option>
            <option value="camera2">מצלמה 2</option>
            {/* Replace with dynamic camera list later */}
          </select>
        </div>

        {/* Date Picker */}
        <div className="flex flex-col">
          <label className="text-sm text-gray-600 mb-1">בחר תאריך</label>
          <input
            type="date"
            className="rounded-md border border-gray-300 px-3 py-2 text-right"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>
      </div>

      {/* Placeholder for video list */}
      <div className="text-center text-gray-400">
        {!selectedCamera || !selectedDate ? (
          'בחר מצלמה ותאריך להצגת הקלטות'
        ) : (
          'אין הקלטות זמינות לתאריך שנבחר'
        )}
      </div>
    </div>
  );
}

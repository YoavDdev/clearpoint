'use client';

import { Clock } from 'lucide-react';
import { useState } from 'react';

interface EasyTimePickerProps {
  onTimeSelect: (hour: number, minute: number) => void;
}

export default function EasyTimePicker({ onTimeSelect }: EasyTimePickerProps) {
  const [selectedHour, setSelectedHour] = useState(12);
  const [selectedMinute, setSelectedMinute] = useState(0);

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = [0, 15, 30, 45];

  const handleGo = () => {
    onTimeSelect(selectedHour, selectedMinute);
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-lg border-2 border-blue-200">
      <div className="flex items-center gap-3 mb-6">
        <Clock className="w-8 h-8 text-blue-600" />
        <h3 className="text-2xl font-bold text-slate-800">לך לשעה</h3>
      </div>

      <div className="space-y-4">
        {/* Hour Selector */}
        <div>
          <label className="text-lg font-medium text-slate-700 block mb-3">
            בחר שעה:
          </label>
          <div className="grid grid-cols-6 gap-2">
            {hours.map(hour => (
              <button
                key={hour}
                onClick={() => setSelectedHour(hour)}
                className={`
                  py-3 px-4 rounded-lg text-lg font-bold transition-all
                  ${selectedHour === hour
                    ? 'bg-blue-600 text-white shadow-lg scale-110'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }
                `}
              >
                {hour.toString().padStart(2, '0')}
              </button>
            ))}
          </div>
        </div>

        {/* Minute Selector */}
        <div>
          <label className="text-lg font-medium text-slate-700 block mb-3">
            בחר דקות:
          </label>
          <div className="grid grid-cols-4 gap-3">
            {minutes.map(minute => (
              <button
                key={minute}
                onClick={() => setSelectedMinute(minute)}
                className={`
                  py-4 px-6 rounded-lg text-xl font-bold transition-all
                  ${selectedMinute === minute
                    ? 'bg-green-600 text-white shadow-lg scale-110'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }
                `}
              >
                :{minute.toString().padStart(2, '0')}
              </button>
            ))}
          </div>
        </div>

        {/* Selected Time Display */}
        <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-6 text-center border-2 border-blue-200">
          <p className="text-slate-600 text-lg mb-2">זמן נבחר:</p>
          <p className="text-5xl font-bold text-slate-800">
            {selectedHour.toString().padStart(2, '0')}:{selectedMinute.toString().padStart(2, '0')}
          </p>
        </div>

        {/* Go Button */}
        <button
          onClick={handleGo}
          className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white text-2xl font-bold rounded-xl shadow-lg transition-all hover:scale-105"
        >
          ▶ לך לזמן זה
        </button>
      </div>
    </div>
  );
}

'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

interface SimpleDateTabsProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  retentionDays: number;
}

export default function SimpleDateTabs({ selectedDate, onDateChange, retentionDays }: SimpleDateTabsProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Generate array of available dates (today and previous days)
  const availableDates = Array.from({ length: Math.min(retentionDays, 7) }, (_, i) => {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    return date;
  });

  const getDateLabel = (date: Date, index: number) => {
    if (index === 0) return 'היום';
    if (index === 1) return 'אתמול';
    return `לפני ${index} ימים`;
  };

  const isSelected = (date: Date) => {
    return date.toDateString() === selectedDate.toDateString();
  };

  const goToPreviousWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 7);
    
    // Don't go beyond retention period
    const oldestDate = new Date(today);
    oldestDate.setDate(oldestDate.getDate() - retentionDays);
    
    if (newDate >= oldestDate) {
      onDateChange(newDate);
    }
  };

  const goToNextWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 7);
    
    // Don't go into the future
    if (newDate <= today) {
      onDateChange(newDate);
    }
  };

  const canGoPrevious = () => {
    const testDate = new Date(selectedDate);
    testDate.setDate(testDate.getDate() - 7);
    const oldestDate = new Date(today);
    oldestDate.setDate(oldestDate.getDate() - retentionDays);
    return testDate >= oldestDate;
  };

  const canGoNext = () => {
    const testDate = new Date(selectedDate);
    testDate.setDate(testDate.getDate() + 7);
    return testDate <= today;
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-white rounded-2xl p-6 border-2 border-blue-200">
      <div className="flex items-center justify-between gap-6">
        {/* Previous Week Button */}
        <button
          onClick={goToPreviousWeek}
          disabled={!canGoPrevious()}
          className="p-4 rounded-xl bg-blue-100 hover:bg-blue-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all hover:scale-110"
          title="ימים קודמים"
        >
          <ChevronRight className="w-8 h-8 text-blue-600" />
        </button>

        {/* Date Tabs - BIGGER */}
        <div className="flex-1 grid grid-cols-3 md:grid-cols-5 gap-3">
          {availableDates.slice(0, 5).map((date, index) => (
            <button
              key={date.toISOString()}
              onClick={() => onDateChange(date)}
              className={`
                px-6 py-5 rounded-xl font-bold text-lg transition-all transform
                ${isSelected(date)
                  ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-2xl scale-110'
                  : 'bg-white text-slate-700 hover:bg-blue-50 hover:scale-105 shadow-md'
                }
              `}
            >
              <div className="text-xl font-bold mb-1">{getDateLabel(date, index)}</div>
              <div className={`text-sm ${isSelected(date) ? 'opacity-90' : 'opacity-60'}`}>
                {date.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' })}
              </div>
            </button>
          ))}
        </div>

        {/* Next Week Button */}
        <button
          onClick={goToNextWeek}
          disabled={!canGoNext()}
          className="p-4 rounded-xl bg-blue-100 hover:bg-blue-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all hover:scale-110"
          title="ימים הבאים"
        >
          <ChevronLeft className="w-8 h-8 text-blue-600" />
        </button>
      </div>

      {/* Info Text - BIGGER */}
      <div className="mt-4 text-center text-base text-slate-600 bg-blue-50 py-2 rounded-lg">
        ניתן לצפות עד {retentionDays} ימים אחורה
      </div>
    </div>
  );
}

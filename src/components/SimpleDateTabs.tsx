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
    <div className="bg-gradient-to-br from-blue-50 to-white rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 border-2 border-blue-200">
      <div className="flex items-center justify-between gap-2 sm:gap-4 lg:gap-6">
        {/* Previous Week Button - Mobile Responsive */}
        <button
          onClick={goToPreviousWeek}
          disabled={!canGoPrevious()}
          className="p-2 sm:p-3 lg:p-4 rounded-lg sm:rounded-xl bg-blue-100 hover:bg-blue-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all hover:scale-110 flex-shrink-0"
          title="ימים קודמים"
        >
          <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-blue-600" />
        </button>

        {/* Date Tabs - Mobile Responsive */}
        <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
          {availableDates.slice(0, 5).map((date, index) => (
            <button
              key={date.toISOString()}
              onClick={() => onDateChange(date)}
              className={`
                px-2 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-5 rounded-lg sm:rounded-xl font-bold text-sm sm:text-base lg:text-lg transition-all transform
                ${isSelected(date)
                  ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-2xl sm:scale-110'
                  : 'bg-white text-slate-700 hover:bg-blue-50 hover:scale-105 shadow-md'
                }
              `}
            >
              <div className="text-base sm:text-lg lg:text-xl font-bold mb-0.5 sm:mb-1">{getDateLabel(date, index)}</div>
              <div className={`text-xs sm:text-sm ${isSelected(date) ? 'opacity-90' : 'opacity-60'}`}>
                {date.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' })}
              </div>
            </button>
          ))}
        </div>

        {/* Next Week Button - Mobile Responsive */}
        <button
          onClick={goToNextWeek}
          disabled={!canGoNext()}
          className="p-2 sm:p-3 lg:p-4 rounded-lg sm:rounded-xl bg-blue-100 hover:bg-blue-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all hover:scale-110 flex-shrink-0"
          title="ימים הבאים"
        >
          <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-blue-600" />
        </button>
      </div>

      {/* Info Text - Mobile Responsive */}
      <div className="mt-3 sm:mt-4 text-center text-sm sm:text-base text-slate-600 bg-blue-50 py-1.5 sm:py-2 rounded-lg">
        ניתן לצפות עד {retentionDays} ימים אחורה
      </div>
    </div>
  );
}

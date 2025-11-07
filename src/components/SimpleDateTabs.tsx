'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface SimpleDateTabsProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  retentionDays: number;
}

export default function SimpleDateTabs({ selectedDate, onDateChange, retentionDays }: SimpleDateTabsProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const datesPerPage = 5;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Generate array of available dates (today and previous days)
  const availableDates = Array.from({ length: retentionDays }, (_, i) => {
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

  // Calculate pagination
  const totalPages = Math.ceil(availableDates.length / datesPerPage);
  const startIndex = currentPage * datesPerPage;
  const endIndex = Math.min(startIndex + datesPerPage, availableDates.length);
  const currentDates = availableDates.slice(startIndex, endIndex);

  const goToPreviousPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const canGoPrevious = () => {
    return currentPage < totalPages - 1;
  };

  const canGoNext = () => {
    return currentPage > 0;
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-white rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 border-2 border-blue-200">
      {/* Mobile: Show 3 dates in a row with bigger buttons */}
      <div className="block sm:hidden">
        <div className="flex items-center justify-between gap-2 mb-2">
          {/* Previous Page Button */}
          <button
            onClick={goToPreviousPage}
            disabled={!canGoPrevious()}
            className="p-3 rounded-xl bg-blue-100 hover:bg-blue-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex-shrink-0"
            title="ימים קודמים"
          >
            <ChevronRight className="w-6 h-6 text-blue-600" />
          </button>

          {/* Date Grid - 3 dates per row on mobile */}
          <div className="flex-1 grid grid-cols-3 gap-2">
            {currentDates.slice(0, 3).map((date, index) => {
              const actualIndex = startIndex + index;
              return (
                <button
                  key={date.toISOString()}
                  onClick={() => onDateChange(date)}
                  className={`
                    px-2 py-2.5 rounded-lg font-bold text-sm transition-all transform
                    ${isSelected(date)
                      ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg scale-105'
                      : 'bg-white text-slate-700 hover:bg-blue-50 shadow-md'
                    }
                  `}
                >
                  <div className="text-sm font-bold mb-0.5">{getDateLabel(date, actualIndex)}</div>
                  <div className={`text-xs ${isSelected(date) ? 'opacity-90' : 'opacity-60'}`}>
                    {date.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' })}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Next Page Button */}
          <button
            onClick={goToNextPage}
            disabled={!canGoNext()}
            className="p-3 rounded-xl bg-blue-100 hover:bg-blue-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex-shrink-0"
            title="ימים הבאים"
          >
            <ChevronLeft className="w-6 h-6 text-blue-600" />
          </button>
        </div>

        {/* Page indicator for mobile */}
        <div className="text-center text-xs text-slate-600 bg-blue-50 py-1.5 rounded-lg">
          עמוד {currentPage + 1} מתוך {totalPages} • {retentionDays} ימים זמינים
        </div>
      </div>

      {/* Desktop: Show 5 dates in a row */}
      <div className="hidden sm:flex items-center justify-between gap-4 lg:gap-6">
        {/* Previous Page Button - Desktop */}
        <button
          onClick={goToPreviousPage}
          disabled={!canGoPrevious()}
          className="p-3 lg:p-4 rounded-xl bg-blue-100 hover:bg-blue-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all hover:scale-110 flex-shrink-0"
          title="ימים קודמים"
        >
          <ChevronRight className="w-6 h-6 lg:w-8 lg:h-8 text-blue-600" />
        </button>

        {/* Date Tabs - Desktop */}
        <div className="flex-1 grid grid-cols-3 lg:grid-cols-5 gap-3">
          {currentDates.map((date, index) => {
            // Calculate the actual index in the full array
            const actualIndex = startIndex + index;
            return (
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
                <div className="text-base sm:text-lg lg:text-xl font-bold mb-0.5 sm:mb-1">{getDateLabel(date, actualIndex)}</div>
                <div className={`text-xs sm:text-sm ${isSelected(date) ? 'opacity-90' : 'opacity-60'}`}>
                  {date.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' })}
                </div>
              </button>
            );
          })}
        </div>

        {/* Next Page Button - Desktop */}
        <button
          onClick={goToNextPage}
          disabled={!canGoNext()}
          className="p-3 lg:p-4 rounded-xl bg-blue-100 hover:bg-blue-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all hover:scale-110 flex-shrink-0"
          title="ימים הבאים"
        >
          <ChevronLeft className="w-6 h-6 lg:w-8 lg:h-8 text-blue-600" />
        </button>
      </div>

      {/* Info Text - Desktop only */}
      <div className="hidden sm:block mt-4 text-center text-base text-slate-600 bg-blue-50 py-2 rounded-lg">
        ניתן לצפות עד {retentionDays} ימים אחורה
      </div>
    </div>
  );
}

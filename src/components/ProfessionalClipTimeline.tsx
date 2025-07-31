'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, RotateCcw, Save, Trash2, Download, Maximize, Minimize, X } from 'lucide-react';
import CustomTimelineBar from './CustomTimelineBar';

type Clip = {
  url: string;
  timestamp: string;
};

type Props = {
  clips: Clip[];
  onTrimComplete?: (startTime: number, endTime: number) => void;
  onClose?: () => void;
};

export default function ProfessionalClipTimeline({ clips, onTrimComplete, onClose }: Props) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(100); // Simple 100-unit timeline
  const [selectionStart, setSelectionStart] = useState<number | null>(10);
  const [selectionEnd, setSelectionEnd] = useState<number | null>(30);
  const [isDragging, setIsDragging] = useState<'start' | 'end' | 'selection' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentClipIndex, setCurrentClipIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const dayTimelineRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartPos = useRef<{ x: number; startPos: number; endPos: number }>({ x: 0, startPos: 0, endPos: 0 });

  // Calculate 6AM-6AM timeline for day navigation
  const timestamps = clips.map((c) => new Date(c.timestamp).getTime());
  const firstClipDate = new Date(Math.min(...timestamps));
  const timelineStartDate = new Date(firstClipDate);
  timelineStartDate.setHours(6, 0, 0, 0);
  if (firstClipDate.getHours() < 6) {
    timelineStartDate.setDate(timelineStartDate.getDate() - 1);
  }
  const startTime = timelineStartDate.getTime();
  const totalDayDuration = 24 * 60 * 60; // 24 hours in seconds

  // Check if this is current day footage and calculate available percentage
  const now = new Date();
  const currentDayStart = new Date(now);
  currentDayStart.setHours(6, 0, 0, 0);
  if (now.getHours() < 6) {
    currentDayStart.setDate(currentDayStart.getDate() - 1);
  }
  
  const isCurrentDay = Math.abs(timelineStartDate.getTime() - currentDayStart.getTime()) < 1000; // Same day
  
  let availablePercentage = 1; // Default: all available for past days
  if (isCurrentDay) {
    const currentTimeMs = now.getTime();
    const dayStartMs = currentDayStart.getTime();
    const dayEndMs = dayStartMs + (24 * 60 * 60 * 1000);
    availablePercentage = Math.min(1, Math.max(0, (currentTimeMs - dayStartMs) / (dayEndMs - dayStartMs)));
  }

  const currentClip = clips[currentClipIndex];

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !currentClip) return;

    const handleLoadedMetadata = () => {
      setDuration(video.duration || 100);
      // Auto-play video when it loads
      video.play().then(() => {
        setIsPlaying(true);
      }).catch((error) => {
        console.log('Auto-play prevented by browser:', error);
      });
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('ended', handleEnded);
    };
  }, [currentClip]);

  const togglePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
    setIsPlaying(!isPlaying);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDayTime = (clipIndex: number) => {
    if (!clips[clipIndex]) return '00:00';
    const clipTime = new Date(clips[clipIndex].timestamp);
    return clipTime.toLocaleTimeString('he-IL', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDayPosition = (clipIndex: number) => {
    if (!clips[clipIndex]) return 0;
    const clipStart = new Date(clips[clipIndex].timestamp).getTime();
    const dayProgress = (clipStart - startTime) / (24 * 60 * 60 * 1000);
    return Math.max(0, Math.min(100, dayProgress * 100));
  };

  const getTimelinePosition = (time: number) => {
    return duration > 0 ? (time / duration) * 100 : 0;
  };

  const getTimeFromPosition = (percent: number) => {
    return (percent / 100) * duration;
  };

  const handleScrub = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const getDayCurrentTime = () => {
    if (!clips[currentClipIndex]) return 0;
    const clipTime = new Date(clips[currentClipIndex].timestamp).getTime();
    return Math.floor((clipTime - startTime) / 1000);
  };

  const handleDayTimelineScrub = (newTime: number) => {
    const targetTime = startTime + newTime * 1000;
    
    // Find closest clip to target time
    let bestClipIndex = 0;
    let bestScore = Infinity;
    
    clips.forEach((clip, index) => {
      const clipTime = new Date(clip.timestamp).getTime();
      const timeDiff = Math.abs(clipTime - targetTime);
      if (timeDiff < bestScore) {
        bestScore = timeDiff;
        bestClipIndex = index;
      }
    });
    
    // Switch to the closest clip
    setCurrentClipIndex(bestClipIndex);
    setCurrentTime(0);
    setSelectionStart(10);
    setSelectionEnd(30);
  };

  const toggleFullscreen = () => {
    // Don't allow fullscreen toggle on mobile - it's always fullscreen
    if (isMobile) return;
    
    // Simply toggle the fullscreen state - no browser API
    setIsFullscreen(!isFullscreen);
  };

  // Check for mobile and force fullscreen on mobile only
  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = window.innerWidth < 768; // phone breakpoint
      setIsMobile(isMobileDevice);
      if (isMobileDevice) {
        setIsFullscreen(true); // Force fullscreen on mobile
      } else {
        setIsFullscreen(false); // Normal mode on desktop/tablet
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // No need for browser fullscreen listeners since we use custom overlay

  const handleTimelineClick = (e: React.MouseEvent) => {
    if (!timelineRef.current || isDragging) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const percent = ((e.clientX - rect.left) / rect.width) * 100;
    const time = getTimeFromPosition(percent);
    
    handleScrub(time);
  };

  const handleMarkerMouseDown = (type: 'start' | 'end', e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDragging(type);
    dragStartPos.current = { x: e.clientX, startPos: 0, endPos: 0 };
  };

  const handleSelectionMouseDown = (e: React.MouseEvent) => {
    if (selectionStart === null || selectionEnd === null) return;
    e.stopPropagation();
    setIsDragging('selection');
    dragStartPos.current = {
      x: e.clientX,
      startPos: selectionStart,
      endPos: selectionEnd
    };
  };

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    // This will be handled by specific marker/selection handlers
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    // Mouse move is handled by the global useEffect listener
  };

  const handleMouseUp = () => {
    setIsDragging(null);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !timelineRef.current) return;

      const rect = timelineRef.current.getBoundingClientRect();
      const percent = ((e.clientX - rect.left) / rect.width) * 100;
      const time = getTimeFromPosition(percent);
      const clampedTime = Math.max(0, Math.min(duration, time));

      if (isDragging === 'start') {
        setSelectionStart(Math.min(clampedTime, selectionEnd || duration));
      } else if (isDragging === 'end') {
        setSelectionEnd(Math.max(clampedTime, selectionStart || 0));
      } else if (isDragging === 'selection') {
        const deltaX = e.clientX - dragStartPos.current.x;
        const deltaPercent = (deltaX / rect.width) * 100;
        const deltaTime = getTimeFromPosition(deltaPercent);
        
        const selectionDuration = dragStartPos.current.endPos - dragStartPos.current.startPos;
        const newStart = Math.max(0, Math.min(duration - selectionDuration, dragStartPos.current.startPos + deltaTime));
        
        setSelectionStart(newStart);
        setSelectionEnd(newStart + selectionDuration);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(null);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, duration]);

  const handleSaveSelectedPart = () => {
    if (selectionStart !== null && selectionEnd !== null && onTrimComplete) {
      setIsProcessing(true);
      // Simulate processing time
      setTimeout(() => {
        onTrimComplete(selectionStart, selectionEnd);
        setIsProcessing(false);
      }, 1000);
    }
  };

  const handleDeleteSelectedPart = () => {
    // Reset selection
    setSelectionStart(null);
    setSelectionEnd(null);
  };

  const resetSelection = () => {
    setSelectionStart(0);
    setSelectionEnd(duration * 0.1); // 10% of duration
  };

  if (!clips || clips.length === 0) {
    return (
      <div className="bg-gray-900 rounded-lg p-6 text-center">
        <p className="text-gray-400">לא נמצאו קליפים לעריכה</p>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`bg-gray-900 text-white rounded-lg transition-all duration-300 ${
        isFullscreen ? 'fixed inset-0 z-50 p-3 sm:p-6 lg:p-8 overflow-y-auto' : 'p-3 sm:p-4 lg:p-6'
      }`} 
      dir="rtl"
    >
      {/* Responsive Header */}
      <div className="flex items-center justify-between mb-3 sm:mb-4 lg:mb-6">
        <h2 className="text-lg sm:text-xl lg:text-2xl font-bold truncate">עריכת קליפ מקצועית</h2>
        <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
          {/* Hide fullscreen button on mobile since it's always fullscreen */}
          {!isMobile && (
            <button
              onClick={toggleFullscreen}
              className="bg-gray-800 hover:bg-gray-700 rounded-lg p-1.5 sm:p-2 transition-colors"
              title={isFullscreen ? 'יציאה ממסך מלא' : 'מסך מלא'}
            >
              {isFullscreen ? (
                <Minimize className="w-4 h-4 sm:w-5 sm:h-5" />
              ) : (
                <Maximize className="w-4 h-4 sm:w-5 sm:h-5" />
              )}
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="bg-red-600 hover:bg-red-500 rounded-lg p-1.5 sm:p-2 transition-colors"
              title="סגירת עריכת הקליפ"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          )}
          <div className="text-xs sm:text-sm text-gray-400 hidden sm:block">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        </div>
      </div>

      {/* Step 1: Day Timeline Navigation */}
      <div className="mb-6 sm:mb-8 lg:mb-10">
        <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3 sm:p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">1</div>
            <h3 className="text-sm sm:text-base font-semibold text-blue-300">בחר זמן מהיום (6:00-6:00)</h3>
          </div>
          <p className="text-xs sm:text-sm text-blue-100 mb-3">
            לחץ על הסרט כדי לבחור איזה זמן מהיום אתה רוצה לערוך
          </p>
          
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-300">זמן נבחר:</span>
            <span className="text-xs sm:text-sm text-blue-400 font-mono">{formatDayTime(currentClipIndex)}</span>
          </div>
          
          <CustomTimelineBar
            duration={totalDayDuration}
            currentTime={getDayCurrentTime()}
            cutStart={null}
            cutEnd={null}
            cuts={[]}
            onScrub={handleDayTimelineScrub}
            isCurrentDay={isCurrentDay}
            availablePercentage={availablePercentage}
          />
        </div>
      </div>

      {/* Responsive Large Video Player */}
      <div className="bg-black rounded-lg overflow-hidden mb-3 sm:mb-4 lg:mb-6 relative">
        <video
          ref={videoRef}
          src={currentClip.url}
          className="w-full object-contain"
          style={{ 
            minHeight: isFullscreen ? '40vh' : '200px',
            maxHeight: isFullscreen ? '60vh' : '50vh'
          }}
          muted
        />
        
        {/* Responsive Video Controls Overlay */}
        <div className="absolute inset-0 bg-black/20 opacity-0 hover:opacity-100 transition-opacity duration-300">
          <div className="absolute inset-0 flex items-center justify-center">
            <button
              onClick={togglePlayPause}
              className="bg-white/20 backdrop-blur-sm rounded-full p-3 sm:p-4 lg:p-6 hover:bg-white/30 transition-colors shadow-lg"
            >
              {isPlaying ? (
                <Pause className="w-6 h-6 sm:w-8 sm:h-8 lg:w-12 lg:h-12 text-white" />
              ) : (
                <Play className="w-6 h-6 sm:w-8 sm:h-8 lg:w-12 lg:h-12 text-white ml-0.5 sm:ml-1" />
              )}
            </button>
          </div>
          

        </div>
      </div>

      {/* Step 2: Clip Timeline Section */}
      <div className="space-y-4 sm:space-y-6 lg:space-y-8">
        <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">2</div>
            <h3 className="text-sm sm:text-base font-semibold text-green-300">בחר קטע לעריכה (מקסימום 15 דקות)</h3>
          </div>
          <p className="text-xs sm:text-sm text-green-100 mb-3">
            גרור את הסימנים הכחולים כדי לבחור איזה חלק מהקליפ לשמור או למחוק
          </p>
          
          {/* Time Display */}
          <div className="flex justify-between items-center text-xs sm:text-sm font-mono mb-3">
            <div className="text-blue-400">
              {formatTime(currentTime)}
            </div>
            <div className="text-gray-400">
              {selectionStart !== null && selectionEnd !== null ? (
                <span className="text-green-400">
                  נבחר: {formatTime(selectionEnd - selectionStart)} / מקס: 15:00
                </span>
              ) : (
                <span>מקסימום: 15:00</span>
              )}
            </div>
            <div className="text-gray-400">
              {formatTime(duration)}
            </div>
          </div>

        {/* Responsive Professional Timeline */}
        <div className="space-y-2 sm:space-y-3 md:space-y-4 lg:space-y-6 xl:space-y-8">
          <div 
            ref={timelineRef}
            className="relative h-8 sm:h-10 md:h-12 lg:h-16 xl:h-20 bg-gray-800 rounded-lg cursor-pointer overflow-hidden touch-manipulation"
            onClick={handleTimelineClick}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleMouseDown}
            onTouchMove={handleMouseMove}
            onTouchEnd={handleMouseUp}
          >
            {/* Timeline Background */}
            <div className="absolute inset-0 bg-gradient-to-r from-gray-700 to-gray-600"></div>
            
            {/* Time Markers */}
            <div className="absolute inset-0 flex">
              {Array.from({ length: 11 }, (_, i) => (
                <div 
                  key={i} 
                  className="flex-1 border-r border-gray-600 last:border-r-0 opacity-30"
                  style={{ left: `${i * 10}%` }}
                >
                  <div className="absolute top-0 w-px h-2 bg-gray-400"></div>
                  <div className="absolute bottom-0 w-px h-2 bg-gray-400"></div>
                </div>
              ))}
            </div>

            {/* Selection Area */}
            {selectionStart !== null && selectionEnd !== null && (
              <div
                className="absolute top-0 bottom-0 bg-blue-500/30 border-l-2 border-r-2 border-blue-500 cursor-move"
                style={{
                  left: `${getTimelinePosition(selectionStart)}%`,
                  width: `${getTimelinePosition(selectionEnd - selectionStart)}%`
                }}
                onMouseDown={handleSelectionMouseDown}
              >
                {/* Selection Start Marker */}
                <div
                  className="absolute top-0 bottom-0 -left-1 w-2 bg-blue-500 cursor-ew-resize hover:bg-blue-400 transition-colors"
                  onMouseDown={(e) => handleMarkerMouseDown('start', e)}
                >
                  <div className="absolute top-1 left-0.5 w-1 h-1 bg-white rounded-full"></div>
                  <div className="absolute bottom-1 left-0.5 w-1 h-1 bg-white rounded-full"></div>
                </div>

                {/* Selection End Marker */}
                <div
                  className="absolute top-0 bottom-0 -right-1 w-2 bg-blue-500 cursor-ew-resize hover:bg-blue-400 transition-colors"
                  onMouseDown={(e) => handleMarkerMouseDown('end', e)}
                >
                  <div className="absolute top-1 right-0.5 w-1 h-1 bg-white rounded-full"></div>
                  <div className="absolute bottom-1 right-0.5 w-1 h-1 bg-white rounded-full"></div>
                </div>
              </div>
            )}

            {/* Current Time Indicator */}
            <motion.div
              className="absolute top-0 bottom-0 w-0.5 bg-white z-20"
              style={{ left: `${getTimelinePosition(currentTime)}%` }}
              initial={false}
              animate={{ left: `${getTimelinePosition(currentTime)}%` }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            >
              <div className="absolute -top-1 -left-1 w-2 h-2 bg-white rounded-full shadow-md"></div>
              <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-white rounded-full shadow-md"></div>
            </motion.div>
          </div>


        </div>

        </div>
        
        {/* Step 3: Action Buttons */}
        <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="bg-purple-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">3</div>
            <h3 className="text-sm sm:text-base font-semibold text-purple-300">שמור או מחק את הקטע</h3>
          </div>
          
          <div className="flex flex-col sm:flex-row justify-center gap-2 sm:gap-3 lg:gap-4">
            <button
              onClick={resetSelection}
              className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-sm sm:text-base"
              title="איפוס הבחירה"
            >
              <RotateCcw className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>איפוס</span>
            </button>
            
            <button
              onClick={handleSaveSelectedPart}
              disabled={isProcessing || selectionStart === null || selectionEnd === null}
              className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors text-sm sm:text-base"
              title="שמירת הקטע הנבחר כקובץ וידאו"
            >
              {isProcessing ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-white border-t-transparent rounded-full"
                />
              ) : (
                <Download className="w-3 h-3 sm:w-4 sm:h-4" />
              )}
              <span className="hidden sm:inline">{isProcessing ? 'מעבד...' : 'שמור חלק נבחר'}</span>
              <span className="sm:hidden">{isProcessing ? 'מעבד...' : 'שמירה'}</span>
            </button>
            
            <button
              onClick={handleDeleteSelectedPart}
              disabled={isProcessing || selectionStart === null || selectionEnd === null}
              className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-red-600 hover:bg-red-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors text-sm sm:text-base"
              title="מחיקת הקטע הנבחר מההקלטה"
            >
              <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">מחק חלק נבחר</span>
              <span className="sm:hidden">מחיקה</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

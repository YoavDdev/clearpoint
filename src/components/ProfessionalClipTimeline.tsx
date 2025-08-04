'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, RotateCcw, Save, Trash2, Download, Maximize, Minimize, X, SkipBack, SkipForward, Rewind, FastForward, Volume2, VolumeX, Square, ChevronDown } from 'lucide-react';
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
  const [currentTime, setCurrentTime] = useState(300); // Start at 5 minutes (300 seconds)
  const [duration, setDuration] = useState(900); // 15 minutes = 900 seconds
  const [selectionStart, setSelectionStart] = useState<number | null>(400); // Around 6.5 minutes
  const [selectionEnd, setSelectionEnd] = useState<number | null>(500); // Around 8.5 minutes
  const [isDragging, setIsDragging] = useState<'start' | 'end' | 'selection' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentClipIndex, setCurrentClipIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isSpeedControlOpen, setIsSpeedControlOpen] = useState(false);
  
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
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const stopVideo = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  };

  const skipBackward = () => {
    if (videoRef.current) {
      const newTime = Math.max(0, videoRef.current.currentTime - 10);
      videoRef.current.currentTime = newTime;
      console.log('Skip backward to:', newTime); // Debug log
    }
  };

  const skipForward = () => {
    if (videoRef.current) {
      const duration = videoRef.current.duration || 0;
      videoRef.current.currentTime = Math.min(duration, videoRef.current.currentTime + 10);
    }
  };

  const changePlaybackRate = (rate: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
      setPlaybackRate(rate);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
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
    setCurrentTime(300); // Start at 5 minutes into the new clip
    setSelectionStart(400); // Center selection around 6.5 minutes
    setSelectionEnd(500); // Center selection around 8.5 minutes
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

  // Auto-play next clip when current clip ends
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleVideoEnd = () => {
      // Find next available clip
      const nextClipIndex = currentClipIndex + 1;
      if (nextClipIndex < clips.length && clips[nextClipIndex]?.url) {
        console.log('Auto-playing next clip:', nextClipIndex);
        setCurrentClipIndex(nextClipIndex);
        // Video will auto-play when the new clip loads due to existing logic
      } else {
        console.log('No more clips available for auto-play');
        setIsPlaying(false);
      }
    };

    video.addEventListener('ended', handleVideoEnd);
    
    return () => {
      video.removeEventListener('ended', handleVideoEnd);
    };
  }, [currentClipIndex, clips]);

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
      className="fixed inset-0 z-50 bg-gray-900 text-white p-3 sm:p-6 lg:p-8 overflow-y-auto"
      dir="rtl"
    >
      {/* Responsive Header */}
      <div className="flex items-center justify-between mb-3 sm:mb-4 lg:mb-6">
        <h2 className="text-lg sm:text-xl lg:text-2xl font-bold truncate">עריכת קליפ </h2>
        <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">

          {onClose && (
            <button
              onClick={onClose}
              className="bg-red-600 hover:bg-red-500 rounded-lg p-1.5 sm:p-2 transition-colors"
              title="סגירת עריכת הקליפ"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          )}

        </div>
      </div>



      {/* Unified Video & Timeline Control View */}
      <div className="bg-gray-900/40 border border-gray-600/50 rounded-lg p-4 mb-6">
        
        {/* Main Layout: Video Left, Controls Right */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
          
          {/* Left Side: Video Player */}
          <div className="bg-black rounded-lg overflow-hidden relative flex items-center justify-center" style={{ minHeight: '250px', maxHeight: '70vh' }}>
            <video
              ref={videoRef}
              src={currentClip?.url || ''}
              className="w-full h-auto object-contain"
              style={{ 
                maxHeight: '70vh',
                minHeight: '250px',
                backgroundColor: 'black'
              }}
              muted
              onError={(e) => {
                console.warn('Video loading error for clip:', currentClip?.url);
                // Optionally show a placeholder or error message
              }}
              onLoadStart={() => {
                // Reset any previous errors
              }}
            />
            

            

          </div>
          
          {/* Right Side: All Controls */}
          <div className="space-y-4">
            
            {/* Step 1: Day Timeline - Choose Time of Day */}
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">1</div>
                <h4 className="text-sm font-semibold text-blue-300">בחר זמן מהיום (06:00-06:00)</h4>
              </div>

              
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-300">זמן נבחר:</span>
                <div className="relative">
                  <select
                    value={currentClipIndex}
                    onChange={(e) => {
                      const selectedClipIndex = parseInt(e.target.value);
                      if (selectedClipIndex >= 0 && selectedClipIndex < clips.length && clips[selectedClipIndex]?.url) {
                        // Jump to the start of the selected 15-minute clip
                        handleDayTimelineScrub(selectedClipIndex * 15 * 60); // Convert to seconds
                      }
                    }}
                    className="text-xs text-blue-400 font-mono bg-gray-800 border border-blue-400/30 rounded px-2 py-1 hover:border-blue-400 focus:border-blue-400 focus:outline-none cursor-pointer appearance-none pr-6"
                    title="בחר זמן מהיום"
                  >
                    {clips.map((clip, index) => {
                      // Only show clips that have valid URLs
                      if (!clip?.url) {
                        return null;
                      }
                      
                      // Use the actual timestamp from the clip data
                      let timeString = clip.timestamp;
                      
                      // If timestamp is in a different format, parse and format it
                      if (clip.timestamp && clip.timestamp.includes('T')) {
                        // Handle ISO timestamp format (e.g., "2025-08-02T21:04:00")
                        const date = new Date(clip.timestamp);
                        const hours = date.getHours();
                        const minutes = date.getMinutes();
                        timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                      } else if (clip.timestamp && clip.timestamp.includes(':')) {
                        // Handle time format (e.g., "21:04" or "21:04:00")
                        const timeParts = clip.timestamp.split(':');
                        const hours = parseInt(timeParts[0]);
                        const minutes = parseInt(timeParts[1]);
                        timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                      }
                      
                      return (
                        <option key={index} value={index} className="bg-gray-800 text-blue-400">
                          {timeString}
                        </option>
                      );
                    })}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                    <svg className="w-3 h-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
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

            {/* Enhanced Video Control Panel - Between Day Timeline and Clip Selection */}
            <div className="bg-gradient-to-br from-gray-800/60 to-gray-900/80 border border-blue-500/20 rounded-xl p-4 shadow-lg backdrop-blur-sm">
              
              {/* Enhanced Main Video Controls with Sound Button */}
              <div className="flex items-center justify-center gap-1.5 sm:gap-2 mb-4">
                {/* Skip Backward */}
                <button
                  onClick={skipBackward}
                  className="group bg-gradient-to-b from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 rounded-xl p-2 sm:p-2.5 transition-all duration-200 shadow-md hover:shadow-lg border border-gray-600/50 hover:border-gray-500/70"
                  title="חזור 10 שניות"
                >
                  <SkipBack className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-200 group-hover:text-white transition-colors" />
                </button>
                
                {/* Rewind - Backward */}
                <button
                  onClick={skipBackward}
                  className="group bg-gradient-to-b from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 rounded-xl p-2 sm:p-2.5 transition-all duration-200 shadow-md hover:shadow-lg border border-gray-600/50 hover:border-gray-500/70"
                  title="חזור אחורה"
                >
                  <Rewind className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-200 group-hover:text-white transition-colors" />
                </button>
                
                {/* Stop */}
                <button
                  onClick={stopVideo}
                  className="group bg-gradient-to-b from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 rounded-xl p-2 sm:p-2.5 transition-all duration-200 shadow-md hover:shadow-lg border border-gray-500/50 hover:border-gray-400/70"
                  title="עצור"
                >
                  <Square className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-200 group-hover:text-white transition-colors" />
                </button>
                
                {/* Play/Pause - Enhanced Primary Button */}
                <button
                  onClick={togglePlayPause}
                  className="group relative bg-gradient-to-b from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 rounded-xl p-3 sm:p-3.5 transition-all duration-200 shadow-lg hover:shadow-xl border border-blue-500/50 hover:border-blue-400/70 ring-2 ring-blue-500/20 hover:ring-blue-400/30"
                  title={isPlaying ? 'השהה' : 'נגן'}
                >
                  <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  {isPlaying ? (
                    <Pause className="w-4 h-4 sm:w-5 sm:h-5 text-white relative z-10" />
                  ) : (
                    <Play className="w-4 h-4 sm:w-5 sm:h-5 text-white ml-0.5 relative z-10" />
                  )}
                </button>
                
                {/* Fast Forward */}
                <button
                  onClick={() => changePlaybackRate(2)}
                  className={`group rounded-xl p-2 sm:p-2.5 transition-all duration-200 shadow-md hover:shadow-lg border ${
                    playbackRate === 2 
                      ? 'bg-gradient-to-b from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 border-blue-500/50 hover:border-blue-400/70' 
                      : 'bg-gradient-to-b from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 border-gray-600/50 hover:border-gray-500/70'
                  }`}
                  title="הזז קדימה"
                >
                  <FastForward className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-colors ${
                    playbackRate === 2 ? 'text-white' : 'text-gray-200 group-hover:text-white'
                  }`} />
                </button>
                
                {/* Skip Forward */}
                <button
                  onClick={skipForward}
                  className="group bg-gradient-to-b from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 rounded-xl p-2 sm:p-2.5 transition-all duration-200 shadow-md hover:shadow-lg border border-gray-600/50 hover:border-gray-500/70"
                  title="קדימה 10 שניות"
                >
                  <SkipForward className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-200 group-hover:text-white transition-colors" />
                </button>
                
                {/* Compact Sound Toggle Button */}
                <button
                  onClick={toggleMute}
                  className={`group rounded-xl p-2 sm:p-2.5 transition-all duration-200 shadow-md hover:shadow-lg border ${
                    isMuted 
                      ? 'bg-gradient-to-b from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 border-red-500/50 hover:border-red-400/70' 
                      : 'bg-gradient-to-b from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 border-green-500/50 hover:border-green-400/70'
                  }`}
                  title={isMuted ? 'הפעל קול' : 'השתק'}
                >
                  {isMuted ? (
                    <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                  )}
                </button>
              </div>
              
              {/* Collapsible Speed Controls */}
              <div className="bg-gray-900/40 rounded-lg border border-gray-600/30">
                {/* Speed Control Header - Always Visible */}
                <button
                  onClick={() => setIsSpeedControlOpen(!isSpeedControlOpen)}
                  className="w-full flex items-center justify-between p-1.5 sm:p-3 hover:bg-gray-800/30 transition-colors rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                    <span className="text-xs font-medium text-gray-300">מהירות</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="bg-gradient-to-r from-blue-600/20 to-blue-500/20 border border-blue-500/30 rounded-lg px-2 py-1">
                      <span className="text-xs font-mono text-blue-300 font-semibold">
                        {playbackRate}x
                      </span>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                      isSpeedControlOpen ? 'rotate-180' : ''
                    }`} />
                  </div>
                </button>
                
                {/* Collapsible Speed Control Content */}
                {isSpeedControlOpen && (
                  <div className="px-3 pb-3 space-y-3 border-t border-gray-600/20">
                    {/* Speed Preset Buttons - Responsive Grid */}
                    <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-4 xl:grid-cols-6 gap-1 pt-3">
                      {[0.1, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4, 8].map((rate) => (
                        <button
                          key={rate}
                          onClick={() => changePlaybackRate(rate)}
                          className={`group relative px-2 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                            playbackRate === rate
                              ? 'bg-gradient-to-b from-blue-500 to-blue-600 text-white shadow-md border border-blue-400/50'
                              : 'bg-gradient-to-b from-gray-700 to-gray-800 text-gray-300 hover:from-gray-600 hover:to-gray-700 hover:text-white border border-gray-600/50 hover:border-gray-500/70'
                          }`}
                          title={`מהירות ${rate}x`}
                        >
                          <div className={`absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity ${
                            playbackRate === rate ? 'bg-white/10' : 'bg-white/5'
                          }`}></div>
                          <span className="relative z-10">{rate}x</span>
                        </button>
                      ))}
                    </div>
                    
                    {/* Fine Speed Control Slider - Enhanced */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">בקרה מדויקת</span>
                        <div className="flex gap-1 text-xs text-gray-500">
                          <span>0.1x</span>
                          <span>•</span>
                          <span>8x</span>
                        </div>
                      </div>
                      <div className="relative">
                        <input
                          type="range"
                          min="0.1"
                          max="8"
                          step="0.1"
                          value={playbackRate}
                          onChange={(e) => changePlaybackRate(parseFloat(e.target.value))}
                          className="w-full h-2 bg-gradient-to-r from-gray-700 to-gray-600 rounded-lg appearance-none cursor-pointer slider-thumb"
                          style={{
                            background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((playbackRate - 0.1) / (8 - 0.1)) * 100}%, #374151 ${((playbackRate - 0.1) / (8 - 0.1)) * 100}%, #374151 100%)`
                          }}
                          title={`מהירות: ${playbackRate}x`}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Step 2: Clip Selection */}
            <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="bg-green-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">2</div>
                <h4 className="text-sm font-semibold text-green-300">בחר קטע לגזירה</h4>
              </div>


              {/* Clip Timeline */}
              <div 
                ref={timelineRef}
                className="relative h-12 bg-gray-800 rounded-lg cursor-pointer overflow-hidden mb-3"
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
              
              {/* Action Buttons */}
              <div className="flex justify-center gap-2">
                <button
                  onClick={resetSelection}
                  className="flex items-center gap-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-sm"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>איפוס</span>
                </button>
                
                <button
                  onClick={handleSaveSelectedPart}
                  disabled={isProcessing || selectionStart === null || selectionEnd === null}
                  className="flex items-center gap-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors font-semibold text-sm"
                >
                  {isProcessing ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-3 h-3 border-2 border-white border-t-transparent rounded-full"
                    />
                  ) : (
                    <Download className="w-3 h-3" />
                  )}
                  <span>{isProcessing ? 'מעבד...' : 'שמור'}</span>
                </button>
                
                <button
                  onClick={handleDeleteSelectedPart}
                  disabled={isProcessing || selectionStart === null || selectionEnd === null}
                  className="flex items-center gap-1 px-3 py-2 bg-red-600 hover:bg-red-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors text-sm"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>מחק</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

'use client';

import { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Scissors, Loader2, VideoOff, Volume2, VolumeX } from 'lucide-react';

interface VodClip {
  id: string;
  timestamp: string;
  duration: number;
  url?: string;
  object_key?: string | null;
  thumbnail_url?: string;
}

interface SimpleCameraPlayerProps {
  cameraName: string;
  clips: VodClip[];
  onCutClip?: () => void;
  initialSeekTime?: number | null; // seconds since midnight to auto-seek on load
}

export default function SimpleCameraPlayer({ cameraName, clips, onCutClip, initialSeekTime }: SimpleCameraPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentClipIndex, setCurrentClipIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  
  // Audio controls
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  
  // Playback speed control
  const [currentSpeed, setCurrentSpeed] = useState(1);
  
  // Clip cutting state - Cassette Recorder Style
  const [isCuttingMode, setIsCuttingMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [trimStart, setTrimStart] = useState<number | null>(null);
  const [trimEnd, setTrimEnd] = useState<number | null>(null);
  
  // Mouse idle detection for overlay
  const [showOverlay, setShowOverlay] = useState(true);
  const [isMouseOverVideo, setIsMouseOverVideo] = useState(false);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  const signedUrlCacheRef = useRef<Map<string, { url: string; expiresAtMs: number }>>(new Map());
  const loadRequestIdRef = useRef(0);
  const seekOffsetRef = useRef<number | null>(null);

  const currentClip = clips[currentClipIndex];

  // Helper: get seconds since midnight from ISO timestamp
  const getSecondsFromMidnight = (timestamp: string): number => {
    const date = new Date(timestamp);
    return date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds();
  };

  // Format seconds since midnight as HH:MM
  const formatTimeOfDay = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600) % 24;
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  const resolveClipUrl = async (clip: VodClip): Promise<string> => {
    if (clip.url && !clip.object_key) {
      return clip.url;
    }

    const key = clip.object_key || undefined;
    if (!key) {
      if (clip.url) return clip.url;
      throw new Error('Missing clip url/object_key');
    }

    const cached = signedUrlCacheRef.current.get(key);
    const now = Date.now();
    if (cached && cached.expiresAtMs > now + 30_000) {
      return cached.url;
    }

    const res = await fetch('/api/vod/signed-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ objectKey: key }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Failed to get signed url (${res.status}) ${text}`);
    }

    const payload = await res.json();
    const url = payload?.url as string | undefined;
    if (!url) throw new Error('Signed url response missing url');

    // Cache slightly less than expiry for safety.
    signedUrlCacheRef.current.set(key, { url, expiresAtMs: now + 55 * 60 * 1000 });
    return url;
  };

  const prefetchNextClip = async () => {
    const next = clips[currentClipIndex + 1];
    if (!next?.object_key) return;
    try {
      await resolveClipUrl(next);
    } catch {
      // Ignore prefetch errors; playback will request again on demand.
    }
  };
  
  // Calculate current playback position as seconds since midnight
  const getDayPosition = (): number => {
    if (!currentClip) return 0;
    return getSecondsFromMidnight(currentClip.timestamp) + currentTime;
  };

  // Timeline range: from first clip start (rounded down to hour) to last clip end (rounded up to hour)
  const timelineStart = clips.length > 0
    ? Math.floor(getSecondsFromMidnight(clips[0].timestamp) / 3600) * 3600
    : 0;
  const timelineEnd = clips.length > 0
    ? Math.min(86400, Math.ceil((getSecondsFromMidnight(clips[clips.length - 1].timestamp) + (clips[clips.length - 1].duration || 900)) / 3600) * 3600)
    : 86400;
  const timelineRange = Math.max(timelineEnd - timelineStart, 3600);

  // Build recording coverage segments for timeline visualization
  const coverageSegments = clips.map((clip, idx) => ({
    start: getSecondsFromMidnight(clip.timestamp),
    end: getSecondsFromMidnight(clip.timestamp) + (clip.duration || 900),
    index: idx,
  }));

  // Seek to a specific time of day (seconds since midnight)
  const seekToTimeOfDay = (targetSeconds: number) => {
    for (let i = 0; i < clips.length; i++) {
      const clipStart = getSecondsFromMidnight(clips[i].timestamp);
      const clipEnd = clipStart + (clips[i].duration || 900);
      if (targetSeconds >= clipStart && targetSeconds < clipEnd) {
        if (i !== currentClipIndex) {
          seekOffsetRef.current = targetSeconds - clipStart;
          setCurrentClipIndex(i);
        } else if (videoRef.current) {
          videoRef.current.currentTime = targetSeconds - clipStart;
        }
        return;
      }
    }
    // Not in any clip - find nearest clip after target
    for (let i = 0; i < clips.length; i++) {
      const clipStart = getSecondsFromMidnight(clips[i].timestamp);
      if (clipStart >= targetSeconds) {
        seekOffsetRef.current = 0;
        setCurrentClipIndex(i);
        return;
      }
    }
    // Target is after all clips - go to last clip
    if (clips.length > 0) {
      setCurrentClipIndex(clips.length - 1);
    }
  };

  // Generate hour labels for the timeline
  const getHourLabels = (): number[] => {
    const labels: number[] = [];
    for (let h = timelineStart; h <= timelineEnd; h += 3600) {
      labels.push(h);
    }
    return labels;
  };

  // Update video when clip changes
  useEffect(() => {
    if (videoRef.current && currentClip) {
      const requestId = ++loadRequestIdRef.current;
      setIsLoading(true);

      (async () => {
        try {
          const src = await resolveClipUrl(currentClip);
          if (loadRequestIdRef.current !== requestId) return;
          if (!videoRef.current) return;

          videoRef.current.src = src;
          videoRef.current.load();

          // Apply audio settings
          videoRef.current.muted = isMuted;
          videoRef.current.volume = volume;
        } catch (err) {
          console.error('Failed to load clip url:', err);
          if (loadRequestIdRef.current !== requestId) return;
          setIsLoading(false);
        }
      })();
      
      // Apply audio settings
      // (audio settings applied when src is set)
      
      const handleLoadedData = () => {
        setIsLoading(false);
        if (seekOffsetRef.current !== null && videoRef.current) {
          videoRef.current.currentTime = seekOffsetRef.current;
          seekOffsetRef.current = null;
        }
        if (isPlaying && videoRef.current) {
          videoRef.current.play();
        }
      };
      
      videoRef.current.addEventListener('loadeddata', handleLoadedData);
      
      return () => {
        videoRef.current?.removeEventListener('loadeddata', handleLoadedData);
      };
    }
  }, [currentClipIndex, clips.length, isMuted, volume]);

  // Auto-seek to initialSeekTime when clips load
  const initialSeekDoneRef = useRef(false);
  useEffect(() => {
    if (initialSeekTime != null && clips.length > 0 && !initialSeekDoneRef.current) {
      initialSeekDoneRef.current = true;
      seekToTimeOfDay(initialSeekTime);
    }
  }, [clips.length, initialSeekTime]);

  // Prefetch next clip signed url
  useEffect(() => {
    prefetchNextClip();
  }, [currentClipIndex, clips.length]);

  // Handle video events
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleDurationChange = () => setDuration(video.duration);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      // Auto-play next clip
      if (currentClipIndex < clips.length - 1) {
        setCurrentClipIndex(currentClipIndex + 1);
      } else {
        setIsPlaying(false);
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
    };
  }, [currentClipIndex, clips.length]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Handle mouse entering video area
  const handleMouseEnter = () => {
    setIsMouseOverVideo(true);
    setShowOverlay(true);
  };

  // Handle mouse leaving video area
  const handleMouseLeave = () => {
    setIsMouseOverVideo(false);
    if (isPlaying) {
      setShowOverlay(false);
    }
    // Clear timer when mouse leaves
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }
  };

  // Handle mouse movement - show overlay and start idle timer
  const handleMouseMove = () => {
    // Only show overlay if we're actually over the video
    if (isMouseOverVideo) {
      setShowOverlay(true);
      
      // Clear existing timer
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
      
      // Set new timer to hide overlay after 1 second of no movement (only when playing)
      if (isPlaying) {
        idleTimerRef.current = setTimeout(() => {
          setShowOverlay(false);
        }, 1000);
      }
    }
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
    };
  }, []);

  // Show overlay when video is paused, hide when playing (unless mouse is active)
  useEffect(() => {
    if (!isPlaying) {
      // Always show when paused
      setShowOverlay(true);
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
    } else {
      // When playing, only hide if mouse is not over video
      if (!isMouseOverVideo) {
        setShowOverlay(false);
      }
    }
  }, [isPlaying, isMouseOverVideo]);

  const setPlaybackSpeed = (speed: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
      setCurrentSpeed(speed);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      setVolume(newVolume);
      if (newVolume === 0) {
        setIsMuted(true);
        videoRef.current.muted = true;
      } else if (isMuted) {
        setIsMuted(false);
        videoRef.current.muted = false;
      }
    }
  };

  const previousClip = () => {
    if (currentClipIndex > 0) {
      setCurrentClipIndex(currentClipIndex - 1);
    }
  };

  const nextClip = () => {
    if (currentClipIndex < clips.length - 1) {
      setCurrentClipIndex(currentClipIndex + 1);
    }
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getClipTime = () => {
    if (!currentClip) return '';
    const clipDate = new Date(currentClip.timestamp);
    return clipDate.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
  };

  // Simplified Recording Functions
  const startRecording = () => {
    // Ensure video is playing when starting recording
    if (videoRef.current && !isPlaying) {
      videoRef.current.play();
      setIsPlaying(true);
    }
    
    const currentPos = getDayPosition();
    setIsCuttingMode(true);
    setTrimStart(currentPos);
    setIsRecording(true);
    setTrimEnd(null);
  };

  const stopRecording = () => {
    const currentPos = getDayPosition();
    setTrimEnd(currentPos);
    setIsRecording(false);
  };

  const cancelCutting = () => {
    setIsCuttingMode(false);
    setIsRecording(false);
    setTrimStart(null);
    setTrimEnd(null);
  };

  const saveClip = async () => {
    if (trimStart === null || trimEnd === null) {
      alert('יש להקליט קליפ לפני שמירה');
      return;
    }

    const clipDuration = trimEnd - trimStart;
    alert(`שמירת קליפ: ${formatTime(clipDuration)}\nמ-${formatTime(trimStart)} עד-${formatTime(trimEnd)}\n\nתכונה זו תופעל בקרוב!`);
    
    // TODO: Implement actual clip saving/downloading
    cancelCutting();
  };

  if (clips.length === 0) {
    return (
      <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-xl p-8 sm:p-12 text-center border-2 border-slate-200">
        <div className="w-20 h-20 sm:w-24 sm:h-24 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
          <VideoOff className="w-10 h-10 sm:w-12 sm:h-12 text-slate-500" />
        </div>
        <h3 className="text-xl sm:text-2xl font-bold text-slate-800 mb-2 sm:mb-3">
          אין הקלטות זמינות
        </h3>
        <p className="text-base sm:text-lg text-slate-700 mb-2">
          למצלמה <span className="font-bold">{cameraName}</span>
        </p>
        <p className="text-sm sm:text-base text-slate-500 mt-3 sm:mt-4">
          💡 נסה לבחור תאריך אחר או בדוק שהמצלמה הייתה פעילה באותו יום
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl overflow-hidden border border-slate-200 shadow-lg">
      {/* Video Player */}
      <div className="relative bg-black aspect-video group">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
        )}
        
        <video
          ref={videoRef}
          className="w-full h-full object-contain"
          poster={currentClip?.thumbnail_url}
        />
        
        {/* Clickable Play/Pause Overlay */}
        <div 
          onClick={togglePlay}
          onMouseMove={handleMouseMove}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className={`absolute inset-0 flex items-center justify-center z-20 transition-all duration-300 ${
            showOverlay ? 'cursor-pointer' : 'cursor-none'
          }`}
        >
          {/* Play/Pause Button - Shows when paused or when mouse moves while playing */}
          <div className={`
            transition-all duration-300 pointer-events-none
            ${showOverlay ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}
          `}>
            <button
              className="p-6 rounded-full bg-white/20 backdrop-blur-md hover:bg-white/30 transition-all transform hover:scale-110 shadow-2xl border-2 border-white/30 pointer-events-auto"
              onClick={(e) => {
                e.stopPropagation(); // Prevent double-trigger
                togglePlay();
              }}
            >
              {isPlaying ? (
                <Pause className="w-12 h-12 sm:w-16 sm:h-16 text-white drop-shadow-lg" />
              ) : (
                <Play className="w-12 h-12 sm:w-16 sm:h-16 text-white drop-shadow-lg" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Controls - Mobile Responsive */}
      <div className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4 bg-gradient-to-b from-white to-slate-50">
        {/* 24-Hour Timeline */}
        <div className="space-y-1">
          {/* Header: current time + clip info */}
          <div className="flex justify-between items-center text-xs sm:text-sm text-slate-700 font-medium mb-1">
            <span className={`text-lg sm:text-xl font-bold tabular-nums ${isRecording ? 'text-red-600' : 'text-blue-600'}`}>
              {formatTimeOfDay(getDayPosition())}
            </span>
            <span className="text-slate-500">
              קליפ {currentClipIndex + 1} מתוך {clips.length}
            </span>
          </div>
          
          {/* Timeline Bar - Click anywhere to seek */}
          <div 
            className="relative h-10 sm:h-12 bg-slate-100 rounded-lg cursor-pointer overflow-hidden border border-slate-200"
            dir="ltr"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const clickX = e.clientX - rect.left;
              const ratio = clickX / rect.width;
              const targetTime = timelineStart + ratio * timelineRange;
              seekToTimeOfDay(targetTime);
            }}
          >
            {/* Coverage segments (blue bars for recorded periods) */}
            {coverageSegments.map((seg, i) => {
              const left = ((seg.start - timelineStart) / timelineRange) * 100;
              const width = ((seg.end - seg.start) / timelineRange) * 100;
              const isActive = i === currentClipIndex;
              return (
                <div
                  key={i}
                  className={`absolute top-1 bottom-1 rounded-sm transition-colors ${
                    isActive 
                      ? 'bg-blue-500 z-10' 
                      : 'bg-blue-200 hover:bg-blue-300'
                  }`}
                  style={{ left: `${left}%`, width: `${Math.max(width, 0.3)}%` }}
                  title={`${formatTimeOfDay(seg.start)} - ${formatTimeOfDay(seg.end)}`}
                />
              );
            })}
            
            {/* Playback position marker */}
            {currentClip && (
              <div
                className="absolute top-0 bottom-0 z-20 pointer-events-none"
                style={{ 
                  left: `${Math.min(Math.max(((getDayPosition() - timelineStart) / timelineRange) * 100, 0), 100)}%` 
                }}
              >
                <div className="absolute top-0 bottom-0 w-0.5 bg-red-500 -translate-x-1/2" />
                <div className="absolute -top-0.5 w-2.5 h-2.5 bg-red-500 rounded-full -translate-x-1/2 shadow" />
                <div className="absolute -bottom-0.5 w-2.5 h-2.5 bg-red-500 rounded-full -translate-x-1/2 shadow" />
              </div>
            )}
          </div>
          
          {/* Hour labels */}
          <div className="relative h-5" dir="ltr">
            {getHourLabels().map((h) => {
              const leftPercent = ((h - timelineStart) / timelineRange) * 100;
              return (
                <span
                  key={h}
                  className="absolute text-[10px] sm:text-xs text-slate-400 font-medium -translate-x-1/2 select-none"
                  style={{ left: `${leftPercent}%` }}
                >
                  {formatTimeOfDay(h)}
                </span>
              );
            })}
          </div>

          {/* Clip progress bar (within current clip) */}
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="tabular-nums w-10 text-right">{formatTime(currentTime)}</span>
            <div 
              className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden cursor-pointer" 
              dir="ltr"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const ratio = (e.clientX - rect.left) / rect.width;
                if (videoRef.current && duration > 0) {
                  videoRef.current.currentTime = ratio * duration;
                }
              }}
            >
              <div 
                className="h-full bg-blue-400 rounded-full transition-all"
                style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
              />
            </div>
            <span className="tabular-nums w-10">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Playback Controls with Integrated REC Button - Mobile Responsive */}
        <div className="flex flex-col sm:flex-row items-center justify-center pt-2 border-t-2 border-slate-200 gap-2 sm:gap-0">
          <div className="flex items-center gap-1 sm:gap-2 flex-wrap justify-center">
            {/* Slower Speed Buttons - Mobile: Hide on very small screens */}
            <div className="hidden md:flex items-center gap-1">
              <button
                onClick={() => setPlaybackSpeed(0.25)}
                className={`px-2 py-1 rounded-lg text-xs font-bold transition-all hover:scale-110 ${
                  currentSpeed === 0.25 
                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
                title="מהירות איטית מאוד"
              >
                0.25x
              </button>
              <button
                onClick={() => setPlaybackSpeed(0.5)}
                className={`px-2 py-1 rounded-lg text-xs font-bold transition-all hover:scale-110 ${
                  currentSpeed === 0.5 
                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
                title="מהירות איטית"
              >
                0.5x
              </button>
            </div>

            {/* Main Controls - Mobile Responsive */}
            <button
              onClick={previousClip}
              disabled={currentClipIndex === 0}
              className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all hover:scale-110"
              title="קליפ קודם"
            >
              <SkipBack className="w-4 h-4 sm:w-5 sm:h-5 text-slate-700" />
            </button>

            <button
              onClick={togglePlay}
              className="p-3 sm:p-4 rounded-lg sm:rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:scale-110"
              title={isPlaying ? 'עצור' : 'נגן'}
            >
              {isPlaying ? (
                <Pause className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
              ) : (
                <Play className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
              )}
            </button>

            <button
              onClick={nextClip}
              disabled={currentClipIndex === clips.length - 1}
              className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all hover:scale-110"
              title="קליפ הבא"
            >
              <SkipForward className="w-4 h-4 sm:w-5 sm:h-5 text-slate-700" />
            </button>

            {/* Faster Speed Buttons - Mobile: Hide on very small screens */}
            <div className="hidden md:flex items-center gap-1">
              <button
                onClick={() => setPlaybackSpeed(1)}
                className={`px-2 py-1 rounded-lg text-xs font-bold transition-all hover:scale-110 ${
                  currentSpeed === 1 
                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
                title="מהירות רגילה"
              >
                1x
              </button>
              <button
                onClick={() => setPlaybackSpeed(2)}
                className={`px-2 py-1 rounded-lg text-xs font-bold transition-all hover:scale-110 ${
                  currentSpeed === 2 
                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
                title="מהירות כפולה"
              >
                2x
              </button>
              <button
                onClick={() => setPlaybackSpeed(5)}
                className={`px-2 py-1 rounded-lg text-xs font-bold transition-all hover:scale-110 ${
                  currentSpeed === 5 
                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
                title="מהירות X5"
              >
                5x
              </button>
              <button
                onClick={() => setPlaybackSpeed(10)}
                className={`px-2 py-1 rounded-lg text-xs font-bold transition-all hover:scale-110 ${
                  currentSpeed === 10 
                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
                title="מהירות X10"
              >
                10x
              </button>
            </div>

            {/* REC Button - Simplified Single Click */}
            {onCutClip && (
              <>
                {!isRecording ? (
                  <button
                    onClick={startRecording}
                    className="p-4 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 transition-all shadow-lg hover:scale-110 ml-2"
                    title="REC - התחל הקלטה"
                  >
                    <div className="w-6 h-6 bg-white rounded-full"></div>
                  </button>
                ) : (
                  <button
                    onClick={stopRecording}
                    className="p-4 rounded-xl bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 transition-all shadow-lg hover:scale-110 ml-2 animate-pulse"
                    title="STOP - עצור הקלטה"
                  >
                    <div className="w-6 h-6 bg-white"></div>
                  </button>
                )}
              </>
            )}

            {/* Audio Controls - Mobile Responsive */}
            <div className="flex items-center gap-2 sm:ml-3 sm:pl-3 sm:border-l-2 border-slate-200">
              {/* Mute Button - Mobile Responsive */}
              <button
                onClick={toggleMute}
                className={`p-2 sm:p-3 rounded-lg sm:rounded-xl transition-all hover:scale-110 ${
                  isMuted 
                    ? 'bg-red-100 hover:bg-red-200 text-red-700' 
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
                title={isMuted ? 'הפעל קול' : 'השתק'}
              >
                {isMuted ? (
                  <VolumeX className="w-4 h-4 sm:w-5 sm:h-5" />
                ) : (
                  <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />
                )}
              </button>

              {/* Volume Slider - Hidden on small screens, shown on tablet+ */}
              <div className="hidden sm:flex items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  className="w-16 sm:w-20 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer
                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
                    [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-slate-600
                    [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3
                    [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-slate-600 [&::-moz-range-thumb]:border-0"
                />
                <span className="text-xs text-slate-600 font-medium w-8">
                  {Math.round(volume * 100)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Recording Status Display */}
        {isCuttingMode && (trimStart !== null || isRecording) && (
          <div className="mt-4 p-4 bg-gradient-to-r from-red-50 to-pink-50 rounded-xl border-2 border-red-200">
            {isRecording && (
              <div className="flex items-center justify-center gap-2 mb-3">
                <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></div>
                <p className="text-lg font-bold text-red-700">מקליט...</p>
              </div>
            )}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-slate-600 text-xs mb-1">התחלה</p>
                <p className="text-lg font-bold text-slate-900">
                  {trimStart !== null ? formatTime(trimStart) : '--:--:--'}
                </p>
              </div>
              <div>
                <p className="text-slate-600 text-xs mb-1">אורך</p>
                <p className="text-xl font-bold text-red-700">
                  {trimStart !== null ? formatTime((isRecording ? getDayPosition() : trimEnd || 0) - trimStart) : '--:--'}
                </p>
              </div>
              <div>
                <p className="text-slate-600 text-xs mb-1">סיום</p>
                <p className="text-lg font-bold text-slate-900">
                  {isRecording ? formatTime(getDayPosition()) : trimEnd !== null ? formatTime(trimEnd) : '--:--:--'}
                </p>
              </div>
            </div>
            {trimStart !== null && trimEnd !== null && !isRecording && (
              <div className="grid grid-cols-2 gap-2 mt-3">
                <button
                  onClick={saveClip}
                  className="py-2 px-4 rounded-lg bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold text-sm transition-all shadow-lg hover:scale-105"
                >
                  💾 שמור
                </button>
                <button
                  onClick={() => {
                    setTrimStart(null);
                    setTrimEnd(null);
                    setIsRecording(false);
                  }}
                  className="py-2 px-4 rounded-lg bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white font-bold text-sm transition-all shadow-lg hover:scale-105"
                >
                  🔄 שוב
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

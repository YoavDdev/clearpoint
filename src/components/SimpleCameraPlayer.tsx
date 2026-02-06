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
}

export default function SimpleCameraPlayer({ cameraName, clips, onCutClip }: SimpleCameraPlayerProps) {
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

  const currentClip = clips[currentClipIndex];

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
  
  // Calculate total duration of all clips (for day timeline)
  const totalDayDuration = clips.reduce((sum, clip) => sum + (clip.duration || 900), 0); // 900s = 15min default
  
  // Calculate current position in the day
  const getDayPosition = () => {
    let position = 0;
    for (let i = 0; i < currentClipIndex; i++) {
      position += clips[i].duration || 900;
    }
    position += currentTime;
    return position;
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
        {/* Day Timeline - Shows progress through entire day - LTR Layout */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs sm:text-sm text-slate-700 font-medium mb-1 sm:mb-2">
            <span className={`font-bold ${isRecording ? 'text-red-600' : 'text-blue-600'}`}>
              {Math.round((getDayPosition() / totalDayDuration) * 100)}% הושלם
            </span>
            <span>כל היום</span>
          </div>
          {/* Visual progress bar - LTR */}
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden" dir="ltr">
            <div 
              className={`h-full transition-all duration-300 ${
                isRecording 
                  ? 'bg-gradient-to-r from-red-500 to-red-600' 
                  : 'bg-gradient-to-r from-blue-500 to-blue-600'
              }`}
              style={{ width: `${(getDayPosition() / totalDayDuration) * 100}%` }}
            />
          </div>
          <input
            type="range"
            dir="ltr"
            min="0"
            max={totalDayDuration || 100}
            value={getDayPosition()}
            onChange={(e) => {
              const targetTime = parseFloat(e.target.value);
              let accumulatedTime = 0;
              
              // Find which clip this time falls into
              for (let i = 0; i < clips.length; i++) {
                const clipDuration = clips[i].duration || 900;
                if (targetTime < accumulatedTime + clipDuration) {
                  // This is the clip we want
                  setCurrentClipIndex(i);
                  if (videoRef.current) {
                    videoRef.current.currentTime = targetTime - accumulatedTime;
                  }
                  break;
                }
                accumulatedTime += clipDuration;
              }
            }}
            className={`w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
              [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-lg
              [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5
              [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0
              ${isRecording 
                ? '[&::-webkit-slider-thumb]:bg-red-600 [&::-moz-range-thumb]:bg-red-600' 
                : '[&::-webkit-slider-thumb]:bg-blue-600 [&::-moz-range-thumb]:bg-blue-600'
              }`}
          />
          <div className="flex justify-between text-xs sm:text-sm text-slate-600 font-medium">
            <span>{formatTime(totalDayDuration)}</span>
            <span>{formatTime(getDayPosition())}</span>
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

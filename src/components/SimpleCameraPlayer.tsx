'use client';

import { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Scissors, Loader2, VideoOff, Volume2, VolumeX } from 'lucide-react';

interface VodClip {
  id: string;
  timestamp: string;
  duration: number;
  url: string;
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
  
  // Clip cutting state - Cassette Recorder Style
  const [isCuttingMode, setIsCuttingMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [trimStart, setTrimStart] = useState<number | null>(null);
  const [trimEnd, setTrimEnd] = useState<number | null>(null);

  const currentClip = clips[currentClipIndex];
  
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
      setIsLoading(true);
      videoRef.current.src = currentClip.url;
      videoRef.current.load();
      
      // Apply audio settings
      videoRef.current.muted = isMuted;
      videoRef.current.volume = volume;
      
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

  const setPlaybackSpeed = (speed: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
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

  // Cassette Recorder Style Functions
  const startCutting = () => {
    if (onCutClip) {
      setIsCuttingMode(true);
      setIsRecording(false);
      setTrimStart(null);
      setTrimEnd(null);
      // Don't pause - let video keep playing
    }
  };

  const startRecording = () => {
    const currentPos = getDayPosition();
    setTrimStart(currentPos);
    setIsRecording(true);
    setTrimEnd(null);
    // Video keeps playing while recording
  };

  const stopRecording = () => {
    const currentPos = getDayPosition();
    setTrimEnd(currentPos);
    setIsRecording(false);
    // Clip is now captured!
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
      <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-xl p-12 text-center border-2 border-slate-200">
        <VideoOff className="w-16 h-16 text-slate-400 mx-auto mb-4" />
        <p className="text-slate-700 text-xl font-medium">אין הקלטות זמינות עבור {cameraName}</p>
        <p className="text-slate-500 text-base mt-2">נסה לבחור תאריך אחר</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl overflow-hidden border border-slate-200 shadow-lg">
      {/* Video Player */}
      <div className="relative bg-black aspect-video">
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
      </div>

      {/* Controls */}
      <div className="p-6 space-y-4 bg-gradient-to-b from-white to-slate-50">
        {/* Day Timeline - Shows progress through entire day - LTR Layout */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-slate-700 font-medium mb-2">
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
          <div className="flex justify-between text-sm text-slate-600 font-medium">
            <span>{formatTime(totalDayDuration)}</span>
            <span>{formatTime(getDayPosition())}</span>
          </div>
        </div>

        {/* Playback Controls with Integrated REC Button */}
        <div className="flex items-center justify-center pt-2 border-t-2 border-slate-200">
          <div className="flex items-center gap-2">
            {/* Slower Speed Buttons */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPlaybackSpeed(0.25)}
                className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all hover:scale-110"
                title="מהירות איטית מאוד"
              >
                0.25x
              </button>
              <button
                onClick={() => setPlaybackSpeed(0.5)}
                className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all hover:scale-110"
                title="מהירות איטית"
              >
                0.5x
              </button>
            </div>

            {/* Main Controls */}
            <button
              onClick={previousClip}
              disabled={currentClipIndex === 0}
              className="p-3 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all hover:scale-110"
              title="קליפ קודם"
            >
              <SkipBack className="w-5 h-5 text-slate-700" />
            </button>

            <button
              onClick={togglePlay}
              className="p-4 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:scale-110"
              title={isPlaying ? 'עצור' : 'נגן'}
            >
              {isPlaying ? (
                <Pause className="w-7 h-7 text-white" />
              ) : (
                <Play className="w-7 h-7 text-white" />
              )}
            </button>

            <button
              onClick={nextClip}
              disabled={currentClipIndex === clips.length - 1}
              className="p-3 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all hover:scale-110"
              title="קליפ הבא"
            >
              <SkipForward className="w-5 h-5 text-slate-700" />
            </button>

            {/* Faster Speed Buttons */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPlaybackSpeed(1)}
                className="px-2 py-1 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 text-xs font-bold transition-all hover:scale-110"
                title="מהירות רגילה"
              >
                1x
              </button>
              <button
                onClick={() => setPlaybackSpeed(2)}
                className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all hover:scale-110"
                title="מהירות כפולה"
              >
                2x
              </button>
              <button
                onClick={() => setPlaybackSpeed(5)}
                className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all hover:scale-110"
                title="מהירות X5"
              >
                5x
              </button>
              <button
                onClick={() => setPlaybackSpeed(10)}
                className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all hover:scale-110"
                title="מהירות X10"
              >
                10x
              </button>
            </div>

            {/* REC Button - Cassette Style */}
            {onCutClip && (
              <>
                {!isCuttingMode && (
                  <button
                    onClick={startCutting}
                    className="p-4 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 transition-all shadow-lg hover:scale-110 ml-2"
                    title="הקלט קליפ"
                  >
                    <div className="w-6 h-6 bg-white rounded-full"></div>
                  </button>
                )}
                {isCuttingMode && !isRecording && !trimEnd && (
                  <button
                    onClick={startRecording}
                    className="p-4 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 transition-all shadow-lg hover:scale-110 ml-2"
                    title="REC - התחל הקלטה"
                  >
                    <div className="w-6 h-6 bg-white rounded-full"></div>
                  </button>
                )}
                {isRecording && (
                  <button
                    onClick={stopRecording}
                    className="p-4 rounded-xl bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 transition-all shadow-lg hover:scale-110 ml-2"
                    title="STOP - עצור הקלטה"
                  >
                    <div className="w-6 h-6 bg-white"></div>
                  </button>
                )}
              </>
            )}

            {/* Audio Controls */}
            <div className="flex items-center gap-2 ml-3 pl-3 border-l-2 border-slate-200">
              {/* Mute Button */}
              <button
                onClick={toggleMute}
                className={`p-3 rounded-xl transition-all hover:scale-110 ${
                  isMuted 
                    ? 'bg-red-100 hover:bg-red-200 text-red-700' 
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
                title={isMuted ? 'הפעל קול' : 'השתק'}
              >
                {isMuted ? (
                  <VolumeX className="w-5 h-5" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </button>

              {/* Volume Slider */}
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  className="w-20 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer
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

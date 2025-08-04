'use client';

import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { Camera, Wifi, WifiOff, Maximize2, Volume2, VolumeX, Circle } from 'lucide-react';

type Props = {
  camera: any;
  tunnelName: string;
  cameraNumber: number;
  isFullscreen?: boolean;
};

export default function SurveillanceCameraView({ camera, tunnelName, cameraNumber, isFullscreen = false }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isRecording, setIsRecording] = useState(true); // Assume always recording
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isMounted, setIsMounted] = useState(false);

  const { id, name } = camera;
  const streamUrl = `https://${tunnelName}.clearpoint.co.il/${id}/stream.m3u8`;

  // Set mounted state on client side
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hls: Hls | null = null;

    if (Hls.isSupported()) {
      hls = new Hls({
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        maxBufferSize: 60 * 1000 * 1000,
        maxBufferHole: 0.5,
        liveSyncDuration: 3,
        liveMaxLatencyDuration: 10,
        liveDurationInfinity: true,
        fragLoadingMaxRetry: 6,
        manifestLoadingMaxRetry: 6,
        levelLoadingMaxRetry: 6,
        enableWorker: true,
        lowLatencyMode: false,
        startFragPrefetch: true,
        testBandwidth: true,
      });

      hls.attachMedia(video);
      hls.loadSource(streamUrl);
      
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false);
        setIsConnected(true);
      });
      
      hls.on(Hls.Events.BUFFER_APPENDED, () => {
        if (video.buffered.length > 0 && video.buffered.end(0) > 2) {
          if (video.paused && !isBuffering) {
            video.play().catch((err) => console.warn('Autoplay failed:', err));
          }
        }
      });
      
      video.addEventListener('waiting', () => setIsBuffering(true));
      video.addEventListener('canplay', () => setIsBuffering(false));
      video.addEventListener('playing', () => {
        setIsBuffering(false);
        setIsLoading(false);
        setIsConnected(true);
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          setIsConnected(false);
          console.error('Fatal HLS error:', data.type, data.details);
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls?.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls?.recoverMediaError();
              break;
            default:
              hls?.destroy();
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = streamUrl;
      video.addEventListener('loadedmetadata', () => {
        video.play().catch((e) => console.warn('Autoplay failed:', e));
        setIsConnected(true);
        setIsLoading(false);
      });
    }

    return () => {
      hls?.destroy();
    };
  }, [streamUrl]);

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  };

  const toggleFullscreen = () => {
    if (videoRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        videoRef.current.requestFullscreen();
      }
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('he-IL', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className={`relative bg-gray-800 rounded-lg overflow-hidden shadow-lg group ${
      isFullscreen ? 'h-full w-full' : 'aspect-video'
    }`}>
      {/* Camera Name Overlay - Top Right */}
      <div className="absolute top-0 right-0 z-20 p-2 sm:p-3">
        <div className="flex items-center space-x-1 sm:space-x-2 rtl:space-x-reverse">
          <Camera className="w-3 h-3 sm:w-4 sm:h-4 text-blue-400" />
          <span className="text-white font-medium text-xs sm:text-sm truncate max-w-24 sm:max-w-none">{name}</span>
          <span className="text-gray-400 text-xs hidden sm:inline">#{cameraNumber}</span>
        </div>
      </div>

      {/* Status Indicators Overlay - Moved Down */}
      <div className="absolute top-8 right-0 z-20 p-2 sm:p-3">
        <div className="flex items-center space-x-1 sm:space-x-2 rtl:space-x-reverse">
          {isConnected ? (
            <Wifi className="w-3 h-3 sm:w-4 sm:h-4 text-green-400" />
          ) : (
            <WifiOff className="w-3 h-3 sm:w-4 sm:h-4 text-red-400" />
          )}
          {isRecording && (
            <div className="flex items-center space-x-1 rtl:space-x-reverse">
              <Circle className="w-2 h-2 sm:w-3 sm:h-3 text-red-500 animate-pulse fill-current" />
              <span className="text-red-400 text-xs hidden sm:inline">REC</span>
            </div>
          )}
        </div>
      </div>

      {/* Video Container */}
      <div className="relative w-full bg-black overflow-hidden">
        {(isLoading || isBuffering) && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/75 z-10">
            <div className="flex flex-col items-center text-white">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mb-2"></div>
              <span className="text-sm">
                {isLoading ? 'מתחבר...' : 'טוען...'}
              </span>
            </div>
          </div>
        )}

        {!isConnected && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-10">
            <div className="flex flex-col items-center text-gray-400">
              <WifiOff className="w-12 h-12 mb-3" />
              <span className="text-sm">אין חיבור</span>
              <span className="text-xs text-gray-500">מצלמה לא זמינה</span>
            </div>
          </div>
        )}

        <video
          ref={videoRef}
          muted={isMuted}
          playsInline
          preload="metadata"
          className="w-full h-full object-cover"
        />

        {/* Responsive Control Overlay */}
        <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/80 to-transparent p-2 sm:p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="flex items-center justify-between">
            <div></div>
            
            <div className="flex items-center space-x-1 sm:space-x-2 rtl:space-x-reverse">
              <button
                onClick={toggleMute}
                className="p-1 sm:p-1.5 hover:bg-white/20 rounded transition-colors"
                title={isMuted ? 'הפעל קול' : 'השתק'}
              >
                {isMuted ? (
                  <VolumeX className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                ) : (
                  <Volume2 className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                )}
              </button>
              
              <button
                onClick={toggleFullscreen}
                className="p-1 sm:p-1.5 hover:bg-white/20 rounded transition-colors"
                title="מסך מלא"
              >
                <Maximize2 className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
              </button>
            </div>
          </div>
        </div>
      </div>


    </div>
  );
}

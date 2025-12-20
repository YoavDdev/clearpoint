'use client';

import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { WifiOff, Maximize2 } from 'lucide-react';

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
  const [hasError, setHasError] = useState(false);
  const [needsInteraction, setNeedsInteraction] = useState(false);

  const { id, name } = camera;
  const streamUrl = `https://${tunnelName}.clearpoint.co.il/${id}/stream.m3u8`;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hls: Hls | null = null;
    
    // Connection timeout - if not connected after 15 seconds, show error
    const connectionTimeout = setTimeout(() => {
      if (!isConnected) {
        setIsLoading(false);
        setHasError(true);
        if (process.env.NODE_ENV === 'development') {
          console.warn(`Camera ${name} failed to connect within 15 seconds`);
        }
      }
    }, 15000);

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
        clearTimeout(connectionTimeout);
        setIsLoading(false);
        setIsConnected(true);
        setHasError(false);
        
        // Try to autoplay - handle strict Chrome autoplay policy
        video.play().catch((err) => {
          console.log('Autoplay blocked - user interaction required');
          setNeedsInteraction(true);
        });
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
        clearTimeout(connectionTimeout);
        setIsBuffering(false);
        setIsLoading(false);
        setIsConnected(true);
        setHasError(false);
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          setIsConnected(false);
          
          // Only log in development mode - we handle errors properly in UI
          if (process.env.NODE_ENV === 'development') {
            console.warn(`Camera ${name} - HLS error:`, data.type, data.details);
          }
          
          // If network error, show error state after retries
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            setHasError(true);
            setIsLoading(false);
          }
          
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls?.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls?.recoverMediaError();
              break;
            default:
              setHasError(true);
              setIsLoading(false);
              hls?.destroy();
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = streamUrl;
      video.addEventListener('loadedmetadata', () => {
        clearTimeout(connectionTimeout);
        video.play().catch((e) => console.warn('Autoplay failed:', e));
        setIsConnected(true);
        setIsLoading(false);
        setHasError(false);
      });
    }

    return () => {
      clearTimeout(connectionTimeout);
      hls?.destroy();
    };
  }, [streamUrl]);

  const toggleFullscreen = () => {
    if (videoRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        videoRef.current.requestFullscreen();
      }
    }
  };

  return (
    <div className={`relative bg-black rounded-lg overflow-hidden shadow-lg group ${
      isFullscreen ? 'h-full w-full' : 'aspect-video'
    }`}>
      {/* Camera Name Only - Clean Overlay - Hidden when error */}
      {!hasError && isConnected && (
        <div className="absolute top-0 right-0 z-20 p-3">
          <div className="bg-black/60 backdrop-blur-sm px-3 py-2 rounded">
            <span className="text-white font-medium text-sm">{name}</span>
          </div>
        </div>
      )}

      {/* Manual Play Button - Center - Only shown when autoplay is blocked */}
      {needsInteraction && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center z-30 bg-black/50">
          <button
            onClick={() => {
              videoRef.current?.play();
              setNeedsInteraction(false);
            }}
            className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white text-lg font-bold rounded-xl transition-all shadow-2xl flex items-center gap-3"
          >
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
            הפעל מצלמה
          </button>
        </div>
      )}

      {/* Fullscreen Button - Bottom Left - Appears on Hover - Hidden when error */}
      {!hasError && isConnected && (
        <div className="absolute bottom-3 left-3 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button
            onClick={toggleFullscreen}
            className="p-2 bg-black/60 backdrop-blur-sm hover:bg-black/80 rounded transition-colors"
            title="מסך מלא"
          >
            <Maximize2 className="w-5 h-5 text-white" />
          </button>
        </div>
      )}

      {/* Video Container */}
      <div className="relative w-full h-full bg-black overflow-hidden">
        {/* Loading State */}
        {isLoading && !hasError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/75 z-10">
            <div className="flex flex-col items-center text-white">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mb-2"></div>
              <span className="text-sm">מתחבר למצלמה...</span>
              <span className="text-xs text-gray-400 mt-1">נא להמתין</span>
            </div>
          </div>
        )}

        {/* Buffering State */}
        {isBuffering && !hasError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
            <div className="flex flex-col items-center text-white">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400"></div>
            </div>
          </div>
        )}

        {/* Error State - Camera Offline/Missing */}
        {(hasError || (!isConnected && !isLoading)) && (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 z-10">
            <div className="flex flex-col items-center text-center px-6">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
                <WifiOff className="w-8 h-8 text-red-400" />
              </div>
              <span className="text-lg font-medium text-white mb-2">מצלמה לא זמינה</span>
              <span className="text-sm text-gray-400 mb-1">המצלמה אינה מחוברת או לא זמינה</span>
              <span className="text-xs text-gray-500 mb-4">נא לבדוק את החיבור</span>
              
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                נסה שוב
              </button>
            </div>
          </div>
        )}

        <video
          ref={videoRef}
          autoPlay
          muted={true}
          playsInline
          preload="metadata"
          className="w-full h-full object-contain"
        />
      </div>


    </div>
  );
}

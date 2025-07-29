'use client';

import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';

type Props = {
  streamUrl: string;
};

export default function LiveStreamPlayer({ streamUrl }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hls: Hls | null = null;

    if (Hls.isSupported()) {
      hls = new Hls({
        // Buffer configuration for better stability
        maxBufferLength: 30, // Increased buffer length
        maxMaxBufferLength: 60, // Maximum buffer length
        maxBufferSize: 60 * 1000 * 1000, // 60MB buffer size
        maxBufferHole: 0.5, // Allow small buffer holes
        
        // Live streaming configuration
        liveSyncDuration: 3, // Slightly increased sync duration
        liveMaxLatencyDuration: 10, // Maximum latency before seeking
        liveDurationInfinity: true,
        
        // Error recovery
        fragLoadingMaxRetry: 6,
        manifestLoadingMaxRetry: 6,
        levelLoadingMaxRetry: 6,
        
        // Performance settings
        enableWorker: true,
        lowLatencyMode: false, // Disable for better stability
        
        // Additional stability settings
        startFragPrefetch: true,
        testBandwidth: true,
      });

      hls.attachMedia(video);
      hls.loadSource(streamUrl);
      
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        // Don't auto-play immediately, wait for some buffer
        setIsLoading(false);
      });
      
      // Wait for sufficient buffer before starting playback
      hls.on(Hls.Events.BUFFER_APPENDED, () => {
        if (video.buffered.length > 0 && video.buffered.end(0) > 2) {
          // We have at least 2 seconds buffered, safe to start
          if (video.paused && !isBuffering) {
            video.play().catch((err) => console.warn('🔁 Autoplay failed:', err));
          }
        }
      });
      
      // Monitor buffering state
      video.addEventListener('waiting', () => setIsBuffering(true));
      video.addEventListener('canplay', () => setIsBuffering(false));
      video.addEventListener('playing', () => {
        setIsBuffering(false);
        setIsLoading(false);
      });

      // Enhanced error handling
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          console.error('🔥 Fatal HLS error:', data.type, data.details);
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.log('🔄 Network error, attempting to recover...');
              hls?.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log('🔄 Media error, attempting to recover...');
              hls?.recoverMediaError();
              break;
            default:
              console.error('🔥 Fatal error, destroying HLS instance');
              hls?.destroy();
              break;
          }
        } else {
          // Handle non-fatal errors silently for normal streaming events
          const normalStreamingEvents = [
            'bufferStalledError',
            'bufferNudgeOnStall',
            'bufferSeekOverHole',
            'bufferAppendingError'
          ];
          
          if (!normalStreamingEvents.includes(data.details)) {
            // Only log unexpected non-fatal errors
            console.warn('⚠️ HLS warning:', data.details, data);
          }
          // Buffer stalls and similar events are handled silently
        }
      });
      
      // Add buffer event listeners for monitoring
      hls.on(Hls.Events.BUFFER_APPENDED, () => {
        // Buffer health monitoring could be added here
      });
      
      hls.on(Hls.Events.BUFFER_EOS, () => {
        console.log('📺 End of stream reached');
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = streamUrl;
      video.addEventListener('loadedmetadata', () => {
        video.play().catch((e) => console.warn('Autoplay failed:', e));
      });
    }

    return () => {
      hls?.destroy();
    };
  }, [streamUrl]);

  return (
    <div className="w-full aspect-video bg-black rounded overflow-hidden relative">
      {(isLoading || isBuffering) && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 z-10">
          <div className="flex flex-col items-center text-white">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mb-2"></div>
            <span className="text-sm">
              {isLoading ? 'טוען זרם חי...' : 'מבצע חיבור מחדש...'}
            </span>
          </div>
        </div>
      )}
      <video
        ref={videoRef}
        controls
        muted
        playsInline
        preload="metadata"
        className="w-full h-full"
      />
    </div>
  );
}

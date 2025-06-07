'use client';

import { useEffect, useRef } from 'react';
import Hls from 'hls.js';

type Props = {
  streamUrl: string;
};

export default function LiveStreamPlayer({ streamUrl }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hls: Hls | null = null;

    if (Hls.isSupported()) {
      hls = new Hls({
        liveSyncDuration: 2,
        maxLiveSyncPlaybackRate: 1.0,
        maxBufferLength: 5,
        backBufferLength: 10,
        enableWorker: true,
        lowLatencyMode: true,
        nudgeMaxRetry: 5,
      });

      hls.attachMedia(video);
      hls.loadSource(streamUrl);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch((err) => console.warn('🔁 Autoplay failed:', err));
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          console.error('🔥 Fatal HLS.js error:', data);
          hls?.destroy();
        } else {
          console.warn('⚠️ HLS.js warning:', data);
        }
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
    <div className="w-full aspect-video bg-black rounded overflow-hidden">
      <video
        ref={videoRef}
        controls
        autoPlay
        muted
        playsInline
        preload="auto"
        className="w-full h-full"
      />
    </div>
  );
}

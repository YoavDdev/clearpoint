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

    if (Hls.isSupported()) {
      const hls = new Hls({
  lowLatencyMode: true,
  liveSyncDuration: 1.5,
  maxLiveSyncPlaybackRate: 1.0,
  maxBufferLength: 3,
  maxMaxBufferLength: 5,
  backBufferLength: 30,
});

      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data?.fatal) {
          console.error("🔥 Fatal HLS.js error:", data);
          hls.destroy();
        } else {
          console.warn("⚠️ HLS.js warning:", data);
        }
      });

      return () => hls.destroy();
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = streamUrl;
    }
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

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
      const hls = new Hls();
      hls.loadSource(streamUrl);
      hls.attachMedia(video);
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
        className={`w-full h-full`}
        onClick={(e) => e.preventDefault()}
      />

    </div>
  );
}


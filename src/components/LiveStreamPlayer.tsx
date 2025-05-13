'use client';

import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';

type Props = {
  streamUrl: string;
  objectFit?: 'cover' | 'contain';
};

export default function LiveStreamPlayer({ streamUrl, objectFit = 'contain' }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setIsLoading(true);

    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(streamUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => setIsLoading(false));
      return () => hls.destroy();
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = streamUrl;
      video.onloadeddata = () => setIsLoading(false);
    }
  }, [streamUrl]);

  return (
    <div className="w-full h-full relative bg-black">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-black bg-opacity-60">
          <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      <video
        ref={videoRef}
        controls
        autoPlay
        muted
        playsInline
        className={`w-full h-full ${objectFit === 'cover' ? 'object-cover' : 'object-contain'}`}
        onClick={(e) => e.preventDefault()}
      />
    </div>
  );
}

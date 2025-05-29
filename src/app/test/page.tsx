'use client';

import { useEffect, useRef } from 'react';
import Hls from 'hls.js';

export default function LiveStreamPage() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    const streamUrl =
      'https://clearpoint-cdn.b-cdn.net/14a644fe-3bbe-44f3-ac91-1f6be8a20b0f/live/82015c1c-84a4-4b7e-a9ce-ffc813255f85/stream.m3u8';

    if (!video) return;

    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(streamUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play();
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = streamUrl;
      video.addEventListener('loadedmetadata', () => {
        video.play();
      });
    }
  }, []);

  return (
    <main className="min-h-screen bg-black flex flex-col items-center justify-center text-white">
      <h1 className="text-2xl font-semibold mb-6">🎥 Live Camera Feed</h1>
      <video
        ref={videoRef}
        controls
        autoPlay
        className="w-full max-w-3xl rounded-xl shadow-lg"
      />
    </main>
  );
}

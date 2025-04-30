"use client";

import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";

type Props = {
  path: string;
  onError?: () => void;
  onSuccess?: () => void;
};

export default function LiveStreamPlayer({ path, onError, onSuccess }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [streamError, setStreamError] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    const streamURL = `http://localhost:8888/${path}/index.m3u8`;
    let hls: Hls | null = null;
    let watchdog: NodeJS.Timeout;

    const resetWatchdog = () => {
      clearTimeout(watchdog);
      watchdog = setTimeout(() => {
        console.warn("❌ No fragments received in 10s — marking camera as offline");
        setStreamError(true);
        onError?.();
      }, 10000); // 10s timeout
    };

    if (!video) return;

    if (Hls.isSupported()) {
      hls = new Hls();
      hls.loadSource(streamURL);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log("✅ Manifest loaded");
        resetWatchdog(); // kick off watchdog
        onSuccess?.();
      });

      hls.on(Hls.Events.FRAG_LOADED, () => {
        // received video data — reset watchdog timer
        resetWatchdog();
      });

      hls.on(Hls.Events.ERROR, () => {
        console.error("❌ HLS error");
        clearTimeout(watchdog);
        setStreamError(true);
        onError?.();
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = streamURL;
      video.addEventListener("loadedmetadata", () => {
        onSuccess?.();
      });
      video.addEventListener("error", () => {
        setStreamError(true);
        onError?.();
      });
    }

    return () => {
      if (hls) hls.destroy();
      clearTimeout(watchdog);
    };
  }, [path, onError, onSuccess]);

  if (streamError) {
    return (
      <img
        src="https://placehold.co/400x250?text=Camera+Offline"
        alt="Camera offline"
        className="rounded border w-full h-48 object-cover"
      />
    );
  }

  return (
    <video
      ref={videoRef}
      controls
      autoPlay
      muted
      className="rounded border w-full h-48 object-cover"
    />
  );
}

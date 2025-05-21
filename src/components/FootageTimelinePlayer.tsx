import { useEffect, useRef, useState } from 'react';

type Clip = {
  url: string;
  timestamp: string;
};

type Props = {
  clips: Clip[];
};

export default function FootageTimelinePlayer({ clips }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [virtualTime, setVirtualTime] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  const timestamps = clips.map((c) => new Date(c.timestamp).getTime());
  const startTime = Math.min(...timestamps);
  const endTime = Math.max(...timestamps) + 15 * 60 * 1000; // add 15 minutes to last clip
  const totalDuration = Math.floor((endTime - startTime) / 1000);

  const currentClip = clips[currentIndex];
  const currentClipStart = new Date(currentClip.timestamp).getTime();
  const currentOffset = Math.floor((currentClipStart - startTime) / 1000);

  const handleEnded = () => {
    if (currentIndex < clips.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseInt(e.target.value, 10);
    setVirtualTime(newTime);

    // Find the clip by comparing to its start time
    for (let i = 0; i < clips.length; i++) {
      const clipStart = new Date(clips[i].timestamp).getTime();
      const clipEnd = clipStart + 15 * 60 * 1000;
      const t = startTime + newTime * 1000;
      if (t >= clipStart && t < clipEnd) {
        setCurrentIndex(i);
        const offset = Math.floor((t - clipStart) / 1000);
        setTimeout(() => {
          if (videoRef.current) videoRef.current.currentTime = offset;
        }, 100);
        break;
      }
    }
  };

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.load();
      videoRef.current.play().catch(() => {});
    }
  }, [currentIndex]);

  useEffect(() => {
    const interval = setInterval(() => {
      const video = videoRef.current;
      if (video && !video.paused) {
        const live = new Date(clips[currentIndex].timestamp).getTime();
        const now = Date.now();
        const t = Math.floor((live - startTime) / 1000 + video.currentTime);
        setVirtualTime(t);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [currentIndex]);

  if (!clips.length) return <p>אין קליפים זמינים.</p>;

  return (
    <div className="w-full space-y-4">
      <div className="text-sm text-gray-600">
        {new Date(startTime + virtualTime * 1000).toLocaleTimeString()} ({Math.floor(virtualTime / 60)}m)
      </div>

      <input
        type="range"
        min={0}
        max={totalDuration}
        value={virtualTime}
        onChange={handleScrub}
        className="w-full"
      />

      <video
        ref={videoRef}
        key={currentClip.url}
        controls
        className="w-full rounded border shadow"
        onEnded={handleEnded}
      >
        <source src={currentClip.url} type="video/mp4" />
        הדפדפן שלך לא תומך בווידאו.
      </video>
    </div>
  );
}

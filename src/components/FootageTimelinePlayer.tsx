import { useEffect, useRef, useState } from 'react';
import CustomTimelineBar from './CustomTimelineBar';

// FFmpeg will be imported dynamically in handler

type Clip = {
  url: string;
  timestamp: string;
};

type Cut = { start: number; end: number };

type Props = {
  clips: Clip[];
};

export default function FootageTimelinePlayer({ clips }: Props) {
  const [cuts, setCuts] = useState<Cut[]>([]);
  const [activeStart, setActiveStart] = useState<number | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [virtualTime, setVirtualTime] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const timestamps = clips.map((c) => new Date(c.timestamp).getTime());
  const startTime = Math.min(...timestamps);
  const endTime = Math.max(...timestamps) + 15 * 60 * 1000;
  const totalDuration = Math.floor((endTime - startTime) / 1000);

  const currentClip = clips[currentIndex];

  const handleEnded = () => {
    if (currentIndex < clips.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleScrub = (newTime: number) => {
    setVirtualTime(newTime);
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

  const handleTrimAndDownload = async () => {
    if (!cuts.length) {
      alert("לא נוספו קטעים לחיתוך.");
      return;
    }
    setIsProcessing(true);

    const { FFmpeg } = await import('@ffmpeg/ffmpeg');
    const { fetchFile } = await import('@ffmpeg/util');
    const ffmpeg = new FFmpeg();
    if (!ffmpeg.loaded) await ffmpeg.load();

    const selectedClips = clips.filter((clip) => {
      const clipStart = new Date(clip.timestamp).getTime();
      const clipEnd = clipStart + 15 * 60 * 1000;
      return cuts.some(cut => {
        const s = startTime + cut.start * 1000;
        const e = startTime + cut.end * 1000;
        return s < clipEnd && e > clipStart;
      });
    });

    const concatList: string[] = [];
    for (let i = 0; i < selectedClips.length; i++) {
      const fileName = `input${i}.mp4`;
      const fileData = await fetchFile(selectedClips[i].url);
      await ffmpeg.writeFile(fileName, fileData);
      concatList.push(`file '${fileName}'`);
    }
    await ffmpeg.writeFile('concat.txt', concatList.join('\n'));
    await ffmpeg.exec(['-f', 'concat', '-safe', '0', '-i', 'concat.txt', '-c', 'copy', 'merged.mp4']);

    const parts: string[] = [];
    for (let i = 0; i < cuts.length; i++) {
      const cut = cuts[i];
      let mergedOffset = 0;

      for (let j = 0; j < selectedClips.length; j++) {
        const clipStart = new Date(selectedClips[j].timestamp).getTime();
        const clipEnd = clipStart + 15 * 60 * 1000;
        const cutStartTime = startTime + cut.start * 1000;

        if (cutStartTime >= clipStart && cutStartTime < clipEnd) {
          mergedOffset += (cutStartTime - clipStart) / 1000;
          break;
        } else {
          mergedOffset += 15 * 60;
        }
      }

      const duration = cut.end - cut.start;
      const partName = `part${i}.mp4`;
      await ffmpeg.exec(['-ss', String(mergedOffset), '-i', 'merged.mp4', '-t', String(duration), '-c', 'copy', partName]);
      parts.push(`file '${partName}'`);
    }

    await ffmpeg.writeFile('final.txt', parts.join('\n'));
    await ffmpeg.exec(['-f', 'concat', '-safe', '0', '-i', 'final.txt', '-c', 'copy', 'final.mp4']);

    const result = await ffmpeg.readFile('final.mp4');
    const blob = new Blob([result], { type: 'video/mp4' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `multi-trim-${Date.now()}.mp4`;
    a.click();

    setIsProcessing(false);
  };

  const formatTime = (seconds: number) =>
    new Date(startTime + seconds * 1000).toLocaleTimeString();

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
        const t = Math.floor((live - startTime) / 1000 + video.currentTime);
        setVirtualTime(t);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [currentIndex]);

  return (
    <div className="w-full space-y-4" dir="rtl">
      <div className="text-sm text-gray-600 text-right">
        {new Date(startTime + virtualTime * 1000).toLocaleTimeString()} ({Math.floor(virtualTime / 60)} דקות)
      </div>

      <div className="flex flex-wrap gap-2 mb-2 justify-center">
        <button
          onClick={() => setActiveStart(virtualTime)}
          className="px-4 py-2 bg-yellow-400 text-black font-medium rounded-2xl shadow-sm hover:bg-yellow-300 transition"
        >📍 התחלת חיתוך</button>
        <button
          onClick={() => {
            if (activeStart !== null && virtualTime > activeStart) {
              setCuts((prev) => [...prev, { start: activeStart, end: virtualTime }]);
              setActiveStart(null);
            }
          }}
          className="px-4 py-2 bg-orange-400 text-black font-medium rounded-2xl shadow-sm hover:bg-orange-300 transition"
        >📍 סיום חיתוך</button>
        <button
          onClick={handleTrimAndDownload}
          disabled={isProcessing}
          className="px-4 py-2 bg-green-500 text-white font-medium rounded-2xl shadow-sm hover:bg-green-400 transition disabled:opacity-50"
        >{isProcessing ? '⏳ מעבד חיתוכים...' : '🔪 הורדת כל החיתוכים'}</button>
        {activeStart !== null && (
          <button
            onClick={() => {
              setCuts([]);
              setActiveStart(null);
            }}
            className="px-4 py-2 bg-gray-300 text-black font-medium rounded-2xl shadow-sm hover:bg-gray-200 transition"
          >🔁 איפוס חיתוכים</button>
        )}
      </div>

      <div className="text-right text-sm">
        {activeStart !== null && (
          <div className="text-red-600">✂️ חיתוך התחיל ב־{formatTime(activeStart)}</div>
        )}
        {cuts.length > 0 && (
          <ul className="text-green-700 space-y-1">
            {cuts.map((c, i) => (
              <li key={i}>🎬 קטע {i + 1}: {formatTime(c.start)} עד {formatTime(c.end)} ({c.end - c.start} שניות)</li>
            ))}
          </ul>
        )}
      </div>

      <CustomTimelineBar
        duration={totalDuration}
        currentTime={virtualTime}
        cutStart={activeStart}
        cutEnd={null}
        cuts={cuts}
        onScrub={handleScrub}
      />

      <video
        ref={videoRef}
        key={currentClip.url}
        src={currentClip.url}
        className="w-full rounded border shadow"
        controls
        muted
        autoPlay
        onEnded={handleEnded}
      >
        <source src={currentClip.url} type="video/mp4" />
        הדפדפן שלך לא תומך בווידאו.
      </video>
    </div>
  );
}
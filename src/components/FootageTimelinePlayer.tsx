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
await ffmpeg.exec([
  '-f', 'concat',
  '-safe', '0',
  '-i', 'final.txt',
  '-c:v', 'libx264',     // ✅ convert video to H.264
  '-c:a', 'aac',         // ✅ convert audio to AAC (already good)
  '-preset', 'veryfast', // ⚡ fast encoding
  'final.mp4'
]);
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
    <div className="w-full space-y-6 bg-white rounded-xl border border-gray-200 p-6 shadow-sm" dir="rtl">
      {/* Time Display */}
      <div className="flex items-center justify-between bg-gray-50 px-4 py-3 rounded-lg">
        <div className="text-sm font-medium text-gray-700">
          <span className="text-blue-600">זמן נוכחי:</span> {new Date(startTime + virtualTime * 1000).toLocaleTimeString('he-IL')}
        </div>
        <div className="text-sm text-gray-500">
          {Math.floor(virtualTime / 60)} דקות {virtualTime % 60} שניות
        </div>
      </div>

      {/* Timeline Bar */}
      <div className="py-2">
        <CustomTimelineBar
          duration={totalDuration}
          currentTime={virtualTime}
          cutStart={activeStart}
          cutEnd={null}
          cuts={cuts}
          onScrub={handleScrub}
        />
      </div>

      {/* Video Player */}
      <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          key={currentClip.url}
          src={currentClip.url}
          className="w-full h-full object-contain"
          controls
          muted
          autoPlay
          onEnded={handleEnded}
        >
          <source src={currentClip.url} type="video/mp4" />
          הדפדפן שלך לא תומך בווידאו.
        </video>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 pt-2">
        <button
          onClick={() => setActiveStart(virtualTime)}
          className={`px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
            activeStart === null 
              ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border border-yellow-200' 
              : 'bg-gray-100 text-gray-500 cursor-not-allowed'
          }`}
          disabled={activeStart !== null}
        >
          ✂️ התחלת חיתוך
        </button>
        
        <button
          onClick={() => {
            if (activeStart !== null && virtualTime > activeStart) {
              setCuts((prev) => [...prev, { start: activeStart, end: virtualTime }]);
              setActiveStart(null);
            }
          }}
          disabled={activeStart === null || virtualTime <= activeStart}
          className={`px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
            activeStart !== null && virtualTime > activeStart
              ? 'bg-orange-100 text-orange-800 hover:bg-orange-200 border border-orange-200'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
          }`}
        >
          🎬 סיום חיתוך
        </button>
        
        <div className="flex-1" />
        
        <button
          onClick={handleTrimAndDownload}
          disabled={isProcessing || cuts.length === 0}
          className={`px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
            !isProcessing && cuts.length > 0
              ? 'bg-green-600 text-white hover:bg-green-700 shadow-sm'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          {isProcessing ? (
            <span className="flex items-center gap-2">
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              מעבד...
            </span>
          ) : (
            `הורד חיתוכים (${cuts.length})`
          )}
        </button>
        
        {(activeStart !== null || cuts.length > 0) && (
          <button
            onClick={() => {
              setCuts([]);
              setActiveStart(null);
            }}
            className="px-4 py-2.5 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-100 rounded-lg transition-all"
          >
            🗑️ איפוס הכל
          </button>
        )}
      </div>

      {/* Status and Cuts List */}
      <div className="space-y-3 pt-2">
        {activeStart !== null && (
          <div className="bg-blue-50 border border-blue-100 text-blue-800 text-sm px-4 py-2.5 rounded-lg">
            ✂️ חיתוך התחיל ב־{formatTime(activeStart)}
          </div>
        )}
        
        {cuts.length > 0 && (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200">
              <h3 className="text-sm font-medium text-gray-700">קטעים שנבחרו ({cuts.length})</h3>
            </div>
            <ul className="divide-y divide-gray-100">
              {cuts.map((c, i) => (
                <li key={i} className="px-4 py-2.5 hover:bg-gray-50 flex justify-between items-center">
                  <span className="text-sm text-gray-700">
                    <span className="font-medium">קטע {i + 1}:</span> {formatTime(c.start)} - {formatTime(c.end)} 
                    <span className="text-gray-400 text-xs mr-2">({c.end - c.start} שניות)</span>
                  </span>
                  <button
                    onClick={() => {
                      setCuts(cuts.filter((_, idx) => idx !== i));
                    }}
                    className="text-gray-400 hover:text-red-500 p-1 -mr-2 rounded-full hover:bg-red-50 transition-colors"
                    aria-label="מחק קטע"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
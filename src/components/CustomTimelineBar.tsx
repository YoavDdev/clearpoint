import { useRef } from 'react';
import { motion } from 'framer-motion';

type Cut = { start: number; end: number };

type Props = {
  duration: number;
  currentTime: number;
  cutStart: number | null;
  cutEnd: number | null;
  cuts: Cut[];
  onScrub: (newTime: number) => void;
};

export default function CustomTimelineBar({
  duration,
  currentTime,
  cutStart,
  cutEnd,
  cuts,
  onScrub,
}: Props) {
  const barRef = useRef<HTMLDivElement>(null);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!barRef.current) return;
    const rect = barRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = x / rect.width;
    const newTime = Math.floor(duration * percent);
    onScrub(newTime);
  };

  const getPercent = (value: number) => (value / duration) * 100;
  const playheadPercent = getPercent(currentTime);

  return (
    <div
      dir="rtl"
      className="relative w-full h-6 cursor-pointer select-none"
      onClick={handleClick}
      ref={barRef}
    >
      {/* Timeline background */}
      <div className="absolute inset-0 bg-gray-300 rounded-full overflow-hidden">
        {/* Confirmed cuts */}
        {cuts.map((cut, i) => {
          const start = getPercent(cut.start);
          const width = getPercent(cut.end - cut.start);
          return (
            <div
              key={i}
              className="absolute top-0 bottom-0 bg-red-500 opacity-80"
              style={{ left: `${start}%`, width: `${width}%` }}
            />
          );
        })}

        {/* Active cut preview */}
        {cutStart !== null && cutEnd === null && (
          <div
            className="absolute top-0 bottom-0 bg-red-400 opacity-70"
            style={{
              left: `${getPercent(cutStart)}%`,
              width: `${(Math.min(15, duration - cutStart) / duration) * 100}%`
            }}
          />
        )}
      </div>

      {/* Playhead */}
      <motion.div
        className="absolute top-0 bottom-0 w-1 bg-black"
        initial={false}
        animate={{ left: `${playheadPercent}%` }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      />
    </div>
  );
}
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
  isCurrentDay?: boolean;
  availablePercentage?: number;
};

export default function CustomTimelineBar({
  duration,
  currentTime,
  cutStart,
  cutEnd,
  cuts,
  onScrub,
  isCurrentDay = false,
  availablePercentage = 1,
}: Props) {
  const barRef = useRef<HTMLDivElement>(null);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!barRef.current) return;
    const rect = barRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = x / rect.width;
    
    // For current day: block clicks after current time
    if (isCurrentDay && percent > availablePercentage) {
      return; // Don't allow clicking in unavailable area
    }
    
    const newTime = Math.floor(duration * percent);
    onScrub(newTime);
  };

  const getPercent = (value: number) => (value / duration) * 100;
  const playheadPercent = getPercent(currentTime);

  return (
    <div className="space-y-2">
      <div className="relative bg-gray-50 rounded-lg p-4 border border-gray-200">
        {/* Time markers - Reversed order (לילה → בוקר) */}
        <div className="flex justify-between text-xs text-gray-400 mb-2">
          <div className="text-center">
            <div className="font-medium">06:00</div>
            <div className="w-px h-2 bg-gray-300 mx-auto mt-1"></div>
          </div>
          <div className="text-center">
            <div className="font-medium">03:00</div>
            <div className="w-px h-2 bg-gray-300 mx-auto mt-1"></div>
          </div>
          <div className="text-center">
            <div className="font-medium">00:00</div>
            <div className="w-px h-2 bg-gray-300 mx-auto mt-1"></div>
          </div>
          <div className="text-center">
            <div className="font-medium">21:00</div>
            <div className="w-px h-2 bg-gray-300 mx-auto mt-1"></div>
          </div>
          <div className="text-center">
            <div className="font-medium">18:00</div>
            <div className="w-px h-2 bg-gray-300 mx-auto mt-1"></div>
          </div>
          <div className="text-center">
            <div className="font-medium">15:00</div>
            <div className="w-px h-2 bg-gray-300 mx-auto mt-1"></div>
          </div>
          <div className="text-center">
            <div className="font-medium">12:00</div>
            <div className="w-px h-2 bg-gray-300 mx-auto mt-1"></div>
          </div>
          <div className="text-center">
            <div className="font-medium">09:00</div>
            <div className="w-px h-2 bg-gray-300 mx-auto mt-1"></div>
          </div>
          <div className="text-center">
            <div className="font-medium">06:00</div>
            <div className="w-px h-2 bg-gray-300 mx-auto mt-1"></div>
          </div>
        </div>
        
        {/* Timeline background - Two-tone for current day */}
        <div 
          ref={barRef}
          className="relative h-8 rounded-lg shadow-inner border border-gray-300 cursor-pointer hover:shadow-md transition-all duration-200 overflow-hidden"
          onClick={handleClick}
        >
          {isCurrentDay ? (
            // Two-tone timeline for current day
            <>
              {/* Available footage area - normal gradient */}
              <div 
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50"
                style={{ width: `${availablePercentage * 100}%` }}
              />
              {/* Unavailable footage area - gray */}
              <div 
                className="absolute top-0 h-full bg-gray-300 opacity-70"
                style={{ 
                  left: `${availablePercentage * 100}%`, 
                  width: `${(1 - availablePercentage) * 100}%` 
                }}
              />
            </>
          ) : (
            // Full gradient for past days
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50" />
          )}
          {/* Hour divisions */}
          <div className="absolute inset-0 flex">
            {Array.from({ length: 24 }, (_, i) => (
              <div key={i} className="flex-1 border-r border-gray-200 last:border-r-0 opacity-20"></div>
            ))}
          </div>
          
          {/* Time period gradients (Reversed: לילה → בוקר) */}
          <div className="absolute inset-0 flex">
            <div className="bg-gradient-to-r from-indigo-100/30 to-indigo-200/30 rounded-l-lg" style={{ width: '25%' }}></div>
            <div className="bg-gradient-to-r from-purple-100/30 to-purple-200/30" style={{ width: '25%' }}></div>
            <div className="bg-gradient-to-r from-orange-100/30 to-orange-200/30" style={{ width: '25%' }}></div>
            <div className="bg-gradient-to-r from-yellow-100/30 to-yellow-200/30 rounded-r-lg" style={{ width: '25%' }}></div>
          </div>
          
          {/* Confirmed cuts */}
          {cuts.map((cut, index) => (
            <div key={index}>
              <div 
                className="absolute top-0 bottom-0 bg-green-400/50 border-l-2 border-green-500 z-10"
                style={{ 
                  left: `${getPercent(cut.start)}%`,
                  width: `${getPercent(cut.end - cut.start)}%`
                }}
              ></div>
            </div>
          ))}
          
          {/* Active cut indicator */}
          {cutStart !== null && (
            <div 
              className="absolute top-0 bottom-0 bg-blue-400/50 border-l-2 border-blue-500 z-10"
              style={{ 
                left: `${getPercent(cutStart)}%`,
                width: `${getPercent(Math.min(currentTime - cutStart, duration - cutStart))}%`
              }}
            ></div>
          )}
          
          {/* Current position indicator - Blue dot with עכשיו */}
          <motion.div 
            className="absolute top-0 bottom-0 w-1 bg-blue-500 z-20" 
            initial={false}
            animate={{ left: `${playheadPercent}%` }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          >
            <div className="absolute -top-1 -left-1 w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
            <div className="absolute -bottom-6 -left-8 text-xs text-blue-600 font-medium whitespace-nowrap">עכשיו</div>
          </motion.div>
        </div>
        
        {/* Time period legend */}
        <div className="mt-4 space-y-2">
          <div className="flex justify-between text-xs text-gray-400 px-2">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-indigo-200 rounded-full"></span>
              לילה
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-purple-200 rounded-full"></span>
              ערב
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-orange-200 rounded-full"></span>
              צהריים
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-yellow-200 rounded-full"></span>
              בוקר
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
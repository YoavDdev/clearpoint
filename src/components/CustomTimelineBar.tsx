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
      <div className="relative bg-gray-800 rounded-lg p-2 sm:p-4 border border-gray-700">
        {/* Responsive Time markers - Show fewer on mobile */}
        <div className="flex justify-between text-xs text-gray-300 mb-2">
          {/* Mobile: Show only key times - REVERSED ORDER */}
          <div className="sm:hidden flex justify-between w-full">
            <div className="text-center">
              <div className="font-medium text-xs">06:00</div>
              <div className="w-px h-1 bg-gray-500 mx-auto mt-0.5"></div>
            </div>
            <div className="text-center">
              <div className="font-medium text-xs">00:00</div>
              <div className="w-px h-1 bg-gray-500 mx-auto mt-0.5"></div>
            </div>
            <div className="text-center">
              <div className="font-medium text-xs">18:00</div>
              <div className="w-px h-1 bg-gray-500 mx-auto mt-0.5"></div>
            </div>
            <div className="text-center">
              <div className="font-medium text-xs">12:00</div>
              <div className="w-px h-1 bg-gray-500 mx-auto mt-0.5"></div>
            </div>
            <div className="text-center">
              <div className="font-medium text-xs">06:00</div>
              <div className="w-px h-1 bg-gray-500 mx-auto mt-0.5"></div>
            </div>
          </div>
          
          {/* Desktop: Show all times */}
          <div className="hidden sm:flex justify-between w-full">
            <div className="text-center">
              <div className="font-medium">06:00</div>
              <div className="w-px h-2 bg-gray-500 mx-auto mt-1"></div>
            </div>
            <div className="text-center">
              <div className="font-medium">03:00</div>
              <div className="w-px h-2 bg-gray-500 mx-auto mt-1"></div>
            </div>
            <div className="text-center">
              <div className="font-medium">00:00</div>
              <div className="w-px h-2 bg-gray-500 mx-auto mt-1"></div>
            </div>
            <div className="text-center">
              <div className="font-medium">21:00</div>
              <div className="w-px h-2 bg-gray-500 mx-auto mt-1"></div>
            </div>
            <div className="text-center">
              <div className="font-medium">18:00</div>
              <div className="w-px h-2 bg-gray-500 mx-auto mt-1"></div>
            </div>
            <div className="text-center">
              <div className="font-medium">15:00</div>
              <div className="w-px h-2 bg-gray-500 mx-auto mt-1"></div>
            </div>
            <div className="text-center">
              <div className="font-medium">12:00</div>
              <div className="w-px h-2 bg-gray-500 mx-auto mt-1"></div>
            </div>
            <div className="text-center">
              <div className="font-medium">09:00</div>
              <div className="w-px h-2 bg-gray-500 mx-auto mt-1"></div>
            </div>
            <div className="text-center">
              <div className="font-medium">06:00</div>
              <div className="w-px h-2 bg-gray-500 mx-auto mt-1"></div>
            </div>
          </div>
        </div>
        
        {/* Responsive Timeline background - Two-tone for current day */}
        <div 
          ref={barRef}
          className="relative h-6 sm:h-8 rounded-lg shadow-inner border border-gray-300 cursor-pointer hover:shadow-md transition-all duration-200 overflow-hidden"
          onClick={handleClick}
        >
          {isCurrentDay ? (
            // Two-tone timeline for current day
            <>
              {/* Available footage area - same beautiful gradient as past days */}
              <div 
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-900/30 via-indigo-900/30 to-purple-900/30"
                style={{ width: `${availablePercentage * 100}%` }}
              />
              {/* Unavailable footage area - professional design matching dashboard */}
              <div 
                className="absolute top-0 h-full bg-gradient-to-r from-gray-500/60 to-gray-600/70 border-l border-gray-400"
                style={{ 
                  left: `${availablePercentage * 100}%`, 
                  width: `${(1 - availablePercentage) * 100}%` 
                }}
              >
                {/* Subtle diagonal pattern */}
                <div 
                  className="absolute inset-0 opacity-30"
                  style={{
                    backgroundImage: `repeating-linear-gradient(-45deg, transparent, transparent 4px, rgba(156, 163, 175, 0.4) 4px, rgba(156, 163, 175, 0.4) 8px)`
                  }}
                />
                {/* Professional overlay with subtle animation */}
                <div className="absolute inset-0 bg-gray-700/20 animate-pulse" style={{ animationDuration: '3s' }} />
              </div>
            </>
          ) : (
            // Full gradient for past days
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-blue-900/30 via-indigo-900/30 to-purple-900/30" />
          )}
          {/* Hour divisions */}
          <div className="absolute inset-0 flex">
            {Array.from({ length: 24 }, (_, i) => (
              <div key={i} className="flex-1 border-r border-gray-600 last:border-r-0 opacity-20"></div>
            ))}
          </div>
          
          {/* Time period gradients (Reversed: לילה → בוקר) */}
          <div className="absolute inset-0 flex">
            <div className="bg-gradient-to-r from-indigo-600/20 to-indigo-500/20" style={{ width: '25%' }}></div>
            <div className="bg-gradient-to-r from-purple-600/20 to-purple-500/20" style={{ width: '25%' }}></div>
            <div className="bg-gradient-to-r from-orange-600/20 to-orange-500/20" style={{ width: '25%' }}></div>
            <div className="bg-gradient-to-r from-yellow-600/20 to-yellow-500/20" style={{ width: '25%' }}></div>
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
          
          {/* Responsive Current position indicator - Blue dot with עכשיו */}
          <motion.div 
            className="absolute top-0 bottom-0 w-0.5 sm:w-1 bg-blue-500 z-30" 
            initial={false}
            animate={{ left: `${playheadPercent}%` }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          >
            <div className="absolute -top-0.5 sm:-top-1 -left-1 sm:-left-1 w-2 h-2 sm:w-3 sm:h-3 bg-blue-500 rounded-full animate-pulse shadow-md"></div>
            {/* Fixed positioning for עכשיו text - always relative to left with dynamic offset */}
            <div 
              className="absolute -bottom-5 sm:-bottom-6 text-xs text-blue-400 font-medium whitespace-nowrap"
              style={{
                left: playheadPercent > 85 ? '-32px' : playheadPercent < 10 ? '8px' : '-24px'
              }}
            >
              עכשיו
            </div>
          </motion.div>
        </div>
        
        {/* Responsive Time period legend */}
        <div className="mt-2 sm:mt-4 space-y-2">
          <div className="flex justify-between text-xs text-gray-300 px-1 sm:px-2">
            <span className="flex items-center gap-0.5 sm:gap-1">
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-indigo-400 rounded-full"></span>
              <span className="text-xs">לילה</span>
            </span>
            <span className="flex items-center gap-0.5 sm:gap-1">
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-purple-400 rounded-full"></span>
              <span className="text-xs">ערב</span>
            </span>
            <span className="flex items-center gap-0.5 sm:gap-1">
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-orange-400 rounded-full"></span>
              <span className="text-xs">צהריים</span>
            </span>
            <span className="flex items-center gap-0.5 sm:gap-1">
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-yellow-400 rounded-full"></span>
              <span className="text-xs">בוקר</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
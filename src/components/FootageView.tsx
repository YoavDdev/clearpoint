'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { format, isBefore } from 'date-fns';
import FootageTimelinePlayer from './FootageTimelinePlayer';
import {
  Loader2,
  Camera,
  Video,
  VideoOff,
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronUp,
  ChevronLeft
} from 'lucide-react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

interface VodClip {
  id: string;
  timestamp: string;
  duration: number;
  url: string;
  thumbnail_url?: string;
}

interface FootageViewProps {
  cameras: { id: string; name: string }[];
}

export default function FootageView({ cameras }: FootageViewProps) {
  const [allCameraClips, setAllCameraClips] = useState<{[cameraId: string]: VodClip[]}>({});
  const [retentionDays, setRetentionDays] = useState<number>(14);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);
  // Camera-specific timeline states
  const [cameraTimelineTime, setCameraTimelineTime] = useState<{[cameraId: string]: Date | null}>({});
  const [cameraTimelinePosition, setCameraTimelinePosition] = useState<{[cameraId: string]: number | null}>({});
  const [cameraPlayingClip, setCameraPlayingClip] = useState<{[cameraId: string]: VodClip | null}>({});
  const [currentClipIndex, setCurrentClipIndex] = useState<{[cameraId: string]: number}>({});
  const [isShowingPreviousDay, setIsShowingPreviousDay] = useState<boolean>(false);

  // Load current day's recordings for all cameras on component mount
  useEffect(() => {
    const loadAllCameraRecordings = async () => {
      setLoading(true);
      
      // Fetch plan info
      const planRes = await fetch('/api/user-cameras');
      const planResult = await planRes.json();
      if (planResult.success && planResult.plan_duration_days) {
        setRetentionDays(planResult.plan_duration_days);
      }

      // Load current day's recordings for all cameras (6:00 AM to 6:00 AM cycle)
      const now = new Date();
      const currentHour = now.getHours();
      
      // If it's before 6:00 AM, use previous day's date
      // If it's 6:00 AM or later, use current day's date
      const effectiveDate = new Date(now);
      const isBeforeSixAM = currentHour < 6;
      if (isBeforeSixAM) {
        effectiveDate.setDate(effectiveDate.getDate() - 1);
      }
      
      // Set the selected date to the effective date so UI shows correct day
      setSelectedDate(effectiveDate);
      // Track if we're showing previous day for explanation message
      setIsShowingPreviousDay(isBeforeSixAM);
      
      const dateToLoad = format(effectiveDate, 'yyyy-MM-dd');
      const allClips: {[cameraId: string]: VodClip[]} = {};

      for (const camera of cameras) {
        try {
          const allCameraClips: VodClip[] = [];
          const now = Date.now();
          const currentHour = new Date().getHours();
          
          // If it's before 6:00 AM, we need clips from two dates:
          // 1. Yesterday from 6:00 AM onwards
          // 2. Today from midnight until current time
          if (currentHour < 6) {
            // Get yesterday's clips (from 6:00 AM onwards)
            const yesterdayRes = await fetch('/api/user-footage', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ cameraId: camera.id, date: dateToLoad }),
            });
            
            const yesterdayData = await yesterdayRes.json();
            const yesterdayFiltered = yesterdayData.filter((clip: VodClip) => {
              const clipDate = new Date(clip.timestamp);
              const clipHour = clipDate.getHours();
              const ageInDays = (now - clipDate.getTime()) / 86400000;
              return clipHour >= 6 && ageInDays <= (planResult.plan_duration_days || 14);
            });
            
            allCameraClips.push(...yesterdayFiltered);
            
            // Get today's clips (from midnight until current time)
            const todayDate = format(new Date(), 'yyyy-MM-dd');
            const todayRes = await fetch('/api/user-footage', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ cameraId: camera.id, date: todayDate }),
            });
            
            const todayData = await todayRes.json();
            const todayFiltered = todayData.filter((clip: VodClip) => {
              const clipDate = new Date(clip.timestamp);
              const clipHour = clipDate.getHours();
              const ageInDays = (now - clipDate.getTime()) / 86400000;
              return clipHour < 6 && ageInDays <= (planResult.plan_duration_days || 14);
            });
            
            allCameraClips.push(...todayFiltered);
          } else {
            // If it's after 6:00 AM, just get today's clips from 6:00 AM onwards
            const res = await fetch('/api/user-footage', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ cameraId: camera.id, date: dateToLoad }),
            });
            
            const data = await res.json();
            const filtered = data.filter((clip: VodClip) => {
              const clipDate = new Date(clip.timestamp);
              const clipHour = clipDate.getHours();
              const ageInDays = (now - clipDate.getTime()) / 86400000;
              return clipHour >= 6 && ageInDays <= (planResult.plan_duration_days || 14);
            });
            
            allCameraClips.push(...filtered);
          }

          const sorted = allCameraClips.sort(
            (a: VodClip, b: VodClip) =>
              new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );

          allClips[camera.id] = sorted;
        } catch (error) {
          console.error(`Error loading clips for camera ${camera.id}:`, error);
          allClips[camera.id] = [];
        }
      }

      setAllCameraClips(allClips);
      setLoading(false);
    };

    if (cameras.length > 0) {
      loadAllCameraRecordings();
    }
  }, [cameras]);

  // Load available dates for all cameras
  useEffect(() => {
    const loadAvailableDates = async () => {
      if (cameras.length === 0) return;
      
      const allDates = new Set<string>();
      
      for (const camera of cameras) {
        try {
          const res = await fetch(`/api/user-footage-dates?cameraId=${camera.id}`);
          const result = await res.json();
          if (result.success && result.dates) {
            result.dates.forEach((date: string) => allDates.add(date));
          }
        } catch (error) {
          console.error(`Error loading dates for camera ${camera.id}:`, error);
        }
      }
      
      const sortedDates = Array.from(allDates).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
      setAvailableDates(sortedDates);
    };

    loadAvailableDates();
  }, [cameras]);

  // Function to load footage for a specific date
  const loadFootageForDate = async (targetDate: Date) => {
    setLoading(true);
    setSelectedDate(targetDate);
    
    const dateStr = format(targetDate, 'yyyy-MM-dd');
    const allClips: {[cameraId: string]: VodClip[]} = {};
    
    // Get plan info
    const planRes = await fetch('/api/user-cameras');
    const planResult = await planRes.json();
    const retentionDays = planResult.success && planResult.plan_duration_days ? planResult.plan_duration_days : 14;
    
    for (const camera of cameras) {
      try {
        const allCameraClips: VodClip[] = [];
        const now = Date.now();
        
        // Get clips for the selected date (from 6:00 AM onwards)
        const res = await fetch('/api/user-footage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cameraId: camera.id, date: dateStr }),
        });
        
        const data = await res.json();
        const filtered = data.filter((clip: VodClip) => {
          const clipDate = new Date(clip.timestamp);
          const clipHour = clipDate.getHours();
          const ageInDays = (now - clipDate.getTime()) / 86400000;
          return clipHour >= 6 && ageInDays <= retentionDays;
        });
        
        allCameraClips.push(...filtered);
        
        // Get clips for the next day (until 6:00 AM)
        const nextDay = new Date(targetDate);
        nextDay.setDate(nextDay.getDate() + 1);
        const nextDayStr = format(nextDay, 'yyyy-MM-dd');
        
        const nextDayRes = await fetch('/api/user-footage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cameraId: camera.id, date: nextDayStr }),
        });
        
        const nextDayData = await nextDayRes.json();
        const nextDayFiltered = nextDayData.filter((clip: VodClip) => {
          const clipDate = new Date(clip.timestamp);
          const clipHour = clipDate.getHours();
          const ageInDays = (now - clipDate.getTime()) / 86400000;
          return clipHour < 6 && ageInDays <= retentionDays;
        });
        
        allCameraClips.push(...nextDayFiltered);
        
        const sorted = allCameraClips.sort(
          (a: VodClip, b: VodClip) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        
        allClips[camera.id] = sorted;
      } catch (error) {
        console.error(`Error loading clips for camera ${camera.id}:`, error);
        allClips[camera.id] = [];
      }
    }
    
    setAllCameraClips(allClips);
    
    // Initialize timeline position and time display for each camera when footage loads
    cameras.forEach(camera => {
      const clips = allClips[camera.id];
      if (clips && clips.length > 0) {
        // Initialize with the first clip's timestamp
        const firstClip = clips[0];
        const firstClipTime = new Date(firstClip.timestamp);
        
        // Calculate initial position on 6AM-6AM timeline
        const baseDate = targetDate;
        const timelineStart = new Date(baseDate);
        timelineStart.setHours(6, 0, 0, 0);
        
        // Handle next day if time is before 6AM
        if (firstClipTime.getHours() < 6) {
          timelineStart.setDate(timelineStart.getDate() + 1);
        }
        
        const timeOffset = firstClipTime.getTime() - timelineStart.getTime();
        const timelinePercentage = Math.max(0, Math.min(1, timeOffset / (24 * 60 * 60 * 1000)));
        
        // Set initial timeline position and time
        setCameraTimelineTime(prev => ({ ...prev, [camera.id]: firstClipTime }));
        setCameraTimelinePosition(prev => ({ ...prev, [camera.id]: timelinePercentage }));
        setCurrentClipIndex(prev => ({ ...prev, [camera.id]: 0 }));
      }
    });
    
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      {/* Header with Date Selection */}
      <div className="text-right">
        <h2 className="text-2xl font-bold text-white mb-2">הקלטות אבטחה</h2>
        <p className="text-gray-400 mb-4">
          צפה ונתח את צילומי האבטחה שלך. זמין עד {retentionDays} ימים אחורה.
        </p>
        
        {/* Explanation message when showing previous day */}
        {isShowingPreviousDay && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-xs font-bold">i</span>
              </div>
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">מציג הקלטות מהמחזור הנוכחי</p>
                <p className="text-blue-700">
                  מכיוון שהשעה כרגע לפני 06:00, אתה צופה בהקלטות מהמחזור הנוכחי (06:00 אתמול עד 06:00 היום).
                  זהו המחזור שכולל את הזמן הנוכחי.
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Date Selection */}
        <div className="bg-gray-800 rounded-lg border border-gray-600 p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-white">בחירת תאריך</h3>
            <button
              onClick={() => {
                setSelectedDate(null);
                // Reload current day footage
                const loadCurrentDay = async () => {
                  setLoading(true);
                  // Re-run the initial loading logic
                  window.location.reload();
                };
                loadCurrentDay();
              }}
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              חזרה להיום הנוכחי
            </button>
          </div>
          
          <div className="relative">
            <button
              onClick={() => setDateDropdownOpen(!dateDropdownOpen)}
              className="flex items-center justify-between w-full p-3 bg-gray-700 rounded-lg border border-gray-600 hover:border-blue-400 text-white"
            >
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <CalendarIcon className="w-5 h-5 text-blue-400" />
                <span className="font-medium">
                  {selectedDate
                    ? selectedDate.toLocaleDateString('he-IL', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })
                    : 'היום הנוכחי (6:00-6:00)'}
                </span>
              </div>
              {dateDropdownOpen ? (
                <ChevronUp className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
            </button>

            {dateDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-lg z-10 p-4">
                <Calendar
                  onChange={(date) => {
                    if (date) {
                      loadFootageForDate(date as Date);
                      setDateDropdownOpen(false);
                    }
                  }}
                  value={selectedDate}
                  locale="he-IL"
                  className="react-calendar-dark"
                  tileDisabled={({ date }) => {
                    const dateStr = format(date, 'yyyy-MM-dd');
                    const retentionLimit = new Date(Date.now() - retentionDays * 86400000);
                    return isBefore(date, retentionLimit) || !availableDates.includes(dateStr);
                  }}
                  minDetail="month"
                  next2Label={null}
                  prev2Label={null}
                  showNeighboringMonth={false}
                  tileClassName={({ date }) => {
                    const dateStr = format(date, 'yyyy-MM-dd');
                    return availableDates.includes(dateStr)
                      ? 'react-calendar__tile--available'
                      : '';
                  }}
                />

                <div className="flex justify-between items-center pt-2 border-t border-gray-600 mt-2">
                  <span className="text-sm text-gray-400">
                    {availableDates.length} תאריכים זמינים
                  </span>
                  <span className="text-xs text-gray-400">
                    זמין עד {retentionDays} ימים אחורה
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin mb-2" />
          <p className="text-gray-300">טוען הקלטות...</p>
        </div>
      ) : (
        // All Cameras Auto-Playing Footage
        <div className="space-y-6">
          <h3 className="text-lg font-medium text-white">
            {selectedDate 
              ? `הקלטות מ-${selectedDate.toLocaleDateString('he-IL')} - רצות אוטומטית`
              : 'הקלטות מהיום - רצות אוטומטית'
            }
          </h3>
          <div className={`grid gap-4 ${
            cameras.length === 1 ? 'grid-cols-1' :
            cameras.length === 2 ? 'grid-cols-1 lg:grid-cols-2' :
            cameras.length === 3 ? 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3' :
            'grid-cols-1 lg:grid-cols-2'
          }`}>
            {cameras.map((camera, index) => {
              const clips = allCameraClips[camera.id] || [];
              return (
                <div key={camera.id} className="bg-gray-800 rounded-lg border border-gray-600 overflow-hidden">
                  {/* Camera Header */}
                  <div className="p-4 border-b border-gray-600">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 rtl:space-x-reverse">
                        <Camera className="w-5 h-5 text-blue-400" />
                        <h4 className="text-white font-medium">{camera.name}</h4>
                        <span className="text-gray-400 text-sm">#{index + 1}</span>
                      </div>
                      <div className="flex items-center space-x-2 rtl:space-x-reverse">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                        <span className="text-sm text-gray-300">{clips.length} קטעים</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Simple Video Player */}
                  <div className="p-4">
                    {clips.length > 0 ? (
                      <div className="space-y-4">
                        {/* Video Container */}
                        <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                          <video 
                            id={`video-${camera.id}`}
                            className="w-full h-full object-cover"
                            controls
                            autoPlay
                            muted
                            src={clips[currentClipIndex[camera.id] || 0]?.url}
                            poster={clips[currentClipIndex[camera.id] || 0]?.thumbnail_url}
                            onEnded={() => {
                              const currentIndex = currentClipIndex[camera.id] || 0;
                              const nextIndex = currentIndex + 1;
                              
                              // If there's a next clip, play it automatically
                              if (nextIndex < clips.length) {
                                setCurrentClipIndex(prev => ({ ...prev, [camera.id]: nextIndex }));
                                
                                // Update the video source to the next clip
                                const video = document.querySelector(`#video-${camera.id}`) as HTMLVideoElement;
                                if (video && clips[nextIndex]) {
                                  video.src = clips[nextIndex].url;
                                  video.load();
                                  video.play().catch(error => {
                                    console.log('Auto-play next clip error:', error);
                                  });
                                  
                                  // Update timeline tracking for the new clip
                                  setCameraPlayingClip(prev => ({ ...prev, [camera.id]: clips[nextIndex] }));
                                }
                              }
                            }}
                          >
                            <source src={clips[currentClipIndex[camera.id] || 0]?.url} type="video/mp4" />
                            הדפדפן שלך לא תומך בהשמעת וידאו
                          </video>
                          

                        </div>
                        
                        {/* Clip Navigation */}
                        {clips.length > 1 && (
                          <div className="space-y-2">
                            {/* Visual Timeline */}
                            <div className="space-y-2">
                              
                              {/* Timeline Bar */}
                              <div className="relative bg-gray-50 rounded-lg p-4 border border-gray-200">

                                
                                {/* Hour markers */}
                                <div className="flex justify-between text-xs text-gray-400 mb-2">
                                  {Array.from({ length: 9 }, (_, i) => {
                                    const hour = (6 + i * 3) % 24;
                                    return (
                                      <div key={i} className="text-center">
                                        <div className="font-medium">{hour.toString().padStart(2, '0')}:00</div>
                                        <div className="w-px h-2 bg-gray-300 mx-auto mt-1"></div>
                                      </div>
                                    );
                                  })}
                                </div>
                                
                                {/* Timeline background */}
                                <div 
                                  className="relative h-8 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-lg shadow-inner border border-gray-300 cursor-pointer hover:shadow-md transition-all duration-200"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const clickX = e.clientX - rect.left;
                                    const percentage = Math.max(0, Math.min(1, clickX / rect.width));
                                    // Invert percentage for RTL - right side is beginning (6AM), left side is end (6AM next day)
                                    const invertedPercentage = 1 - percentage;
                                    
                                    // Calculate target time in the 6AM-6AM cycle
                                    const totalMinutes = invertedPercentage * 24 * 60; // 24 hours in minutes
                                    
                                    // Create target time based on the selected date or current date
                                    const baseDate = selectedDate || new Date();
                                    const targetTime = new Date(baseDate);
                                    
                                    // Set to 6 AM of the selected date
                                    targetTime.setHours(6, 0, 0, 0);
                                    
                                    // Add the offset from the timeline click
                                    targetTime.setMinutes(targetTime.getMinutes() + totalMinutes);
                                    
                                    console.log('Timeline click:', {
                                      percentage,
                                      totalMinutes,
                                      targetTime: targetTime.toISOString(),
                                      availableClips: clips.length
                                    });
                                    
                                    // Find the clip that contains this time or is closest to it
                                    let bestClipIndex = 0;
                                    let bestScore = Infinity;
                                    
                                    clips.forEach((clip, index) => {
                                      const clipTime = new Date(clip.timestamp);
                                      const clipEndTime = new Date(clipTime.getTime() + 15 * 60 * 1000); // 15 min clips
                                      
                                      // Check if target time is within this clip
                                      if (targetTime >= clipTime && targetTime <= clipEndTime) {
                                        bestClipIndex = index;
                                        bestScore = 0; // Perfect match
                                        return;
                                      }
                                      
                                      // Otherwise find closest clip
                                      const timeDiff = Math.abs(clipTime.getTime() - targetTime.getTime());
                                      if (timeDiff < bestScore) {
                                        bestScore = timeDiff;
                                        bestClipIndex = index;
                                      }
                                    });
                                    
                                    const selectedClip = clips[bestClipIndex];
                                    if (!selectedClip) return;
                                    
                                    // Calculate the seek time within the selected clip
                                    const clipStartTime = new Date(selectedClip.timestamp);
                                    const seekOffsetMs = Math.max(0, targetTime.getTime() - clipStartTime.getTime());
                                    const seekOffsetSeconds = Math.min(15 * 60, seekOffsetMs / 1000); // Max 15 minutes
                                    
                                    console.log('Seeking to:', {
                                      clipIndex: bestClipIndex,
                                      clipStartTime: clipStartTime.toISOString(),
                                      seekOffsetSeconds,
                                      clipUrl: selectedClip.url
                                    });
                                    
                                    // Update the current timeline time display for this camera
                                    setCameraTimelineTime(prev => ({ ...prev, [camera.id]: targetTime }));
                                    // Store the timeline position for the dot indicator for this camera
                                    setCameraTimelinePosition(prev => ({ ...prev, [camera.id]: invertedPercentage }));
                                    
                                    // Handle video seeking
                                    const video = document.querySelector(`#video-${camera.id}`) as HTMLVideoElement;
                                    if (video && selectedClip) {
                                      // Store the current playing clip for time tracking for this camera
                                      setCameraPlayingClip(prev => ({ ...prev, [camera.id]: selectedClip }));
                                      
                                      video.src = selectedClip.url;
                                      video.load();
                                      
                                      // Wait for video to be ready before seeking
                                      const handleLoadedData = () => {
                                        if (video.readyState >= 2) {
                                          try {
                                            video.currentTime = seekOffsetSeconds;
                                            video.play().catch(error => {
                                              console.log('Video play error:', error);
                                            });
                                          } catch (error) {
                                            console.warn('Failed to seek video:', error);
                                          }
                                        }
                                        video.removeEventListener('loadeddata', handleLoadedData);
                                      };
                                      
                                      video.addEventListener('loadeddata', handleLoadedData);
                                      
                                      // Add time update listener for real-time position tracking
                                      const handleTimeUpdate = () => {
                                        if (video && selectedClip) {
                                          const clipStartTime = new Date(selectedClip.timestamp);
                                          const currentVideoTime = video.currentTime * 1000; // Convert to milliseconds
                                          const actualTime = new Date(clipStartTime.getTime() + currentVideoTime);
                                          
                                          // Calculate position on 6AM-6AM timeline
                                          const baseDate = selectedDate || new Date();
                                          const timelineStart = new Date(baseDate);
                                          timelineStart.setHours(6, 0, 0, 0);
                                          
                                          // Handle next day if time is before 6AM
                                          if (actualTime.getHours() < 6) {
                                            timelineStart.setDate(timelineStart.getDate() + 1);
                                          }
                                          
                                          const timelineEnd = new Date(timelineStart.getTime() + 24 * 60 * 60 * 1000);
                                          const timeOffset = actualTime.getTime() - timelineStart.getTime();
                                          const timelinePercentage = Math.max(0, Math.min(1, timeOffset / (24 * 60 * 60 * 1000)));
                                          
                                          // Update both time and position for this specific camera
                                          setCameraTimelineTime(prev => ({ ...prev, [camera.id]: actualTime }));
                                          setCameraTimelinePosition(prev => ({ ...prev, [camera.id]: timelinePercentage }));
                                        }
                                      };
                                      
                                      // Remove any existing time update listener
                                      video.removeEventListener('timeupdate', handleTimeUpdate);
                                      // Add new time update listener
                                      video.addEventListener('timeupdate', handleTimeUpdate);
                                    }
                                  }}
                                >
                                  {(() => {
                                    // Calculate if this is the current day and available footage range
                                    const now = new Date();
                                    const currentHour = now.getHours();
                                    const effectiveDate = new Date(now);
                                    if (currentHour < 6) {
                                      effectiveDate.setDate(effectiveDate.getDate() - 1);
                                    }
                                    
                                    const isCurrentDay = selectedDate ? 
                                      selectedDate.toDateString() === effectiveDate.toDateString() : true;
                                    
                                    let availablePercentage = 1; // Default to full timeline
                                    
                                    if (isCurrentDay) {
                                      // Use actual current time for live edge calculation
                                      const currentTime = new Date();
                                      const currentHour = currentTime.getHours();
                                      const currentMinute = currentTime.getMinutes();
                                      
                                      // Calculate position in 6AM-6AM cycle
                                      let hoursFromSix;
                                      if (currentHour >= 6) {
                                        // Same day: 6:00 AM to 11:59 PM
                                        hoursFromSix = currentHour - 6;
                                      } else {
                                        // Next day: 12:00 AM to 5:59 AM
                                        hoursFromSix = (currentHour + 24) - 6;
                                      }
                                      
                                      // Convert to total minutes and calculate percentage
                                      const totalMinutesFromSix = hoursFromSix * 60 + currentMinute;
                                      const totalCycleMinutes = 24 * 60; // 1440 minutes in 24 hours
                                      availablePercentage = Math.min(1, totalMinutesFromSix / totalCycleMinutes);
                                      
                                      console.log('Timeline Debug:', {
                                        currentTime: currentTime.toLocaleTimeString(),
                                        currentHour,
                                        currentMinute,
                                        hoursFromSix,
                                        totalMinutesFromSix,
                                        availablePercentage,
                                        expectedPosition: `${(1 - availablePercentage) * 100}% from left (RTL)`
                                      });
                                    }
                                    
                                    return (
                                      <>
                                        {/* Timeline segments for better visualization */}
                                        <div className="absolute inset-0 flex">
                                          {Array.from({ length: 24 }, (_, i) => {
                                            const segmentPercentage = (i + 1) / 24;
                                            const isAvailable = segmentPercentage <= availablePercentage;
                                            return (
                                              <div 
                                                key={i} 
                                                className={`flex-1 border-r border-gray-200 last:border-r-0 ${
                                                  isAvailable ? 'opacity-20' : 'opacity-5'
                                                }`}
                                              />
                                            );
                                          })}
                                        </div>
                                        
                                        {/* Available footage area */}
                                        <div 
                                          className="absolute inset-y-0 right-0 bg-blue-50/20 border-l-2 border-blue-300/50"
                                          style={{ width: `${availablePercentage * 100}%` }}
                                        />
                                        
                                        {/* Subtle time period indicators - only for available portion */}
                                        <div className="absolute inset-0 flex">
                                          {/* Morning (6AM-12PM) */}
                                          <div 
                                            className="bg-gradient-to-r from-yellow-100/30 to-yellow-200/30 rounded-l-lg"
                                            style={{ width: `${Math.min(25, availablePercentage * 100)}%` }}
                                          ></div>
                                          {/* Afternoon (12PM-6PM) */}
                                          {availablePercentage > 0.25 && (
                                            <div 
                                              className="bg-gradient-to-r from-orange-100/30 to-orange-200/30"
                                              style={{ width: `${Math.min(25, (availablePercentage - 0.25) * 100)}%` }}
                                            ></div>
                                          )}
                                          {/* Evening (6PM-12AM) */}
                                          {availablePercentage > 0.5 && (
                                            <div 
                                              className="bg-gradient-to-r from-purple-100/30 to-purple-200/30"
                                              style={{ width: `${Math.min(25, (availablePercentage - 0.5) * 100)}%` }}
                                            ></div>
                                          )}
                                          {/* Night (12AM-6AM) */}
                                          {availablePercentage > 0.75 && (
                                            <div 
                                              className="bg-gradient-to-r from-indigo-100/30 to-indigo-200/30 rounded-r-lg"
                                              style={{ width: `${Math.min(25, (availablePercentage - 0.75) * 100)}%` }}
                                            ></div>
                                          )}
                                        </div>
                                        
                                        {/* Live edge indicator for current day */}
                                        {isCurrentDay && availablePercentage < 1 && (
                                          <div 
                                            className="absolute top-0 bottom-0 w-1 bg-red-500 z-20"
                                            style={{ left: `${(1 - availablePercentage) * 100}%` }}
                                          >
                                            <div className="absolute -top-1 -left-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                                            <div className="absolute -bottom-6 -left-8 text-xs text-red-600 font-medium whitespace-nowrap">
                                              עכשיו
                                            </div>
                                          </div>
                                        )}
                                      </>
                                    );
                                  })()}
                                  
                                  {/* Timeline Position Dot */}
                                  {cameraTimelinePosition[camera.id] !== null && cameraTimelinePosition[camera.id] !== undefined && (
                                    <div 
                                      className="absolute top-1/2 transform -translate-y-1/2 -translate-x-1/2 z-10"
                                      style={{ left: `${(1 - cameraTimelinePosition[camera.id]!) * 100}%` }}
                                    >
                                      <div className="w-4 h-4 bg-blue-500 border-2 border-white rounded-full shadow-lg animate-pulse"></div>
                                    </div>
                                  )}
                                </div>
                                

                                
                                {/* Enhanced Timeline legend */}
                                <div className="mt-4 space-y-2">
                                  {/* Time period labels */}
                                  <div className="flex justify-between text-xs text-gray-400 px-2">
                                    <span className="flex items-center gap-1">
                                      <span className="w-2 h-2 bg-yellow-200 rounded-full"></span>
                                      בוקר
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <span className="w-2 h-2 bg-orange-200 rounded-full"></span>
                                      צהריים
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <span className="w-2 h-2 bg-purple-200 rounded-full"></span>
                                      ערב
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <span className="w-2 h-2 bg-indigo-200 rounded-full"></span>
                                      לילה
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <VideoOff className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                        <p className="text-gray-400 text-sm">אין הקלטות בתאריך זה</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import React from "react";
import { FixedSizeList as List } from "react-window";
import {
  Search,
  Filter,
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  Camera,
  Eye,
  Play,
  Pause,
  Signal,
  Wifi,
  Monitor,
  Thermometer,
  BarChart3,
} from "lucide-react";
import Link from "next/link";

interface Camera {
  id: string;
  name: string;
  stream_path: string;
  is_stream_active: boolean;
  created_at: string;
  mini_pc_id: string;
  user_id: string;
  user: {
    full_name: string;
    email: string;
  } | null;
}

interface CameraHealth {
  camera_id: string;
  stream_status: string;
  last_checked: string;
  log_message: string;
}

export function CamerasTable({ 
  cameras, 
  miniPCId 
}: { 
  cameras: Camera[];
  miniPCId: string;
}) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [healthData, setHealthData] = useState<Record<string, CameraHealth | null>>({});

  useEffect(() => {
    async function fetchHealth() {
      const entries = await Promise.all(
        cameras.map(async (camera) => {
          try {
            const res = await fetch(`/api/camera-health/${camera.id}`);
            const json = await res.json();
            return [camera.id, json.success ? json.health : null];
          } catch (err) {
            return [camera.id, null];
          }
        })
      );
      setHealthData(Object.fromEntries(entries));
    }
    
    if (cameras.length > 0) {
      fetchHealth();
      const interval = setInterval(fetchHealth, 30000); // Update every 30 seconds
      return () => clearInterval(interval);
    }
  }, [cameras]);

  const filtered = cameras.filter((camera) => {
    const matchesName = camera.name?.toLowerCase().includes(search.toLowerCase());
    const status = healthData[camera.id]?.stream_status?.toLowerCase();
    const matchesStatus = filterStatus ? status === filterStatus : true;
    return matchesName && matchesStatus;
  });

  const sorted = [...filtered].sort((a, b) => {
    const aHealth = healthData[a.id];
    const bHealth = healthData[b.id];

    const aStatus = aHealth?.stream_status?.toLowerCase() ?? "offline";
    const bStatus = bHealth?.stream_status?.toLowerCase() ?? "offline";

    // Sort by status priority: streaming > reconnecting > error > offline
    const statusPriority = { streaming: 0, reconnecting: 1, error: 2, offline: 3 };
    const aPriority = statusPriority[aStatus as keyof typeof statusPriority] ?? 4;
    const bPriority = statusPriority[bStatus as keyof typeof statusPriority] ?? 4;

    if (aPriority !== bPriority) return aPriority - bPriority;

    const aTime = new Date(aHealth?.last_checked || 0).getTime();
    const bTime = new Date(bHealth?.last_checked || 0).getTime();

    return bTime - aTime; // Most recent first
  });

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const camera = sorted[index];
    const health = healthData[camera.id];
    const isOk = health?.stream_status?.toLowerCase() === "ok";
    const isStale = health?.stream_status?.toLowerCase() === "stale";
    const isMissing = health?.stream_status?.toLowerCase() === "missing";
    const isError = health?.stream_status?.toLowerCase() === "error";
    const isConnecting = health?.stream_status?.toLowerCase() === "connecting";
    
    const lastCheckedAgoSec = health?.last_checked
      ? Math.floor((Date.now() - new Date(health.last_checked).getTime()) / 1000)
      : null;

    return (
      <div dir="rtl" style={style} className="grid grid-cols-[2fr_1fr_1fr_1fr_0.8fr] border-b border-slate-200 px-6 py-4 text-sm items-center hover:bg-slate-50 transition-colors">
        <div className="font-medium text-slate-800">{camera.name}</div>
        
        <div>
          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium ${
            isOk ? "bg-green-100 text-green-700" : 
            isStale ? "bg-orange-100 text-orange-700" :
            isMissing ? "bg-yellow-100 text-yellow-700" :
            isError ? "bg-red-100 text-red-700" :
            isConnecting ? "bg-blue-100 text-blue-700" :
            "bg-slate-100 text-slate-600"
          }`}>
            {isOk ? <CheckCircle size={12} /> : 
             isStale ? <Clock size={12} /> :
             isMissing ? <AlertCircle size={12} /> :
             isError ? <AlertCircle size={12} /> :
             isConnecting ? <Signal size={12} /> :
             <Pause size={12} />}
            {health?.stream_status === "ok" ? "תקין" :
             health?.stream_status === "stale" ? "מיושן" :
             health?.stream_status === "missing" ? "חסר" :
             health?.stream_status === "error" ? "שגיאה" :
             health?.stream_status === "connecting" ? "מתחבר" :
             "לא ידוע"}
          </span>
        </div>

        {/* Log Message */}
        <div className="text-slate-600 text-xs truncate" title={health?.log_message}>
          {health?.log_message || "—"}
        </div>

        {/* Last Check */}
        <div className={`text-xs ${
          lastCheckedAgoSec != null
            ? lastCheckedAgoSec < 60
              ? "text-green-600"
              : lastCheckedAgoSec < 300
              ? "text-orange-600"
              : "text-red-600"
            : "text-slate-400"
        }`}>
          {health?.last_checked
            ? new Date(health.last_checked).toLocaleTimeString("he-IL")
            : "ללא בדיקה"}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard?camera=${camera.id}`}
            className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors group"
            title="צפה במצלמה"
          >
            <Eye size={16} className="group-hover:scale-110 transition-transform" />
          </Link>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div className="text-right">
              <p className="text-slate-600 text-sm font-medium">סה"כ מצלמות</p>
              <p className="text-3xl font-bold text-blue-600">{cameras.length}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Camera size={24} className="text-blue-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div className="text-right">
              <p className="text-slate-600 text-sm font-medium">פעילות</p>
              <p className="text-3xl font-bold text-green-600">
                {Object.values(healthData).filter(h => h?.stream_status?.toLowerCase() === 'streaming').length}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <Play size={24} className="text-green-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div className="text-right">
              <p className="text-slate-600 text-sm font-medium">מתחבר מחדש</p>
              <p className="text-3xl font-bold text-orange-600">
                {Object.values(healthData).filter(h => h?.stream_status?.toLowerCase() === 'reconnecting').length}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <Signal size={24} className="text-orange-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div className="text-right">
              <p className="text-slate-600 text-sm font-medium">שגיאות</p>
              <p className="text-3xl font-bold text-red-600">
                {Object.values(healthData).filter(h => h?.stream_status?.toLowerCase() === 'error' || !h).length}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <AlertCircle size={24} className="text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-8">
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
            <div className="relative flex-1 lg:w-80">
              <Search size={20} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="חפש לפי שם מצלמה..."
                className="w-full pr-10 pl-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            
            <div className="relative">
              <Filter size={20} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <select
                className="pr-10 pl-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-right appearance-none"
                value={filterStatus || ""}
                onChange={(e) => setFilterStatus(e.target.value || null)}
              >
                <option value="">כל הסטטוסים</option>
                <option value="ok">תקין</option>
                <option value="stale">מיושן</option>
                <option value="missing">חסר</option>
                <option value="error">שגיאה</option>
                <option value="connecting">מתחבר</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Cameras Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <div dir="rtl" className="grid grid-cols-[2fr_1fr_1fr_1fr_0.8fr] bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold text-sm px-6 py-4">
            <div className="flex items-center gap-2">
              <Camera size={16} />
              <span>שם מצלמה</span>
            </div>
            <div className="flex items-center gap-2">
              <Activity size={16} />
              <span>סטטוס</span>
            </div>
            <div>הודעה</div>
            <div>בדיקה אחרונה</div>
            <div>פעולות</div>
          </div>
          
          {sorted.length > 0 ? (
            <List
              height={Math.min(sorted.length * 80, 600)}
              itemCount={sorted.length}
              itemSize={80}
              width="100%"
              className="scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100"
              children={Row}
            />
          ) : (
            <div className="p-12 text-center text-slate-500">
              <Camera size={48} className="mx-auto mb-4 text-slate-300" />
              <p className="text-lg font-medium mb-2">לא נמצאו מצלמות</p>
              <p>נסה לשנות את הפילטרים או החיפוש</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

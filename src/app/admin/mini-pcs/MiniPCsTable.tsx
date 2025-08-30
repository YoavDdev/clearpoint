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
  HardDrive,
  Cpu,
  Clock,
  User,
  Monitor,
  Thermometer,
  Wifi,
  BarChart3,
  Eye,
  Camera,
} from "lucide-react";
import Link from "next/link";

interface MiniPC {
  id: string;
  device_name: string;
  hostname: string;
  ip_address: string;
  user_id: string;
  installed_at: string;
  last_seen_at: string | null;
  is_active: boolean;
  user: {
    full_name: string;
    email: string;
  } | null;
  camera_count: number;
}

interface MiniPCHealth {
  overall_status: string;
  cpu_temp_celsius: number | null;
  cpu_usage_pct: number;
  ram_usage_pct: number;
  disk_root_pct: number;
  disk_ram_pct: number;
  load_avg_1min: number;
  uptime_seconds: number;
  internet_connected: boolean;
  ping_internet_ms: number | null;
  total_video_files: number;
  last_checked: string;
  log_message: string;
}

export function MiniPCsTable({ miniPCs }: { miniPCs: MiniPC[] }) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [healthData, setHealthData] = useState<Record<string, MiniPCHealth | null>>({});

  useEffect(() => {
    async function fetchHealth() {
      const entries = await Promise.all(
        miniPCs.map(async (pc) => {
          try {
            const res = await fetch(`/api/mini-pc-health/${pc.id}`);
            const json = await res.json();
            return [pc.id, json.success ? json.health : null];
          } catch (err) {
            return [pc.id, null];
          }
        })
      );
      setHealthData(Object.fromEntries(entries));
    }
    fetchHealth();
    const interval = setInterval(fetchHealth, 60000);
    return () => clearInterval(interval);
  }, [miniPCs]);

  const filtered = miniPCs.filter((pc) => {
    const matchesName = pc.user?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
                       pc.device_name?.toLowerCase().includes(search.toLowerCase());
    const status = healthData[pc.id]?.overall_status?.toLowerCase();
    const matchesStatus = filterStatus ? status === filterStatus : true;
    return matchesName && matchesStatus;
  });

  const sorted = [...filtered].sort((a, b) => {
    const aHealth = healthData[a.id];
    const bHealth = healthData[b.id];

    const aStatus = aHealth?.overall_status?.toLowerCase() ?? "offline";
    const bStatus = bHealth?.overall_status?.toLowerCase() ?? "offline";

    // Sort by status priority: critical > warning > healthy > offline
    const statusPriority = { critical: 0, warning: 1, healthy: 2, offline: 3 };
    const aPriority = statusPriority[aStatus as keyof typeof statusPriority] ?? 4;
    const bPriority = statusPriority[bStatus as keyof typeof statusPriority] ?? 4;

    if (aPriority !== bPriority) return aPriority - bPriority;

    const aTime = new Date(aHealth?.last_checked || 0).getTime();
    const bTime = new Date(bHealth?.last_checked || 0).getTime();

    return bTime - aTime; // Most recent first
  });

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h`;
    return `${Math.floor(seconds / 60)}m`;
  };

  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const pc = sorted[index];
    const health = healthData[pc.id];
    const isHealthy = health?.overall_status?.toLowerCase() === "healthy";
    const isWarning = health?.overall_status?.toLowerCase() === "warning";
    const isCritical = health?.overall_status?.toLowerCase() === "critical";
    const isOffline = !health || health?.overall_status?.toLowerCase() === "offline";
    
    const lastCheckedAgoSec = health?.last_checked
      ? Math.floor((Date.now() - new Date(health.last_checked).getTime()) / 1000)
      : null;

    return (
      <div dir="rtl" style={style} className="grid grid-cols-[1fr_1fr_1fr_1fr_0.8fr_0.8fr_0.8fr_0.8fr_0.8fr_1fr_1.2fr_0.8fr_0.8fr] border-b border-slate-200 px-6 py-4 text-sm items-center hover:bg-slate-50 transition-colors">
        <div className="font-medium text-slate-800">{pc.device_name}</div>
        <div className="text-slate-600">{pc.hostname}</div>
        <div className="text-slate-700">{pc.user?.full_name || "ללא לקוח"}</div>
        <div>
          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium ${
            isHealthy ? "bg-green-100 text-green-700" : 
            isWarning ? "bg-orange-100 text-orange-700" :
            isCritical ? "bg-red-100 text-red-700" :
            "bg-slate-100 text-slate-600"
          }`}>
            {isHealthy ? <CheckCircle size={12} /> : 
             isWarning ? <AlertCircle size={12} /> :
             isCritical ? <AlertCircle size={12} /> :
             <Clock size={12} />}
            {health?.overall_status || "לא מחובר"}
          </span>
        </div>
        
        {/* CPU Temperature */}
        <div className="text-slate-600">
          <span className={`font-medium ${
            (health?.cpu_temp_celsius ?? 0) > 80 ? "text-red-600" :
            (health?.cpu_temp_celsius ?? 0) > 70 ? "text-orange-600" :
            "text-slate-700"
          }`}>
            {health?.cpu_temp_celsius ? `${health.cpu_temp_celsius}°C` : "—"}
          </span>
        </div>

        {/* CPU Usage */}
        <div className="text-slate-600">
          <span className={`font-medium ${
            (health?.cpu_usage_pct ?? 0) > 90 ? "text-red-600" :
            (health?.cpu_usage_pct ?? 0) > 75 ? "text-orange-600" :
            "text-slate-700"
          }`}>
            {health?.cpu_usage_pct ? `${health.cpu_usage_pct.toFixed(1)}%` : "—"}
          </span>
        </div>

        {/* RAM Usage */}
        <div className="text-slate-600">
          <span className={`font-medium ${
            (health?.ram_usage_pct ?? 0) > 90 ? "text-red-600" :
            (health?.ram_usage_pct ?? 0) > 75 ? "text-orange-600" :
            "text-slate-700"
          }`}>
            {health?.ram_usage_pct ? `${health.ram_usage_pct.toFixed(1)}%` : "—"}
          </span>
        </div>

        {/* Disk Usage */}
        <div className="text-slate-600">
          <span className={`font-medium ${
            (health?.disk_root_pct ?? 0) > 90 ? "text-red-600" :
            (health?.disk_root_pct ?? 0) > 75 ? "text-orange-600" :
            "text-slate-700"
          }`}>
            {health?.disk_root_pct ? `${health.disk_root_pct}%` : "—"}
          </span>
        </div>

        {/* Network */}
        <div className="text-slate-600">
          <span className={`inline-flex items-center gap-1 text-xs ${
            health?.internet_connected ? "text-green-600" : "text-red-600"
          }`}>
            <Wifi size={12} />
            {health?.internet_connected ? "מחובר" : "לא מחובר"}
          </span>
        </div>

        {/* Uptime */}
        <div className="text-slate-600 text-xs">
          {health?.uptime_seconds ? formatUptime(health.uptime_seconds) : "—"}
        </div>

        {/* Last Check */}
        <div className={`text-xs ${
          lastCheckedAgoSec != null
            ? lastCheckedAgoSec < 300
              ? "text-green-600"
              : lastCheckedAgoSec < 600
              ? "text-orange-600"
              : "text-red-600"
            : "text-slate-400"
        }`}>
          {health?.last_checked
            ? new Date(health.last_checked).toLocaleTimeString("he-IL")
            : "ללא בדיקה"}
        </div>

        {/* Cameras */}
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/mini-pcs/${pc.id}/cameras`}
            className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200 transition-colors"
          >
            <Camera size={12} />
            <span>{pc.camera_count}</span>
          </Link>
        </div>

        {/* Details */}
        <div>
          <Link
            href={`/admin/mini-pcs/${pc.id}`}
            className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors group"
            title="צפה בפרטים"
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
              <p className="text-slate-600 text-sm font-medium">סה"כ Mini PC</p>
              <p className="text-3xl font-bold text-blue-600">{miniPCs.length}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Monitor size={24} className="text-blue-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div className="text-right">
              <p className="text-slate-600 text-sm font-medium">תקין</p>
              <p className="text-3xl font-bold text-green-600">
                {Object.values(healthData).filter(h => h?.overall_status?.toLowerCase() === 'healthy').length}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <CheckCircle size={24} className="text-green-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div className="text-right">
              <p className="text-slate-600 text-sm font-medium">אזהרות</p>
              <p className="text-3xl font-bold text-orange-600">
                {Object.values(healthData).filter(h => h?.overall_status?.toLowerCase() === 'warning').length}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <AlertCircle size={24} className="text-orange-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div className="text-right">
              <p className="text-slate-600 text-sm font-medium">קריטי</p>
              <p className="text-3xl font-bold text-red-600">
                {Object.values(healthData).filter(h => h?.overall_status?.toLowerCase() === 'critical').length}
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
                placeholder="חפש לפי שם לקוח או Mini PC..."
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
                <option value="healthy">תקין</option>
                <option value="warning">אזהרה</option>
                <option value="critical">קריטי</option>
                <option value="offline">לא מחובר</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Mini PCs Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <div dir="rtl" className="grid grid-cols-[1fr_1fr_1fr_1fr_0.8fr_0.8fr_0.8fr_0.8fr_0.8fr_1fr_1.2fr_0.8fr_0.8fr] bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold text-sm px-6 py-4">
            <div className="flex items-center gap-2">
              <Monitor size={16} />
              <span>שם Mini PC</span>
            </div>
            <div>Hostname</div>
            <div className="flex items-center gap-2">
              <User size={16} />
              <span>לקוח</span>
            </div>
            <div className="flex items-center gap-2">
              <Activity size={16} />
              <span>סטטוס</span>
            </div>
            <div className="flex items-center gap-2">
              <Thermometer size={16} />
              <span>טמפ'</span>
            </div>
            <div className="flex items-center gap-2">
              <Cpu size={16} />
              <span>CPU</span>
            </div>
            <div className="flex items-center gap-2">
              <BarChart3 size={16} />
              <span>RAM</span>
            </div>
            <div className="flex items-center gap-2">
              <HardDrive size={16} />
              <span>דיסק</span>
            </div>
            <div className="flex items-center gap-2">
              <Wifi size={16} />
              <span>רשת</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock size={16} />
              <span>זמן פעילות</span>
            </div>
            <div>בדיקה אחרונה</div>
            <div className="flex items-center gap-2">
              <Camera size={16} />
              <span>מצלמות</span>
            </div>
            <div>פרטים</div>
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
              <Monitor size={48} className="mx-auto mb-4 text-slate-300" />
              <p className="text-lg font-medium mb-2">לא נמצאו Mini PC</p>
              <p>נסה לשנות את הפילטרים או החיפוש</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

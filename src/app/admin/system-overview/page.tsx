"use client";

import { useEffect, useState } from "react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { 
  BarChart3, 
  Database, 
  HardDrive, 
  Zap, 
  Users, 
  TrendingUp,
  RefreshCw,
  Trash2,
  Server,
  Cloud,
  Activity,
  ScrollText,
  AlertCircle,
  CheckCircle,
  Info,
  XCircle,
  Filter,
  Camera,
  Monitor,
  Brain,
  Flame,
  Eye,
  Cpu,
  Layers
} from "lucide-react";

interface SystemStats {
  storage: {
    totalVodFiles: number;
    vodFilesWithObjectKey: number;
    backfillProgress: string;
    estimatedStorageGB: string;
    estimatedB2CostUSD: string;
    estimatedBunnyCostUSD: string;
    filesLast30Days: number;
  };
  users: {
    total: number;
    activeSubscriptions: number;
    topByStorage: Array<{
      id: string;
      name: string;
      email: string;
      cameras: number;
      vodFiles: number;
      retention: number;
      hasActiveSubscription: boolean;
      joinedAt: string;
    }>;
    allCustomers: Array<any>;
  };
  cameras: {
    total: number;
    active: number;
    offline: number;
  };
  system: {
    supabaseDbSizeMB: string;
    apiCallsEstimate: string;
  };
}

export default function SystemOverviewPage() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "customers" | "tech" | "logs">("overview");
  const [logs, setLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logCategory, setLogCategory] = useState<string>("");
  const [logSeverity, setLogSeverity] = useState<string>("");
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/system-stats");
      const json = await res.json();
      if (json.success) {
        setStats(json.data);
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchLogs = async () => {
    setLogsLoading(true);
    try {
      const params = new URLSearchParams();
      if (logCategory) params.set("category", logCategory);
      if (logSeverity) params.set("severity", logSeverity);
      params.set("limit", "200");
      const res = await fetch(`/api/admin/system-logs?${params}`);
      const json = await res.json();
      if (json.success) setLogs(json.logs || []);
    } catch (err) {
      console.error("Failed to fetch logs:", err);
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "logs") fetchLogs();
  }, [activeTab, logCategory, logSeverity]);

  const tabs = [
    { id: "overview" as const, label: "סקירה כללית", icon: BarChart3 },
    { id: "customers" as const, label: "שימוש לקוחות", icon: Users },
    { id: "tech" as const, label: "טכנולוגיה", icon: Server },
    { id: "logs" as const, label: "לוג מערכת", icon: ScrollText },
  ];

  return (
    <AdminPageShell>
      <div className="mb-6">
        <AdminPageHeader
          title="ניתוח מערכת"
          subtitle="סטטיסטיקות ומידע תפעולי על המערכת"
          icon={BarChart3}
          tone="purple"
        />
      </div>

      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-2 bg-white p-1 rounded-xl shadow-sm border border-slate-200">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all
                ${activeTab === tab.id 
                  ? "bg-gradient-to-l from-purple-500 to-blue-500 text-white shadow-md" 
                  : "text-slate-600 hover:bg-slate-100"
                }
              `}
            >
              <tab.icon size={18} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
        
        <button
          onClick={fetchStats}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          <span>רענן</span>
        </button>
      </div>

      {loading && !stats ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <RefreshCw size={40} className="animate-spin text-purple-500 mx-auto mb-4" />
            <p className="text-slate-600">טוען סטטיסטיקות...</p>
          </div>
        </div>
      ) : (
        <>
          {activeTab === "overview" && stats && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-2xl border-2 border-blue-200">
                  <div className="flex items-center justify-between mb-3">
                    <Database size={32} className="text-blue-600" />
                    <div className="text-right">
                      <p className="text-sm text-blue-700 font-medium">קבצי VOD</p>
                      <p className="text-3xl font-bold text-blue-900">{stats.storage.totalVodFiles.toLocaleString()}</p>
                    </div>
                  </div>
                  <p className="text-xs text-blue-700">ב-30 יום: +{stats.storage.filesLast30Days.toLocaleString()}</p>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-2xl border-2 border-green-200">
                  <div className="flex items-center justify-between mb-3">
                    <HardDrive size={32} className="text-green-600" />
                    <div className="text-right">
                      <p className="text-sm text-green-700 font-medium">נפח אחסון</p>
                      <p className="text-3xl font-bold text-green-900">{stats.storage.estimatedStorageGB} GB</p>
                    </div>
                  </div>
                  <p className="text-xs text-green-700">B2 Cost: ~${stats.storage.estimatedB2CostUSD}/חודש</p>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-2xl border-2 border-purple-200">
                  <div className="flex items-center justify-between mb-3">
                    <Users size={32} className="text-purple-600" />
                    <div className="text-right">
                      <p className="text-sm text-purple-700 font-medium">לקוחות פעילים</p>
                      <p className="text-3xl font-bold text-purple-900">{stats.users.activeSubscriptions}</p>
                    </div>
                  </div>
                  <p className="text-xs text-purple-700">מתוך {stats.users.total} סה"כ</p>
                </div>

                <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-2xl border-2 border-orange-200">
                  <div className="flex items-center justify-between mb-3">
                    <Activity size={32} className="text-orange-600" />
                    <div className="text-right">
                      <p className="text-sm text-orange-700 font-medium">מצלמות פעילות</p>
                      <p className="text-3xl font-bold text-orange-900">{stats.cameras.active}/{stats.cameras.total}</p>
                    </div>
                  </div>
                  <p className="text-xs text-orange-700">{stats.cameras.offline} לא מחוברות</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                      <Database size={24} className="text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-800">Backfill Progress</h3>
                      <p className="text-sm text-slate-600">object_key migration</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm text-slate-600">התקדמות</span>
                        <span className="text-sm font-bold text-blue-600">{stats.storage.backfillProgress}%</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-3">
                        <div 
                          className="bg-gradient-to-r from-blue-500 to-cyan-500 h-3 rounded-full transition-all"
                          style={{ width: `${stats.storage.backfillProgress}%` }}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200">
                      <div>
                        <p className="text-xs text-slate-600">עם object_key</p>
                        <p className="text-2xl font-bold text-green-600">{stats.storage.vodFilesWithObjectKey.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-600">ללא object_key</p>
                        <p className="text-2xl font-bold text-orange-600">
                          {(stats.storage.totalVodFiles - stats.storage.vodFilesWithObjectKey).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                      <TrendingUp size={24} className="text-purple-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-800">עלויות משוערות</h3>
                      <p className="text-sm text-slate-600">חודשי (USD)</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <HardDrive size={20} className="text-blue-600" />
                        <span className="font-medium text-slate-700">Backblaze B2</span>
                      </div>
                      <span className="text-xl font-bold text-slate-800">${stats.storage.estimatedB2CostUSD}</span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <Zap size={20} className="text-orange-600" />
                        <span className="font-medium text-slate-700">Bunny CDN</span>
                      </div>
                      <span className="text-xl font-bold text-slate-800">${stats.storage.estimatedBunnyCostUSD}</span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border-2 border-blue-200">
                      <span className="font-bold text-slate-800">סה"כ משוער</span>
                      <span className="text-2xl font-bold text-blue-600">
                        ${(parseFloat(stats.storage.estimatedB2CostUSD) + parseFloat(stats.storage.estimatedBunnyCostUSD)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "customers" && stats && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-200">
                <h3 className="text-xl font-bold text-slate-800">Top 10 לקוחות לפי שימוש</h3>
                <p className="text-sm text-slate-600 mt-1">מסודר לפי כמות קבצי VOD</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-right text-xs font-medium text-slate-600 uppercase">#</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-slate-600 uppercase">לקוח</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-slate-600 uppercase">מצלמות</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-slate-600 uppercase">קבצי VOD</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-slate-600 uppercase">Retention</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-slate-600 uppercase">סטטוס</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {stats.users.topByStorage.map((customer, idx) => (
                      <tr key={customer.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 text-sm font-medium text-slate-900">{idx + 1}</td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-slate-900">{customer.name}</div>
                          <div className="text-xs text-slate-500">{customer.email}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-700">{customer.cameras}</td>
                        <td className="px-6 py-4 text-sm font-bold text-blue-600">{customer.vodFiles.toLocaleString()}</td>
                        <td className="px-6 py-4 text-sm text-slate-700">{customer.retention} ימים</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            customer.hasActiveSubscription 
                              ? "bg-green-100 text-green-800" 
                              : "bg-red-100 text-red-800"
                          }`}>
                            {customer.hasActiveSubscription ? "פעיל" : "לא פעיל"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "logs" && (() => {
            // Group logs by customer (via mini_pc)
            const customerMap = new Map<string, { name: string; email: string; miniPcName: string; miniPcId: string; logs: any[] }>();
            for (const log of logs) {
              const mp = log.mini_pc;
              const key = mp?.user_id || mp?.id || log.user_id || "unknown";
              if (!customerMap.has(key)) {
                const customerName = mp?.user?.full_name || log.user?.full_name || "לא ידוע";
                const customerEmail = mp?.user?.email || log.user?.email || "";
                customerMap.set(key, {
                  name: customerName,
                  email: customerEmail,
                  miniPcName: mp?.device_name || mp?.hostname || "—",
                  miniPcId: mp?.id || "",
                  logs: [],
                });
              }
              customerMap.get(key)!.logs.push(log);
            }
            const customers = Array.from(customerMap.entries()).sort((a, b) => {
              const aTime = a[1].logs[0]?.created_at || "";
              const bTime = b[1].logs[0]?.created_at || "";
              return bTime.localeCompare(aTime);
            });

            const severityConfig: Record<string, { icon: any; color: string; bg: string }> = {
              info: { icon: Info, color: "text-blue-600", bg: "bg-blue-50" },
              warning: { icon: AlertCircle, color: "text-orange-600", bg: "bg-orange-50" },
              error: { icon: XCircle, color: "text-red-600", bg: "bg-red-50" },
              critical: { icon: XCircle, color: "text-red-700", bg: "bg-red-100" },
            };

            const categoryLabels: Record<string, { label: string; icon: any }> = {
              camera: { label: "מצלמה", icon: Camera },
              vod: { label: "VOD", icon: Database },
              minipc: { label: "MiniPC", icon: Monitor },
              alert: { label: "התראה", icon: AlertCircle },
              system: { label: "מערכת", icon: Server },
            };

            // Group logs by day for a customer
            const groupByDay = (customerLogs: any[]) => {
              const dayMap = new Map<string, any[]>();
              for (const log of customerLogs) {
                const day = new Date(log.created_at).toLocaleDateString("he-IL", { timeZone: "Asia/Jerusalem" });
                if (!dayMap.has(day)) dayMap.set(day, []);
                dayMap.get(day)!.push(log);
              }
              return Array.from(dayMap.entries());
            };

            const formatTime = (iso: string) =>
              new Date(iso).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Asia/Jerusalem" });

            const formatMetadata = (log: any) => {
              const m = log.metadata;
              if (!m || Object.keys(m).length === 0) return null;
              const parts: string[] = [];
              if (m.uploaded != null) parts.push(`${m.uploaded} קבצים`);
              if (m.total_size_mb != null) parts.push(`${m.total_size_mb}MB`);
              if (m.failed != null && m.failed > 0) parts.push(`${m.failed} נכשלו`);
              if (m.corrupt != null && m.corrupt > 0) parts.push(`${m.corrupt} פגומים`);
              if (m.duration_sec != null) parts.push(`${m.duration_sec}s`);
              return parts.length > 0 ? parts.join(" | ") : null;
            };

            return (
              <div className="space-y-4">
                {/* Filters */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap gap-4 items-center">
                  <div className="flex items-center gap-2">
                    <Filter size={18} className="text-slate-400" />
                    <select
                      className="pr-8 pl-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-right"
                      value={logCategory}
                      onChange={(e) => setLogCategory(e.target.value)}
                    >
                      <option value="">כל הקטגוריות</option>
                      <option value="camera">מצלמות</option>
                      <option value="vod">הקלטות (VOD)</option>
                      <option value="minipc">MiniPC</option>
                      <option value="alert">התראות</option>
                      <option value="system">מערכת</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertCircle size={18} className="text-slate-400" />
                    <select
                      className="pr-8 pl-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-right"
                      value={logSeverity}
                      onChange={(e) => setLogSeverity(e.target.value)}
                    >
                      <option value="">כל החומרות</option>
                      <option value="info">מידע</option>
                      <option value="warning">אזהרה</option>
                      <option value="error">שגיאה</option>
                      <option value="critical">קריטי</option>
                    </select>
                  </div>
                  <button
                    onClick={fetchLogs}
                    disabled={logsLoading}
                    className="flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-lg text-sm hover:bg-slate-200 transition-colors"
                  >
                    <RefreshCw size={14} className={logsLoading ? "animate-spin" : ""} />
                    רענן
                  </button>
                  <span className="text-sm text-slate-500 mr-auto">{customers.length} לקוחות | {logs.length} רשומות (14 יום)</span>
                </div>

                {/* Customer Cards */}
                {logsLoading && logs.length === 0 ? (
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center text-slate-500">
                    <RefreshCw size={32} className="animate-spin mx-auto mb-3 text-slate-400" />
                    <p>טוען לוגים...</p>
                  </div>
                ) : customers.length === 0 ? (
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center text-slate-500">
                    <ScrollText size={48} className="mx-auto mb-4 text-slate-300" />
                    <p className="text-lg font-medium">אין לוגים</p>
                    <p className="text-sm">לוגים יופיעו כאן כשהמערכת תדווח על אירועים</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {customers.map(([customerId, customer]) => {
                      const isExpanded = expandedCustomer === customerId;
                      const latestLog = customer.logs[0];
                      const latestSev = severityConfig[latestLog?.severity] || severityConfig.info;
                      const LatestSevIcon = latestSev.icon;
                      const errorCount = customer.logs.filter((l: any) => l.severity === "error" || l.severity === "critical").length;
                      const warningCount = customer.logs.filter((l: any) => l.severity === "warning").length;
                      const days = groupByDay(customer.logs);

                      return (
                        <div key={customerId} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                          {/* Customer Row */}
                          <button
                            onClick={() => setExpandedCustomer(isExpanded ? null : customerId)}
                            className="w-full flex items-center gap-4 p-5 hover:bg-slate-50 transition-colors text-right"
                          >
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
                              <Users size={20} className="text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900">{customer.name}</span>
                                {customer.miniPcName !== "—" && (
                                  <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                    <Monitor size={10} className="inline mr-1" />
                                    {customer.miniPcName}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-slate-500 truncate mt-0.5">{latestLog?.message}</p>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0">
                              {errorCount > 0 && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-red-700 bg-red-50">
                                  <XCircle size={12} /> {errorCount}
                                </span>
                              )}
                              {warningCount > 0 && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-orange-700 bg-orange-50">
                                  <AlertCircle size={12} /> {warningCount}
                                </span>
                              )}
                              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${latestSev.color} ${latestSev.bg}`}>
                                <LatestSevIcon size={12} />
                                {latestLog?.severity}
                              </span>
                              <span className="text-xs text-slate-400 whitespace-nowrap">
                                {latestLog && formatTime(latestLog.created_at)}
                              </span>
                              <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded">
                                {days.length} ימים | {customer.logs.length} לוגים
                              </span>
                              <svg className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                          </button>

                          {/* Expanded: Day-based logs */}
                          {isExpanded && (
                            <div className="border-t border-slate-200 bg-slate-50">
                              <div className="max-h-[500px] overflow-y-auto">
                                {days.map(([dayLabel, dayLogs]) => {
                                  const dayKey = `${customerId}-${dayLabel}`;
                                  const isDayExpanded = expandedDay === dayKey;
                                  const dayErrors = dayLogs.filter((l: any) => l.severity === "error" || l.severity === "critical").length;
                                  const dayWarnings = dayLogs.filter((l: any) => l.severity === "warning").length;

                                  return (
                                    <div key={dayKey}>
                                      {/* Day Header */}
                                      <button
                                        onClick={() => setExpandedDay(isDayExpanded ? null : dayKey)}
                                        className="w-full flex items-center gap-3 px-5 py-3 hover:bg-slate-100 transition-colors border-b border-slate-200"
                                      >
                                        <span className="text-sm font-bold text-slate-700">{dayLabel}</span>
                                        <span className="text-xs text-slate-400">{dayLogs.length} לוגים</span>
                                        {dayErrors > 0 && (
                                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium text-red-700 bg-red-50">
                                            <XCircle size={10} /> {dayErrors}
                                          </span>
                                        )}
                                        {dayWarnings > 0 && (
                                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium text-orange-700 bg-orange-50">
                                            <AlertCircle size={10} /> {dayWarnings}
                                          </span>
                                        )}
                                        <svg className={`w-4 h-4 text-slate-400 transition-transform mr-auto ${isDayExpanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                      </button>

                                      {/* Day Logs Table */}
                                      {isDayExpanded && (
                                        <div className="overflow-x-auto">
                                          <table className="w-full">
                                            <thead className="bg-slate-100">
                                              <tr>
                                                <th className="px-4 py-2 text-right text-xs font-medium text-slate-600">שעת דיווח</th>
                                                <th className="px-4 py-2 text-right text-xs font-medium text-slate-600">חומרה</th>
                                                <th className="px-4 py-2 text-right text-xs font-medium text-slate-600">קטגוריה</th>
                                                <th className="px-4 py-2 text-right text-xs font-medium text-slate-600">הודעה</th>
                                                <th className="px-4 py-2 text-right text-xs font-medium text-slate-600">פרטים</th>
                                              </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                              {dayLogs.map((log: any) => {
                                                const sev = severityConfig[log.severity] || severityConfig.info;
                                                const SevIcon = sev.icon;
                                                const cat = categoryLabels[log.category] || { label: log.category, icon: Info };
                                                const CatIcon = cat.icon;
                                                const meta = formatMetadata(log);

                                                return (
                                                  <tr key={log.id} className="hover:bg-white transition-colors">
                                                    <td className="px-4 py-2.5 text-xs text-slate-700 whitespace-nowrap font-medium">
                                                      {formatTime(log.created_at)}
                                                    </td>
                                                    <td className="px-4 py-2.5">
                                                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${sev.color} ${sev.bg}`}>
                                                        <SevIcon size={11} />
                                                        {log.severity}
                                                      </span>
                                                    </td>
                                                    <td className="px-4 py-2.5">
                                                      <span className="inline-flex items-center gap-1 text-xs text-slate-700">
                                                        <CatIcon size={11} />
                                                        {cat.label}
                                                      </span>
                                                    </td>
                                                    <td className="px-4 py-2.5 text-sm text-slate-900 max-w-md" title={log.message}>
                                                      <span className="line-clamp-2">{log.message}</span>
                                                    </td>
                                                    <td className="px-4 py-2.5 text-xs text-slate-500 whitespace-nowrap">
                                                      {meta && <span className="bg-slate-100 px-2 py-0.5 rounded">{meta}</span>}
                                                      {log.camera?.name && (
                                                        <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded mr-1">
                                                          <Camera size={10} className="inline mr-0.5" />
                                                          {log.camera.name}
                                                        </span>
                                                      )}
                                                    </td>
                                                  </tr>
                                                );
                                              })}
                                            </tbody>
                                          </table>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

          {activeTab === "tech" && (
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-8 rounded-2xl border-2 border-blue-200">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center">
                    <Database size={32} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900">Supabase</h3>
                    <p className="text-slate-600">PostgreSQL Database</p>
                  </div>
                </div>
                <div className="space-y-3 text-slate-700">
                  <p>• <strong>תפקיד:</strong> שומר metadata של כל הקבצים, משתמשים, מצלמות, מנויים</p>
                  <p>• <strong>מבנה טבלאות:</strong> users, cameras, vod_files, subscriptions, recurring_payments</p>
                  <p>• <strong>גודל DB נוכחי:</strong> ~{stats?.system.supabaseDbSizeMB || "0"} MB</p>
                  <p>• <strong>API Calls (משוערך):</strong> {stats?.system.apiCallsEstimate || "0"}/חודש</p>
                  <p>• <strong>Plan:</strong> Free tier (עד 500MB DB, 2GB bandwidth)</p>
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-8 rounded-2xl border-2 border-green-200">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-green-600 rounded-2xl flex items-center justify-center">
                    <HardDrive size={32} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900">Backblaze B2</h3>
                    <p className="text-slate-600">Object Storage</p>
                  </div>
                </div>
                <div className="space-y-3 text-slate-700">
                  <p>• <strong>תפקיד:</strong> אחסון קבצי הווידאו המקוריים (.mp4)</p>
                  <p>• <strong>מבנה:</strong> <code className="bg-white px-2 py-1 rounded">userId/cameraId/YYYY-MM-DD_HH-MM-SS.mp4</code></p>
                  <p>• <strong>נפח נוכחי:</strong> ~{stats?.storage.estimatedStorageGB || "0"} GB</p>
                  <p>• <strong>מחיר:</strong> $0.005/GB/חודש אחסון + $0.01/GB egress</p>
                  <p>• <strong>עלות חודשית:</strong> ~${stats?.storage.estimatedB2CostUSD || "0"}</p>
                </div>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-yellow-50 p-8 rounded-2xl border-2 border-orange-200">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-orange-600 rounded-2xl flex items-center justify-center">
                    <Zap size={32} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900">Bunny CDN</h3>
                    <p className="text-slate-600">Content Delivery Network</p>
                  </div>
                </div>
                <div className="space-y-3 text-slate-700">
                  <p>• <strong>תפקיד:</strong> מעביר ווידאו למשתמשים במהירות גבוהה (cache + edge locations)</p>
                  <p>• <strong>Token Authentication:</strong> URLs חתומים בתוקף 60 דקות (SHA256)</p>
                  <p>• <strong>מחיר:</strong> ~$0.01/GB bandwidth (תלוי באזור גיאוגרפי)</p>
                  <p>• <strong>עלות חודשית:</strong> ~${stats?.storage.estimatedBunnyCostUSD || "0"}</p>
                  <p>• <strong>יתרון:</strong> זול מ-B2 egress ומהיר יותר (global CDN)</p>
                </div>
              </div>

              {/* AI Detection Engine */}
              <div className="bg-gradient-to-br from-red-50 to-orange-50 p-8 rounded-2xl border-2 border-red-200">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-red-600 rounded-2xl flex items-center justify-center">
                    <Brain size={32} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900">AI Detection Engine</h3>
                    <p className="text-slate-600">מערכת זיהוי חכמה בזמן אמת</p>
                  </div>
                </div>
                <div className="space-y-3 text-slate-700">
                  <p>• <strong>תפקיד:</strong> ניתוח וידאו בזמן אמת מכל המצלמות, זיהוי אובייקטים ושליחת התראות</p>
                  <p>• <strong>ריצה:</strong> על ה-Mini PC של הלקוח (Edge AI) — ללא תלות באינטרנט לזיהוי</p>
                  <p>• <strong>שירות:</strong> <code className="bg-white px-2 py-1 rounded">clearpoint-ai.service</code> — systemd, רץ 24/7, restart אוטומטי</p>
                  <p>• <strong>סקריפט:</strong> <code className="bg-white px-2 py-1 rounded">detect.py</code> — Python, thread אחד לכל מצלמה</p>
                  <p>• <strong>משאבים:</strong> ~77% CPU, ~500MB RAM על Intel N150 (4 cores, 8GB)</p>
                </div>
              </div>

              {/* AI Models */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-8 rounded-2xl border-2 border-amber-200">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-amber-600 rounded-2xl flex items-center justify-center">
                    <Layers size={32} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900">מודלים (Models)</h3>
                    <p className="text-slate-600">רשתות נוירונים לזיהוי אובייקטים</p>
                  </div>
                </div>
                <div className="space-y-4 text-slate-700">
                  <div className="bg-white p-4 rounded-xl border border-amber-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Eye size={18} className="text-blue-600" />
                      <p className="font-bold text-amber-900">מודל ראשי — YOLOv8n COCO</p>
                    </div>
                    <p className="text-sm mb-2">מודל כללי (80 קטגוריות), אנחנו משתמשים ב-7:</p>
                    <div className="flex flex-wrap gap-2">
                      {["אדם","רכב","כלב","חתול","חיה אחרת","חפץ חשוד","סכין/חפץ חד"].map(t=>(
                        <span key={t} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium">{t}</span>
                      ))}
                    </div>
                    <p className="text-xs text-slate-500 mt-2">רץ על <strong>כל פריים</strong> • ~6MB • מקור: COCO dataset</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-amber-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Flame size={18} className="text-red-600" />
                      <p className="font-bold text-amber-900">מודל משני — אש ועשן</p>
                    </div>
                    <p className="text-sm mb-2">מודל מותאם אישית, אומן על Roboflow + Google Colab:</p>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-2 py-1 bg-red-50 text-red-700 rounded text-xs font-medium">אש (fire)</span>
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">עשן (smoke)</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">רץ כל <strong>10 פריימים</strong> (חוסך CPU) • ~6MB • אומן על Colab</p>
                  </div>
                </div>
              </div>

              {/* AI Tech Stack */}
              <div className="bg-gradient-to-br from-slate-50 to-gray-50 p-8 rounded-2xl border-2 border-slate-200">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-slate-700 rounded-2xl flex items-center justify-center">
                    <Cpu size={32} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900">AI Tech Stack</h3>
                    <p className="text-slate-600">הטכנולוגיות מאחורי מנוע הזיהוי</p>
                  </div>
                </div>
                <div className="space-y-4 text-slate-700">
                  <div className="bg-white p-4 rounded-xl border border-slate-200">
                    <p className="font-bold text-slate-900 mb-1">YOLOv8n (Ultralytics)</p>
                    <p className="text-sm">ארכיטקטורת YOLO nano — הגרסה הקלה ביותר. זיהוי בזמן אמת בלי GPU.</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-200">
                    <p className="font-bold text-slate-900 mb-1">OpenVINO (Intel)</p>
                    <p className="text-sm">פריימוורק של אינטל — ממיר מודל לפורמט IR FP16, חוסך ~50% זיכרון ומאיץ ריצה על מעבדי Intel.</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-200">
                    <p className="font-bold text-slate-900 mb-1">Roboflow + Google Colab</p>
                    <p className="text-sm">Roboflow = ניהול datasets מתוייגים. Colab = אימון בענן עם GPU חינמי. התוצאה: מודל ONNX מוכן.</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-200">
                    <p className="font-bold text-slate-900 mb-1">תהליך: אימון → המרה → פריסה</p>
                    <p className="text-sm">Roboflow (data) → Colab (train YOLOv8n) → ONNX → OpenVINO IR FP16 → Mini PC</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-8 rounded-2xl border-2 border-purple-200">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-purple-600 rounded-2xl flex items-center justify-center">
                    <Cloud size={32} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900">Architecture Flow</h3>
                    <p className="text-slate-600">איך הכל עובד ביחד</p>
                  </div>
                </div>
                <div className="space-y-4 text-slate-700">
                  <div className="bg-white p-4 rounded-xl border border-purple-200">
                    <p className="font-bold text-purple-900 mb-2">1️⃣ העלאה (MiniPC → B2 → Supabase)</p>
                    <p className="text-sm">MiniPC מעלה .mp4 ל-B2, שומר <code>object_key</code> ב-Supabase דרך <code>/api/ingest/vod-file</code></p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-purple-200">
                    <p className="font-bold text-purple-900 mb-2">2️⃣ צפייה (UI → Next.js → Bunny CDN)</p>
                    <p className="text-sm">UI מבקש <code>/api/vod/signed-url</code>, השרת חותם URL ל-60 דק', משתמש צופה דרך Bunny</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-purple-200">
                    <p className="font-bold text-purple-900 mb-2">3️⃣ זיהוי AI (MiniPC → detect.py → Supabase)</p>
                    <p className="text-sm">detect.py מנתח פריימים מכל מצלמה בזמן אמת, מזהה אובייקטים (YOLO + OpenVINO), ושולח התראות דרך <code>/api/ingest/alert</code></p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-purple-200">
                    <p className="font-bold text-purple-900 mb-2">4️⃣ מחיקה (Cron → B2 + Supabase)</p>
                    <p className="text-sm">Cleanup script רץ כל לילה, מוחק קבצים שעברו את ה-retention מ-B2 ומ-Supabase</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </AdminPageShell>
  );
}

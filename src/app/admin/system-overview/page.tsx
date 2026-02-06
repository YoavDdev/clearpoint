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
  Activity
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
  const [activeTab, setActiveTab] = useState<"overview" | "customers" | "tech">("overview");

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

  const tabs = [
    { id: "overview" as const, label: "סקירה כללית", icon: BarChart3 },
    { id: "customers" as const, label: "שימוש לקוחות", icon: Users },
    { id: "tech" as const, label: "טכנולוגיה", icon: Server },
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
                    <p className="font-bold text-purple-900 mb-2">3️⃣ מחיקה (Cron → B2 + Supabase)</p>
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

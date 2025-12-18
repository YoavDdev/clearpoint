import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { ArrowRight, Monitor, Camera, User, Calendar, Wifi, Activity, Eye, Settings } from "lucide-react";
import { notFound } from "next/navigation";
import { MiniPCDiagnostics } from "@/components/admin/MiniPCDiagnostics";

export const dynamic = 'force-dynamic';

type MiniPC = {
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
};

type MiniPCHealth = {
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
};

export default async function MiniPCDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Fetch Mini PC details with camera count
  const { data: miniPC, error: miniPCError } = await supabaseAdmin
    .from("mini_pcs")
    .select(`
      *,
      user:users(full_name, email),
      cameras(id)
    `)
    .eq("id", params.id)
    .single();

  if (miniPCError || !miniPC) {
    notFound();
  }

  // Get camera count
  const cameraCount = miniPC.cameras?.length || 0;

  // Fetch latest health data
  const { data: health } = await supabaseAdmin
    .from("mini_pc_health")
    .select("*")
    .eq("mini_pc_id", params.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days} ימים, ${hours} שעות`;
    if (hours > 0) return `${hours} שעות, ${minutes} דקות`;
    return `${minutes} דקות`;
  };

  const isHealthy = health?.overall_status?.toLowerCase() === "healthy";
  const isWarning = health?.overall_status?.toLowerCase() === "warning";
  const isCritical = health?.overall_status?.toLowerCase() === "critical";

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-600 mb-6">
          <Link href="/admin" className="hover:text-blue-600 transition-colors">
            ניהול
          </Link>
          <ArrowRight size={16} className="rotate-180" />
          <Link href="/admin/mini-pcs" className="hover:text-blue-600 transition-colors">
            Mini PCs
          </Link>
          <ArrowRight size={16} className="rotate-180" />
          <span className="text-slate-900 font-medium">{miniPC.device_name}</span>
        </div>

        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-blue-100 rounded-2xl flex items-center justify-center">
                <Monitor size={40} className="text-blue-600" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-slate-900 mb-3">
                  {miniPC.device_name}
                </h1>
                <div className="flex items-center gap-6 text-slate-600">
                  <div className="flex items-center gap-2">
                    <Monitor size={18} />
                    <span className="font-medium">{miniPC.hostname}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Wifi size={18} />
                    <span className="font-mono">{miniPC.ip_address}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User size={18} />
                    <span>{miniPC.user?.full_name || "ללא לקוח"}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <Link
                href={`/admin/mini-pcs/${params.id}/cameras`}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
              >
                <Camera size={20} />
                מצלמות ({cameraCount})
              </Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* System Status */}
          <div className="lg:col-span-2 space-y-8">
            {/* Health Overview */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                <Activity size={24} />
                מצב המערכת
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">סטטוס כללי</span>
                    <span className={`px-3 py-1 rounded-lg text-sm font-medium ${
                      isHealthy ? "bg-green-100 text-green-700" : 
                      isWarning ? "bg-orange-100 text-orange-700" :
                      isCritical ? "bg-red-100 text-red-700" :
                      "bg-slate-100 text-slate-600"
                    }`}>
                      {health?.overall_status || "לא זמין"}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">טמפרטורת CPU</span>
                    <span className={`font-medium ${
                      (health?.cpu_temp_celsius ?? 0) > 80 ? "text-red-600" :
                      (health?.cpu_temp_celsius ?? 0) > 70 ? "text-orange-600" :
                      "text-slate-700"
                    }`}>
                      {health?.cpu_temp_celsius ? `${health.cpu_temp_celsius}°C` : "—"}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">שימוש CPU</span>
                    <span className={`font-medium ${
                      (health?.cpu_usage_pct ?? 0) > 90 ? "text-red-600" :
                      (health?.cpu_usage_pct ?? 0) > 75 ? "text-orange-600" :
                      "text-slate-700"
                    }`}>
                      {health?.cpu_usage_pct ? `${health.cpu_usage_pct.toFixed(1)}%` : "—"}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">שימוש RAM</span>
                    <span className={`font-medium ${
                      (health?.ram_usage_pct ?? 0) > 90 ? "text-red-600" :
                      (health?.ram_usage_pct ?? 0) > 75 ? "text-orange-600" :
                      "text-slate-700"
                    }`}>
                      {health?.ram_usage_pct ? `${health.ram_usage_pct.toFixed(1)}%` : "—"}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">שימוש דיסק</span>
                    <span className={`font-medium ${
                      (health?.disk_root_pct ?? 0) > 90 ? "text-red-600" :
                      (health?.disk_root_pct ?? 0) > 75 ? "text-orange-600" :
                      "text-slate-700"
                    }`}>
                      {health?.disk_root_pct ? `${health.disk_root_pct}%` : "—"}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">חיבור לאינטרנט</span>
                    <span className={`font-medium ${
                      health?.internet_connected ? "text-green-600" : "text-red-600"
                    }`}>
                      {health?.internet_connected ? "מחובר" : "לא מחובר"}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">זמן תגובה</span>
                    <span className="font-medium text-slate-700">
                      {health?.ping_internet_ms ? `${health.ping_internet_ms}ms` : "—"}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">זמן פעילות</span>
                    <span className="font-medium text-slate-700">
                      {health?.uptime_seconds ? formatUptime(health.uptime_seconds) : "—"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Storage Info */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">אחסון וקבצים</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-50 rounded-xl p-6">
                  <h3 className="font-semibold text-slate-900 mb-4">דיסק ראשי</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">שימוש</span>
                      <span className="font-medium">{health?.disk_root_pct || 0}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          (health?.disk_root_pct ?? 0) > 90 ? "bg-red-500" :
                          (health?.disk_root_pct ?? 0) > 75 ? "bg-orange-500" :
                          "bg-blue-500"
                        }`}
                        style={{ width: `${health?.disk_root_pct || 0}%` }}
                      />
                    </div>
                  </div>
                </div>
                
                <div className="bg-slate-50 rounded-xl p-6">
                  <h3 className="font-semibold text-slate-900 mb-4">אחסון וידאו</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">שימוש</span>
                      <span className="font-medium">{health?.disk_ram_pct || 0}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          (health?.disk_ram_pct ?? 0) > 90 ? "bg-red-500" :
                          (health?.disk_ram_pct ?? 0) > 75 ? "bg-orange-500" :
                          "bg-blue-500"
                        }`}
                        style={{ width: `${health?.disk_ram_pct || 0}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">קבצי וידאו</span>
                      <span className="font-medium">{health?.total_video_files || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Quick Info */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">מידע כללי</h3>
              <div className="space-y-4">
                <div>
                  <span className="text-slate-600 text-sm">מותקן מאז</span>
                  <p className="font-medium text-slate-900">
                    {new Date(miniPC.installed_at).toLocaleDateString("he-IL")}
                  </p>
                </div>
                
                <div>
                  <span className="text-slate-600 text-sm">נראה לאחרונה</span>
                  <p className="font-medium text-slate-900">
                    {miniPC.last_seen_at 
                      ? new Date(miniPC.last_seen_at).toLocaleDateString("he-IL")
                      : "מעולם לא"
                    }
                  </p>
                </div>
                
                <div>
                  <span className="text-slate-600 text-sm">בדיקה אחרונה</span>
                  <p className="font-medium text-slate-900">
                    {health?.last_checked 
                      ? new Date(health.last_checked).toLocaleString("he-IL")
                      : "ללא בדיקה"
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">פעולות</h3>
              <div className="space-y-3">
                <Link
                  href={`/admin/mini-pcs/${params.id}/cameras`}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 transition-colors"
                >
                  <Camera size={18} />
                  <span>נהל מצלמות ({cameraCount})</span>
                </Link>
                
                <Link
                  href={`/dashboard?mini_pc=${params.id}`}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-green-50 text-green-700 rounded-xl hover:bg-green-100 transition-colors"
                >
                  <Eye size={18} />
                  <span>צפה בלייב</span>
                </Link>
              </div>
            </div>

            {/* Log Message */}
            {health?.log_message && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">הודעת לוג אחרונה</h3>
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-sm text-slate-700 font-mono leading-relaxed">
                    {health.log_message}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

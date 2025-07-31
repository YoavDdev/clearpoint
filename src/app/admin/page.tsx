import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { RealTimeCameraMonitor } from "@/components/admin/RealTimeCameraMonitor";
import { SystemAlerts } from "@/components/admin/SystemAlerts";
import { CameraDiagnostic } from "@/components/admin/CameraDiagnostic";
import {
  LayoutDashboard,
  Users,
  Camera,
  LifeBuoy,
  FileText,
  UserPlus,
  Plus,
} from "lucide-react";

export default async function AdminPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Enhanced data fetching
  const { count: userCount } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true });

  const { count: totalCameras } = await supabase
    .from("cameras")
    .select("*", { count: "exact", head: true });

  const { count: activeCameras } = await supabase
    .from("cameras")
    .select("*", { count: "exact", head: true })
    .eq("is_stream_active", true);

  const { count: offlineCameras } = await supabase
    .from("cameras")
    .select("*", { count: "exact", head: true })
    .eq("is_stream_active", false);

  const { count: pendingSupport } = await supabase
    .from("support_requests")
    .select("*", { count: "exact", head: true })
    .eq("is_handled", false);

  const { count: newRequests } = await supabase
    .from("subscription_requests")
    .select("*", { count: "exact", head: true })
    .eq("status", "new");

  // Recent activity
  const { data: recentCameras } = await supabase
    .from("cameras")
    .select("name, last_seen_at, is_stream_active, user:users!cameras_user_id_fkey(full_name)")
    .order("last_seen_at", { ascending: false })
    .limit(5);

  const { data: recentSupport } = await supabase
    .from("support_requests")
    .select("email, created_at, category")
    .eq("is_handled", false)
    .order("created_at", { ascending: false })
    .limit(3);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 pt-20 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="text-right">
              <h1 className="text-4xl font-bold text-slate-800 mb-2">לוח בקרה ראשי</h1>
              <p className="text-slate-600">ניהול מערכת Clearpoint Security</p>
            </div>
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center shadow-lg">
              <LayoutDashboard size={32} className="text-white" />
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <div className="text-right">
                <p className="text-slate-600 text-sm font-medium">סה"כ לקוחות</p>
                <p className="text-3xl font-bold text-slate-800">{userCount || 0}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Users size={24} className="text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <div className="text-right">
                <p className="text-slate-600 text-sm font-medium">מצלמות פעילות</p>
                <p className="text-3xl font-bold text-green-600">{activeCameras || 0}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <Camera size={24} className="text-green-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <div className="text-right">
                <p className="text-slate-600 text-sm font-medium">פניות תמיכה</p>
                <p className="text-3xl font-bold text-orange-600">{pendingSupport || 0}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <LifeBuoy size={24} className="text-orange-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <div className="text-right">
                <p className="text-slate-600 text-sm font-medium">בקשות חדשות</p>
                <p className="text-3xl font-bold text-purple-600">{newRequests || 0}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <FileText size={24} className="text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 mb-8">
          <h2 className="text-2xl font-bold text-slate-800 mb-6 text-right">פעולות מהירות</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link
              href="/admin/customers/new"
              className="group p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border-2 border-green-200 hover:border-green-300 transition-all hover:shadow-lg"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <UserPlus size={24} className="text-white" />
                </div>
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
              </div>
              <h3 className="text-lg font-bold text-green-800 mb-2 text-right">לקוח חדש</h3>
              <p className="text-green-700 text-sm text-right">הוסף לקוח חדש למערכת</p>
            </Link>
            
            <Link
              href="/admin/cameras/new"
              className="group p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border-2 border-blue-200 hover:border-blue-300 transition-all hover:shadow-lg"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Plus size={24} className="text-white" />
                </div>
                <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse" />
              </div>
              <h3 className="text-lg font-bold text-blue-800 mb-2 text-right">מצלמה חדשה</h3>
              <p className="text-blue-700 text-sm text-right">הוסף מצלמה חדשה ללקוח</p>
            </Link>
            
            {(newRequests ?? 0) > 0 && (
              <Link
                href="/admin/requests"
                className="group p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border-2 border-purple-200 hover:border-purple-300 transition-all hover:shadow-lg"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <FileText size={24} className="text-white" />
                  </div>
                  <div className="bg-purple-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                    {newRequests}
                  </div>
                </div>
                <h3 className="text-lg font-bold text-purple-800 mb-2 text-right">בקשות חדשות</h3>
                <p className="text-purple-700 text-sm text-right">טיפול בבקשות הצטרפות</p>
              </Link>
            )}
            
            {(pendingSupport ?? 0) > 0 && (
              <Link
                href="/admin/support"
                className="group p-6 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl border-2 border-orange-200 hover:border-orange-300 transition-all hover:shadow-lg"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-12 h-12 bg-orange-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <LifeBuoy size={24} className="text-white" />
                  </div>
                  <div className="bg-orange-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                    {pendingSupport}
                  </div>
                </div>
                <h3 className="text-lg font-bold text-orange-800 mb-2 text-right">תמיכה דחופה</h3>
                <p className="text-orange-700 text-sm text-right">פניות ממתינות לטיפול</p>
              </Link>
            )}
          </div>
        </div>

        {/* Management Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Customer Management */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-800 text-right">ניהול לקוחות</h2>
              <Users size={28} className="text-blue-600" />
            </div>
            <div className="space-y-3">
              <Link
                href="/admin/customers"
                className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-all group"
              >
                <div className="text-right">
                  <h3 className="font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">רשימת לקוחות</h3>
                  <p className="text-slate-600 text-sm">צפייה ועריכה של כל הלקוחות</p>
                </div>
                <Users size={20} className="text-slate-400 group-hover:text-blue-600 transition-colors" />
              </Link>
              
              <Link
                href="/admin/requests"
                className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-all group"
              >
                <div className="text-right">
                  <h3 className="font-semibold text-slate-800 group-hover:text-purple-600 transition-colors">בקשות הצטרפות</h3>
                  <p className="text-slate-600 text-sm">בקשות מאתר האינטרנט</p>
                </div>
                <FileText size={20} className="text-slate-400 group-hover:text-purple-600 transition-colors" />
              </Link>
            </div>
          </div>
          
          {/* Camera Management */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-800 text-right">ניהול מצלמות</h2>
              <Camera size={28} className="text-green-600" />
            </div>
            <div className="space-y-3">
              <Link
                href="/admin/cameras"
                className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-all group"
              >
                <div className="text-right">
                  <h3 className="font-semibold text-slate-800 group-hover:text-green-600 transition-colors">רשימת מצלמות</h3>
                  <p className="text-slate-600 text-sm">ניטור וניהול כל המצלמות</p>
                </div>
                <Camera size={20} className="text-slate-400 group-hover:text-green-600 transition-colors" />
              </Link>
              
              <div className="p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-right">
                    <h3 className="font-semibold text-slate-800">סטטוס מצלמות</h3>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-slate-600">פעילות: {activeCameras || 0}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="text-slate-600">לא פעילות: {offlineCameras || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>


      </div>
    </main>
  );
}

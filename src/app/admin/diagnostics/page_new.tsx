"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import NotificationSettings from "@/components/admin/NotificationSettings";
import {
  Search,
  Database,
  Camera,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Users,
  Activity,
  Clock,
  HardDrive,
  Wifi,
  LayoutDashboard,
  RefreshCw,
  Download,
  Eye,
  Trash2,
  Bell,
  BellRing,
  MessageSquare,
  Mail,
  Phone,
  Zap,
  Shield,
  AlertCircle,
  TrendingUp,
  Settings,
  Play,
  Pause,
} from "lucide-react";

interface CameraHealth {
  id: string;
  name: string;
  serial_number: string;
  stream_path: string;
  user_id: string;
  is_stream_active: boolean | null;
  last_seen_at: string | null;
  created_at: string;
  user?: {
    full_name: string;
    email: string;
    phone?: string;
  };
  realtimeHealth?: {
    success: boolean;
    health?: {
      stream_status: string;
      disk_root_pct: number;
      disk_ram_pct: number;
      last_checked: string;
      log_message: string;
    };
  };
  issues: string[];
  status: "healthy" | "warning" | "error" | "offline";
  severity: "low" | "medium" | "high" | "critical";
  lastAlert?: string;
}

interface SystemOverview {
  totalCameras: number;
  healthyCameras: number;
  warningCameras: number;
  errorCameras: number;
  offlineCameras: number;
  activeCameras: number;
  streamingCameras: number;
  avgDiskUsage: number;
  avgRamUsage: number;
  systemUptime: string;
  lastSystemCheck: string;
}

interface SystemHealth {
  database: {
    status: string;
    responseTime: number;
    connections: number;
  };
  api: {
    status: string;
    avgResponseTime: number;
    requestsPerMinute: number;
  };
  storage: {
    total: string;
    used: string;
    available: string;
  };
  network: {
    status: string;
    bandwidth: string;
    latency: string;
  };
}

interface RecentActivity {
  id: string;
  type: string;
  message: string;
  timestamp: string;
  severity: string;
}

interface SystemAlert {
  id: string;
  type: "camera_offline" | "disk_full" | "stream_error" | "device_error";
  camera_id: string;
  camera_name: string;
  customer_name: string;
  message: string;
  severity: "low" | "medium" | "high" | "critical";
  created_at: string;
  resolved: boolean;
  notification_sent: boolean;
}

export default function AdminDiagnosticsPage() {
  const [cameras, setCameras] = useState<CameraHealth[]>([]);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [systemOverview, setSystemOverview] = useState<SystemOverview | null>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("overview");

  useEffect(() => {
    fetchDiagnostics();
    if (autoRefresh) {
      const interval = setInterval(fetchDiagnostics, 30000); // 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const fetchDiagnostics = async () => {
    try {
      const [camerasRes, alertsRes] = await Promise.all([
        fetch("/api/admin/diagnostics/cameras"),
        fetch("/api/admin/diagnostics/alerts")
      ]);
      
      const camerasData = await camerasRes.json();
      const alertsData = await alertsRes.json();
      
      if (camerasData.success) {
        setCameras(camerasData.cameras);
        setSystemOverview(camerasData.systemOverview);
        setSystemHealth(camerasData.systemHealth);
        setRecentActivity(camerasData.recentActivity);
      }
      
      if (alertsData.success) {
        setAlerts(alertsData.alerts);
      }
      
      setLastUpdate(new Date());
    } catch (error) {
      console.error("Error fetching diagnostics:", error);
    } finally {
      setLoading(false);
    }
  };

  const sendTestAlert = async (cameraId: string, type: string) => {
    try {
      await fetch("/api/admin/diagnostics/test-alert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cameraId, type })
      });
      alert("התראה נשלחה בהצלחה!");
    } catch (error) {
      alert("שגיאה בשליחת התראה");
    }
  };

  const resolveAlert = async (alertId: string) => {
    try {
      await fetch(`/api/admin/diagnostics/alerts/${alertId}/resolve`, {
        method: "POST"
      });
      fetchDiagnostics();
    } catch (error) {
      console.error("Error resolving alert:", error);
    }
  };

  const filteredCameras = cameras.filter((camera) => {
    const matchesSearch = 
      camera.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      camera.serial_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      camera.user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      camera.user?.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || camera.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: cameras.length,
    healthy: cameras.filter(c => c.status === "healthy").length,
    warning: cameras.filter(c => c.status === "warning").length,
    error: cameras.filter(c => c.status === "error").length,
    offline: cameras.filter(c => c.status === "offline").length,
    criticalAlerts: alerts.filter(a => !a.resolved && a.severity === "critical").length,
    unreadAlerts: alerts.filter(a => !a.resolved).length
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "healthy":
        return <CheckCircle size={16} className="text-green-600" />;
      case "warning":
        return <AlertTriangle size={16} className="text-orange-600" />;
      case "error":
        return <XCircle size={16} className="text-red-600" />;
      default:
        return <Activity size={16} className="text-slate-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "healthy":
        return "bg-green-100 text-green-700 border-green-200";
      case "warning":
        return "bg-orange-100 text-orange-700 border-orange-200";
      case "error":
        return "bg-red-100 text-red-700 border-red-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  if (loading) {
    return (
      <main dir="rtl" className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 pt-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white p-12 rounded-2xl shadow-sm border border-slate-200 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-slate-600">טוען מרכז אבחון מתקדם...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main dir="rtl" className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 pt-20 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-800 mb-2">🔍 מרכז אבחון מתקדם</h1>
              <p className="text-slate-600">ניטור מקיף של מערכת האבטחה והמצלמות</p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Clock size={16} />
                <span>עדכון אחרון: {lastUpdate.toLocaleTimeString("he-IL")}</span>
              </div>
              
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`p-2 rounded-lg transition-colors ${
                  autoRefresh 
                    ? "bg-green-100 text-green-700 hover:bg-green-200" 
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
                title={autoRefresh ? "השבת רענון אוטומטי" : "הפעל רענון אוטומטי"}
              >
                <RefreshCw size={16} className={autoRefresh ? "animate-spin" : ""} />
              </button>
              
              <button
                onClick={fetchDiagnostics}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <RefreshCw size={16} />
                רענן
              </button>
            </div>
          </div>
          
          {/* Enhanced System Overview */}
          {systemOverview && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Camera className="text-blue-600" size={24} />
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-slate-800">{systemOverview.totalCameras}</p>
                    <p className="text-sm text-slate-600">סה"כ מצלמות</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-green-700">{systemOverview.healthyCameras} תקינות</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span className="text-red-700">{systemOverview.errorCameras + systemOverview.offlineCameras} בעיות</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <Activity className="text-green-600" size={24} />
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-slate-800">{systemOverview.streamingCameras}</p>
                    <p className="text-sm text-slate-600">זרמים פעילים</p>
                  </div>
                </div>
                <div className="text-sm text-slate-600">
                  מתוך {systemOverview.activeCameras} מצלמות מחוברות
                </div>
              </div>
              
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-orange-100 rounded-lg">
                    <HardDrive className="text-orange-600" size={24} />
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-slate-800">{systemOverview.avgDiskUsage}%</p>
                    <p className="text-sm text-slate-600">ממוצע אחסון</p>
                  </div>
                </div>
                <div className="text-sm text-slate-600">
                  RAM: {systemOverview.avgRamUsage}%
                </div>
              </div>
              
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <TrendingUp className="text-purple-600" size={24} />
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-slate-800">{systemOverview.systemUptime}</p>
                    <p className="text-sm text-slate-600">זמן פעילות</p>
                  </div>
                </div>
                <div className="text-xs text-slate-500">
                  בדיקה אחרונה: {new Date(systemOverview.lastSystemCheck).toLocaleTimeString("he-IL")}
                </div>
              </div>
            </div>
          )}
          
          {/* Navigation Tabs */}
          <div className="flex gap-1 bg-white rounded-lg p-1 shadow-sm border border-slate-200 mb-6">
            {[
              { id: 'overview', label: 'סקירה כללית', icon: LayoutDashboard },
              { id: 'cameras', label: 'מצלמות', icon: Camera },
              { id: 'system', label: 'בריאות מערכת', icon: Shield },
              { id: 'activity', label: 'פעילות אחרונה', icon: Activity },
              { id: 'alerts', label: 'התראות', icon: Bell }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <TrendingUp size={20} className="text-blue-600" />
                סטטיסטיקות מערכת
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                  <span className="text-slate-700">מצלמות פעילות:</span>
                  <span className="text-blue-700 font-bold text-lg">
                    {systemOverview?.streamingCameras || 0}/{systemOverview?.totalCameras || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                  <span className="text-slate-700">אחוז זמינות מערכת:</span>
                  <span className="text-green-700 font-bold text-lg">99.8%</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                  <span className="text-slate-700">ממוצע זמן תגובה:</span>
                  <span className="text-orange-700 font-bold text-lg">
                    {systemHealth?.api.avgResponseTime || 0}ms
                  </span>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <AlertCircle size={20} className="text-red-600" />
                התראות פעילות
              </h3>
              <div className="space-y-3">
                {alerts.filter(a => !a.resolved).slice(0, 5).map((alert) => (
                  <div key={alert.id} className="flex items-center gap-3 p-3 bg-red-50 rounded-lg">
                    <div className={`w-2 h-2 rounded-full ${
                      alert.severity === 'critical' ? 'bg-red-600' :
                      alert.severity === 'high' ? 'bg-orange-500' :
                      alert.severity === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
                    }`}></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-800">{alert.message}</p>
                      <p className="text-xs text-slate-500">{alert.camera_name}</p>
                    </div>
                  </div>
                ))}
                {alerts.filter(a => !a.resolved).length === 0 && (
                  <div className="text-center py-8 text-slate-500">
                    <CheckCircle size={48} className="mx-auto mb-2 text-green-500" />
                    <p>אין התראות פעילות</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'system' && systemHealth && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Database size={20} className="text-blue-600" />
                בריאות מסד נתונים
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">סטטוס:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    systemHealth.database.status === 'healthy' 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {systemHealth.database.status === 'healthy' ? 'תקין' : 'בעיה'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">זמן תגובה:</span>
                  <span className="text-slate-800 font-medium">{systemHealth.database.responseTime}ms</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">חיבורים פעילים:</span>
                  <span className="text-slate-800 font-medium">{systemHealth.database.connections}</span>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Wifi size={20} className="text-green-600" />
                בריאות רשת
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">סטטוס:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    systemHealth.network.status === 'healthy' 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {systemHealth.network.status === 'healthy' ? 'תקין' : 'בעיה'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">רוחב פס:</span>
                  <span className="text-slate-800 font-medium">{systemHealth.network.bandwidth}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">זמן השהיה:</span>
                  <span className="text-slate-800 font-medium">{systemHealth.network.latency}</span>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Zap size={20} className="text-orange-600" />
                ביצועי API
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">סטטוס:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    systemHealth.api.status === 'healthy' 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {systemHealth.api.status === 'healthy' ? 'תקין' : 'בעיה'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">זמן תגובה ממוצע:</span>
                  <span className="text-slate-800 font-medium">{systemHealth.api.avgResponseTime}ms</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">בקשות לדקה:</span>
                  <span className="text-slate-800 font-medium">{systemHealth.api.requestsPerMinute}</span>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <HardDrive size={20} className="text-purple-600" />
                אחסון מערכת
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">סה"כ נפח:</span>
                  <span className="text-slate-800 font-medium">{systemHealth.storage.total}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">בשימוש:</span>
                  <span className="text-slate-800 font-medium">{systemHealth.storage.used}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">זמין:</span>
                  <span className="text-slate-800 font-medium">{systemHealth.storage.available}</span>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'activity' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Activity size={20} className="text-blue-600" />
              פעילות אחרונה במערכת
            </h3>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
                  <div className={`w-3 h-3 rounded-full ${
                    activity.severity === 'info' ? 'bg-blue-500' :
                    activity.severity === 'warning' ? 'bg-orange-500' :
                    activity.severity === 'error' ? 'bg-red-500' : 'bg-gray-500'
                  }`}></div>
                  <div className="flex-1">
                    <p className="text-slate-800 font-medium">{activity.message}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(activity.timestamp).toLocaleString('he-IL')}
                    </p>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                    activity.severity === 'info' ? 'bg-blue-100 text-blue-700' :
                    activity.severity === 'warning' ? 'bg-orange-100 text-orange-700' :
                    activity.severity === 'error' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {activity.type}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notification Settings Sidebar */}
        <div className="fixed left-6 top-1/2 transform -translate-y-1/2 z-10">
          <NotificationSettings />
        </div>
      </div>
    </main>
  );
}

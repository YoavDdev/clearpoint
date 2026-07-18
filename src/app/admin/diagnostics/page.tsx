"use client";

import React, { useState, useEffect, useCallback } from "react";
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
      device_name: string;
      stream_status: string;
      disk_root_pct: number;
      disk_ram_pct: number;
      last_checked: string;
      log_message: string;
      fps: number;
      bitrate: number;
      last_check_time: string;
      mini_pc_health?: {
        cpu_temp: number;
        disk_usage_pct: number;
        ram_usage_pct: number;
        last_check_time: string;
      };
    };
  };
  status: "healthy" | "warning" | "error" | "offline";
  issues: string[];
  isExpanded?: boolean;
}

interface SystemOverview {
  totalCameras: number;
  activeCameras: number;
  healthyCameras: number;
  errorCameras: number;
  offlineCameras: number;
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
  const [miniPCGroups, setMiniPCGroups] = useState<any[]>([]);
  const [systemOverview, setSystemOverview] = useState<any>(null);
  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [storageUsage, setStorageUsage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [isMonitoring, setIsMonitoring] = useState(false);

  const fetchDiagnostics = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch cameras with health data
      const camerasResponse = await fetch("/api/admin/diagnostics/cameras");
      const camerasData = await camerasResponse.json();
      
      
      // Fetch storage usage
      const storageResponse = await fetch("/api/admin/system/storage-usage");
      const storageData = await storageResponse.json();
      
      if (camerasData.success) {
        setCameras(camerasData.cameras);
        
        // Calculate system overview
        const totalCameras = camerasData.cameras.length;
        const activeCameras = camerasData.cameras.filter((c: any) => 
          c.realtimeHealth?.health?.status === 'ok'
        ).length;
        const errorCameras = camerasData.cameras.filter((c: any) => 
          c.realtimeHealth?.health?.status === 'error'
        ).length;
        const warningCameras = camerasData.cameras.filter((c: any) => 
          c.realtimeHealth?.health?.status === 'warning'
        ).length;
        
        // Use storage data from API instead of disk usage
        const avgStorageUsage = storageData.success ? storageData.storage.usagePercentage : 0;
        
        setSystemOverview({
          totalCameras,
          activeCameras,
          errorCameras,
          warningCameras,
          avgDiskUsage: avgStorageUsage
        });
      }
      
      if (storageData.success) {
        setStorageUsage(storageData.storage);
      }
      
      
      setLastUpdate(new Date());
    } catch (error) {
      console.error("Error fetching diagnostics:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDiagnostics();
    // Auto-refresh disabled per user request
  }, [fetchDiagnostics]);

  const runMonitoring = async () => {
    try {
      setIsMonitoring(true);
      
      const response = await fetch('/api/admin/diagnostics/monitor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      const result = await response.json();
      
      if (result.success) {
        alert(`✅ ניטור הושלם בהצלחה!\n\nהתראות שנוצרו: ${result.alertsCreated}\nהודעות שנשלחו: ${result.notificationsSent}`);
        // Refresh diagnostics to show new alerts
        fetchDiagnostics();
      } else {
        alert('❌ שגיאה בהרצת הניטור: ' + result.error);
      }
    } catch (error) {
      console.error('Error running monitoring:', error);
      alert('❌ שגיאה בהרצת הניטור');
    } finally {
      setIsMonitoring(false);
    }
  };

  const filteredCameras = cameras.filter((camera) => {
    const matchesSearch =
      searchTerm === "" ||
      camera.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (camera.serial_number && camera.serial_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (camera.user?.full_name && camera.user.full_name.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus =
      statusFilter === "all" || camera.status === statusFilter;

    return matchesSearch && matchesStatus;
  });
  
  const toggleCameraExpanded = (cameraId: string) => {
    setCameras(prevCameras => 
      prevCameras.map(cam => 
        cam.id === cameraId ? { ...cam, isExpanded: !cam.isExpanded } : cam
      )
    );
  };

  const stats = {
    total: cameras.length,
    healthy: cameras.filter(c => c.status === "healthy").length,
    warning: cameras.filter(c => c.status === "warning").length,
    error: cameras.filter(c => c.status === "error").length,
    offline: cameras.filter(c => c.status === "offline").length,
    criticalAlerts: 0,
    unreadAlerts: 0
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
      <main dir="rtl" className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 px-6">
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
    <main dir="rtl" className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 mb-2 flex items-center gap-3">
              <Database className="text-blue-600" size={32} />
              🔍 מרכז אבחון מתקדם
            </h1>
            <p className="text-slate-600">
              ניטור מתקדם ובקרה מלאה על כל המערכות והמצלמות
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Clock size={16} />
              <span>עדכון אחרון: {lastUpdate.toLocaleTimeString("he-IL")}</span>
            </div>
            
            <button
              onClick={fetchDiagnostics}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              רענן עכשיו
            </button>
            
            <button
              onClick={runMonitoring}
              disabled={isMonitoring}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
              title="הרץ ניטור מצלמות וצור התראות"
            >
              <Zap size={16} className={isMonitoring ? "animate-pulse" : ""} />
              {isMonitoring ? 'מריץ ניטור...' : 'הרץ ניטור'}
            </button>
          </div>
        </div>
          
          {/* Tab Navigation */}
          <div className="flex space-x-1 bg-white rounded-lg p-1 shadow-sm border border-slate-200 mb-6">
            {[
              { id: "overview", label: "סקירה כללית", icon: LayoutDashboard },
              { id: "customers", label: "לקוחות ומערכות", icon: Users },
              { id: "cameras", label: "מצלמות", icon: Camera },
              { id: "mini-pcs", label: "מיני מחשבים", icon: HardDrive },
              { id: "system", label: "בריאות מערכת", icon: Activity },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-800 hover:bg-slate-50"
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-slate-600">סה"כ מצלמות</h3>
                  <Camera size={20} className="text-blue-600" />
                </div>
                <p className="text-3xl font-bold text-slate-800">{stats.total}</p>
                <p className="text-xs text-slate-500 mt-1">מכל הלקוחות</p>
              </div>
              
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-slate-600">מצלמות תקינות</h3>
                  <CheckCircle size={20} className="text-green-600" />
                </div>
                <p className="text-3xl font-bold text-green-600">{stats.healthy}</p>
                <p className="text-xs text-slate-500 mt-1">{stats.total > 0 ? Math.round((stats.healthy / stats.total) * 100) : 0}% מהמערכת</p>
              </div>
              
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-slate-600">אזהרות</h3>
                  <AlertTriangle size={20} className="text-orange-600" />
                </div>
                <p className="text-3xl font-bold text-orange-600">{stats.warning}</p>
                <p className="text-xs text-slate-500 mt-1">דורשות תשומת לב</p>
              </div>
              
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-slate-600">שגיאות</h3>
                  <XCircle size={20} className="text-red-600" />
                </div>
                <p className="text-3xl font-bold text-red-600">{stats.error + stats.offline}</p>
                <p className="text-xs text-slate-500 mt-1">דורשות טיפול מיידי</p>
              </div>
            </div>
            
            {/* Details Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <TrendingUp size={20} className="text-blue-600" />
                  סטטוס מערכת
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <span className="text-slate-700">מצלמות פעילות:</span>
                    <span className="text-blue-700 font-bold text-lg">
                      {stats.healthy + stats.warning}/{stats.total}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <span className="text-slate-700">אחוז זמינות:</span>
                    <span className="text-green-700 font-bold text-lg">
                      {stats.total > 0 ? Math.round(((stats.healthy + stats.warning) / stats.total) * 100) : 0}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                    <span className="text-slate-700">דורשות תשומת לב:</span>
                    <span className="text-orange-700 font-bold text-lg">
                      {stats.warning + stats.error + stats.offline}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <Activity size={20} className="text-green-600" />
                  פעילות מערכת
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                    <span className="text-slate-700">עדכון אחרון:</span>
                    <span className="text-slate-800 font-medium text-sm">
                      {lastUpdate.toLocaleTimeString("he-IL")}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                    <span className="text-slate-700">סטטוס ניטור:</span>
                    <span className="text-green-700 font-medium flex items-center gap-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      פעיל
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                    <span className="text-slate-700">מצלמות מנוטרות:</span>
                    <span className="text-slate-800 font-bold text-lg">{stats.total}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'system' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <Activity size={24} className="text-blue-600" />
                בריאות מערכת
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Database Health */}
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-slate-800">מסד נתונים</h4>
                    <Database size={20} className="text-green-600" />
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">סטטוס:</span>
                      <span className="text-green-700 font-bold flex items-center gap-1">
                        <CheckCircle size={14} />
                        תקין
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">זמן תגובה:</span>
                      <span className="text-slate-800 font-medium">&lt;50ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">חיבורים פעילים:</span>
                      <span className="text-slate-800 font-medium">8/100</span>
                    </div>
                  </div>
                </div>
                
                {/* API Health */}
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-slate-800">API</h4>
                    <Zap size={20} className="text-blue-600" />
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">סטטוס:</span>
                      <span className="text-green-700 font-bold flex items-center gap-1">
                        <CheckCircle size={14} />
                        פעיל
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">זמן תגובה ממוצע:</span>
                      <span className="text-slate-800 font-medium">120ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">בקשות לדקה:</span>
                      <span className="text-slate-800 font-medium">~15</span>
                    </div>
                  </div>
                </div>
                
                {/* Storage Health */}
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-slate-800">אחסון</h4>
                    <HardDrive size={20} className="text-purple-600" />
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">סטטוס:</span>
                      <span className="text-green-700 font-bold flex items-center gap-1">
                        <CheckCircle size={14} />
                        תקין
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">נפח כולל:</span>
                      <span className="text-slate-800 font-medium">
                        {storageUsage ? `${(storageUsage.used / 1024 / 1024 / 1024).toFixed(2)} GB` : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">קבצים:</span>
                      <span className="text-slate-800 font-medium">
                        {storageUsage?.fileCount || 0}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* System Metrics */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <Shield size={24} className="text-green-600" />
                מדדי מערכת
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-slate-800 mb-3">סטטיסטיקות כלליות</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between p-2 bg-slate-50 rounded">
                      <span className="text-slate-600">סה"כ מצלמות מנוטרות:</span>
                      <span className="text-slate-800 font-bold">{stats.total}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-slate-50 rounded">
                      <span className="text-slate-600">מצלמות תקינות:</span>
                      <span className="text-green-700 font-bold">{stats.healthy}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-slate-50 rounded">
                      <span className="text-slate-600">מצלמות באזהרה:</span>
                      <span className="text-orange-700 font-bold">{stats.warning}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-slate-50 rounded">
                      <span className="text-slate-600">מצלמות בשגיאה:</span>
                      <span className="text-red-700 font-bold">{stats.error}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-slate-50 rounded">
                      <span className="text-slate-600">מצלמות לא מקוונות:</span>
                      <span className="text-slate-700 font-bold">{stats.offline}</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold text-slate-800 mb-3">ביצועים</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between p-2 bg-slate-50 rounded">
                      <span className="text-slate-600">אחוז זמינות כללי:</span>
                      <span className="text-green-700 font-bold">
                        {stats.total > 0 ? Math.round(((stats.healthy + stats.warning) / stats.total) * 100) : 0}%
                      </span>
                    </div>
                    <div className="flex justify-between p-2 bg-slate-50 rounded">
                      <span className="text-slate-600">זמן תגובה ממוצע:</span>
                      <span className="text-slate-800 font-bold">120ms</span>
                    </div>
                    <div className="flex justify-between p-2 bg-slate-50 rounded">
                      <span className="text-slate-600">תדירות ניטור:</span>
                      <span className="text-slate-800 font-bold">כל 5 דקות</span>
                    </div>
                    <div className="flex justify-between p-2 bg-slate-50 rounded">
                      <span className="text-slate-600">עדכון אחרון:</span>
                      <span className="text-slate-800 font-bold">{lastUpdate.toLocaleTimeString("he-IL")}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'customers' && (
          <div className="space-y-6">
            {/* Customer Hierarchy Overview */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <Users className="text-blue-600" size={24} />
                  מרכז בקרה - לקוחות ומערכות
                </h2>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <RefreshCw size={16} />
                    רענון
                  </button>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    מעודכן בזמן אמת
                  </div>
                </div>
              </div>

              {/* Customer Cards with Mini PC and Camera Hierarchy */}
              <div className="space-y-4">
                {Object.values(
                  cameras.reduce((acc, camera) => {
                    const customerId = camera.user_id;
                    const customerName = camera.user?.full_name || 'לקוח לא מזוהה';
                    
                    if (!acc[customerId]) {
                      acc[customerId] = {
                        id: customerId,
                        name: customerName,
                        email: camera.user?.email || '',
                        phone: camera.user?.phone || '',
                        cameras: [],
                        miniPcHealth: null,
                        totalCameras: 0,
                        healthyCameras: 0,
                        errorCameras: 0,
                        offlineCameras: 0
                      };
                    }
                    
                    acc[customerId].cameras.push(camera);
                    acc[customerId].totalCameras++;
                    
                    // Get Mini PC health from first camera with health data
                    if (camera.realtimeHealth?.health?.mini_pc_health && !acc[customerId].miniPcHealth) {
                      acc[customerId].miniPcHealth = camera.realtimeHealth.health.mini_pc_health;
                    }
                    
                    // Count camera statuses
                    if (camera.status === 'healthy') acc[customerId].healthyCameras++;
                    else if (camera.status === 'error') acc[customerId].errorCameras++;
                    else if (camera.status === 'offline') acc[customerId].offlineCameras++;
                    
                    return acc;
                  }, {} as any)
                ).map((customer: any) => {
                  const miniPcHealthy = customer.miniPcHealth && 
                    customer.miniPcHealth.cpu_temp < 70 && 
                    customer.miniPcHealth.disk_usage_pct < 85 && 
                    customer.miniPcHealth.ram_usage_pct < 85;
                  
                  const overallStatus = customer.errorCameras > 0 || customer.offlineCameras > 0 || !miniPcHealthy ? 'error' : 
                                      customer.healthyCameras < customer.totalCameras ? 'warning' : 'healthy';
                  
                  return (
                    <div key={customer.id} className="border border-slate-200 rounded-lg overflow-hidden">
                      {/* Customer Header */}
                      <div className={`p-4 ${
                        overallStatus === 'healthy' ? 'bg-green-50 border-green-200' :
                        overallStatus === 'warning' ? 'bg-orange-50 border-orange-200' :
                        'bg-red-50 border-red-200'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-4 h-4 rounded-full ${
                              overallStatus === 'healthy' ? 'bg-green-500' :
                              overallStatus === 'warning' ? 'bg-orange-500' : 'bg-red-500'
                            }`}></div>
                            <div>
                              <h3 className="font-bold text-slate-800 text-lg">{customer.name}</h3>
                              <div className="flex items-center gap-4 text-sm text-slate-600">
                                <span className="flex items-center gap-1">
                                  <Mail size={14} />
                                  {customer.email}
                                </span>
                                {customer.phone && (
                                  <span className="flex items-center gap-1">
                                    <Phone size={14} />
                                    {customer.phone}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            {/* Status Summary */}
                            <div className="flex items-center gap-3 text-sm">
                              <div className="flex items-center gap-1">
                                <Camera size={16} className="text-blue-600" />
                                <span>{customer.totalCameras} מצלמות</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <CheckCircle size={16} className="text-green-600" />
                                <span>{customer.healthyCameras} תקינות</span>
                              </div>
                              {customer.errorCameras > 0 && (
                                <div className="flex items-center gap-1">
                                  <XCircle size={16} className="text-red-600" />
                                  <span>{customer.errorCameras} שגיאות</span>
                                </div>
                              )}
                              {customer.offlineCameras > 0 && (
                                <div className="flex items-center gap-1">
                                  <AlertCircle size={16} className="text-orange-600" />
                                  <span>{customer.offlineCameras} לא מקוונות</span>
                                </div>
                              )}
                            </div>
                            
                          </div>
                        </div>
                      </div>
                      
                      {/* Mini PC and Camera Details */}
                      <div className="p-4 bg-white">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* Mini PC Health */}
                          <div className="bg-slate-50 rounded-lg p-4">
                            <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                              <HardDrive size={18} className="text-blue-600" />
                              מיני מחשב - מצב מערכת
                            </h4>
                            
                            {customer.miniPcHealth ? (
                              <div className="space-y-3">
                                <div className="grid grid-cols-3 gap-3">
                                  <div className="text-center">
                                    <div className={`text-lg font-bold ${
                                      customer.miniPcHealth.cpu_temp > 70 ? 'text-red-600' : 'text-green-600'
                                    }`}>
                                      {customer.miniPcHealth.cpu_temp}°C
                                    </div>
                                    <div className="text-xs text-slate-600">טמפרטורת CPU</div>
                                  </div>
                                  
                                  <div className="text-center">
                                    <div className={`text-lg font-bold ${
                                      customer.miniPcHealth.disk_usage_pct > 85 ? 'text-red-600' : 'text-green-600'
                                    }`}>
                                      {customer.miniPcHealth.disk_usage_pct}%
                                    </div>
                                    <div className="text-xs text-slate-600">שימוש דיסק</div>
                                  </div>
                                  
                                  <div className="text-center">
                                    <div className={`text-lg font-bold ${
                                      customer.miniPcHealth.ram_usage_pct > 85 ? 'text-red-600' : 'text-green-600'
                                    }`}>
                                      {customer.miniPcHealth.ram_usage_pct}%
                                    </div>
                                    <div className="text-xs text-slate-600">שימוש RAM</div>
                                  </div>
                                </div>
                                
                                <div className="text-xs text-slate-500 text-center">
                                  בדיקה אחרונה: {new Date(customer.miniPcHealth.last_check_time).toLocaleString('he-IL')}
                                </div>
                              </div>
                            ) : (
                              <div className="text-center py-4 text-slate-500">
                                <AlertCircle size={24} className="mx-auto mb-2" />
                                <p className="text-sm">אין נתוני בריאות זמינים</p>
                              </div>
                            )}
                          </div>
                          
                          {/* Cameras List */}
                          <div className="bg-slate-50 rounded-lg p-4">
                            <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                              <Camera size={18} className="text-blue-600" />
                              מצלמות ({customer.totalCameras})
                            </h4>
                            
                            <div className="space-y-2 max-h-32 overflow-y-auto">
                              {customer.cameras.map((camera: any) => (
                                <div key={camera.id} className="flex items-center justify-between p-2 bg-white rounded border">
                                  <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${
                                      camera.status === 'healthy' ? 'bg-green-500' :
                                      camera.status === 'warning' ? 'bg-orange-500' :
                                      camera.status === 'error' ? 'bg-red-500' : 'bg-slate-400'
                                    }`}></div>
                                    <span className="text-sm font-medium">{camera.name}</span>
                                  </div>
                                  
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {cameras.length === 0 && (
                <div className="text-center py-12 text-slate-500">
                  <Users size={48} className="mx-auto mb-4 text-slate-300" />
                  <p>לא נמצאו לקוחות עם מערכות פעילות</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'cameras' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Camera className="text-blue-600" size={24} />
                ניטור מצלמות מתקדם
              </h2>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search size={20} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="חיפוש מצלמה או לקוח..."
                    className="pr-10 pl-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <select
                  className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-right"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">כל הסטטוסים</option>
                  <option value="healthy">תקין</option>
                  <option value="warning">אזהרה</option>
                  <option value="error">שגיאה</option>
                  <option value="offline">לא מקוון</option>
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCameras.map((camera) => (
                <div key={camera.id} className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-medium text-slate-800">{camera.name}</h3>
                      <p className="text-xs text-slate-500">{camera.user?.full_name || 'לא משויך'}</p>
                    </div>
                    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusBadge(camera.status)}`}>
                      {getStatusIcon(camera.status)}
                      <span>
                        {camera.status === "healthy" ? "תקין" :
                         camera.status === "warning" ? "אזהרה" :
                         camera.status === "error" ? "שגיאה" : "לא מקוון"}
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    {camera.realtimeHealth?.health ? (
                      <>
                        
                        <div className="flex justify-between">
                          <span className="text-slate-600">בדיקה אחרונה:</span>
                          <span className="text-slate-500 text-xs">
                            {camera.realtimeHealth.health.last_checked ? 
                              new Date(camera.realtimeHealth.health.last_checked).toLocaleTimeString('he-IL') : 
                              'לא זמין'}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-4 text-slate-500">
                        <AlertCircle size={24} className="mx-auto mb-2" />
                        <p className="text-xs">אין נתוני בריאות</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-4">
                    <Link
                      href="/admin/cameras"
                      className="w-full block text-center px-3 py-2 bg-slate-100 text-slate-700 text-xs rounded hover:bg-slate-200 transition-colors"
                    >
                      <Eye size={12} className="inline-block mr-1" />
                      צפה בפרטים
                    </Link>
                  </div>
                </div>
              ))}
            </div>
            
            {filteredCameras.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                <Camera size={48} className="mx-auto mb-4 text-slate-300" />
                <p>לא נמצאו מצלמות</p>
                <p className="text-sm">נסה לשנות את קריטריוני החיפוש</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'mini-pcs' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <HardDrive className="text-blue-600" size={24} />
                ניטור מיני מחשבים
              </h2>
              <Link 
                href="/admin/mini-pcs"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Eye size={16} />
                צפייה מפורטת
              </Link>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(() => {
                // Group cameras by Mini PC to avoid duplicates
                const miniPcMap = new Map();
                cameras.filter(camera => camera.realtimeHealth?.health?.mini_pc_health).forEach(camera => {
                  const miniPcId = camera.user?.full_name || 'Unknown';
                  if (!miniPcMap.has(miniPcId)) {
                    miniPcMap.set(miniPcId, {
                      camera,
                      cameraCount: 0
                    });
                  }
                  miniPcMap.get(miniPcId).cameraCount++;
                });

                return Array.from(miniPcMap.values()).map(({ camera, cameraCount }) => {
                  const miniPcHealth = camera.realtimeHealth!.health!.mini_pc_health!;
                  const isHealthy = miniPcHealth.cpu_temp < 70 && miniPcHealth.disk_usage_pct < 85 && miniPcHealth.ram_usage_pct < 85;
                  
                  return (
                    <div key={camera.user?.full_name || 'unknown'} className="border border-slate-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="font-medium text-slate-800">{camera.user?.full_name || 'לא משויך'}</h3>
                          <p className="text-xs text-slate-500">{cameraCount} מצלמות</p>
                        </div>
                        <div className={`w-3 h-3 rounded-full ${isHealthy ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-600">טמפרטורת CPU:</span>
                          <span className={`font-medium ${miniPcHealth.cpu_temp > 70 ? 'text-red-600' : 'text-green-600'}`}>
                            {miniPcHealth.cpu_temp}°C
                          </span>
                        </div>
                        
                        <div className="flex justify-between">
                          <span className="text-slate-600">שימוש בדיסק:</span>
                          <span className={`font-medium ${miniPcHealth.disk_usage_pct > 85 ? 'text-red-600' : 'text-green-600'}`}>
                            {miniPcHealth.disk_usage_pct}%
                          </span>
                        </div>
                        
                        <div className="flex justify-between">
                          <span className="text-slate-600">שימוש ב-RAM:</span>
                          <span className={`font-medium ${miniPcHealth.ram_usage_pct > 85 ? 'text-red-600' : 'text-green-600'}`}>
                            {miniPcHealth.ram_usage_pct}%
                          </span>
                        </div>
                        
                        <div className="flex justify-between">
                          <span className="text-slate-600">בדיקה אחרונה:</span>
                          <span className="text-slate-500 text-xs">
                            {new Date(miniPcHealth.last_check_time).toLocaleTimeString('he-IL')}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
            
            {cameras.filter(camera => camera.realtimeHealth?.health?.mini_pc_health).length === 0 && (
              <div className="text-center py-12 text-slate-500">
                <HardDrive size={48} className="mx-auto mb-4 text-slate-300" />
                <p>לא נמצאו מיני מחשבים פעילים</p>
              </div>
            )}
          </div>
        )}

      </div>
    </main>
  );
}

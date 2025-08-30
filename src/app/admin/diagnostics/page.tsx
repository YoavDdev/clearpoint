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
  const [alerts, setAlerts] = useState<any[]>([]);
  const [systemOverview, setSystemOverview] = useState<any>(null);
  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("overview");

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/notifications");
      const data = await response.json();
      
      if (data.notifications) {
        setNotifications(data.notifications);
        setUnreadCount(data.notifications.filter((n: any) => !n.is_read).length);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  }, []);

  const fetchDiagnostics = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch cameras with health data
      const camerasResponse = await fetch("/api/admin/diagnostics/cameras");
      const camerasData = await camerasResponse.json();
      
      // Fetch alerts
      const alertsResponse = await fetch("/api/admin/diagnostics/alerts");
      const alertsData = await alertsResponse.json();
      
      if (camerasData.success) {
        setCameras(camerasData.cameras);
        setMiniPCGroups(camerasData.miniPCGroups || []);
        setSystemOverview(camerasData.systemOverview);
      }
      
      if (alertsData.success) {
        setAlerts(alertsData.alerts);
      }
      
      // Fetch notifications
      await fetchNotifications();
      
      setLastUpdate(new Date());
    } catch (error) {
      console.error("Error fetching diagnostics:", error);
    } finally {
      setLoading(false);
    }
  }, [fetchNotifications]);

  useEffect(() => {
    fetchDiagnostics();
    // Auto-refresh disabled per user request
  }, [fetchDiagnostics]);

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
      const response = await fetch('/api/admin/diagnostics/alerts/resolve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ alertId })
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Alert resolved successfully');
        fetchDiagnostics();
      } else {
        console.error('Failed to resolve alert:', result.error);
        alert('שגיאה בפתרון ההתראה: ' + result.error);
      }
    } catch (error) {
      console.error('Error resolving alert:', error);
      alert('שגיאה בפתרון ההתראה');
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
            {/* Real-time Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <BellRing size={16} className={unreadCount > 0 ? "text-red-600" : "text-slate-600"} />
                <span className="text-sm font-medium">התראות</span>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              
              {showNotifications && (
                <div className="absolute left-0 top-full mt-2 w-80 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
                  <div className="p-4 border-b border-slate-200">
                    <h3 className="font-semibold text-slate-800">התראות מערכת</h3>
                  </div>
                  
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.length > 0 ? (
                      notifications.slice(0, 10).map((notification) => (
                        <div
                          key={notification.id}
                          className={`p-3 border-b border-slate-100 hover:bg-slate-50 ${
                            !notification.is_read ? 'bg-blue-50' : ''
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <div className={`w-2 h-2 rounded-full ${
                                  notification.severity === 'critical' ? 'bg-red-500' :
                                  notification.severity === 'high' ? 'bg-orange-500' :
                                  notification.severity === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
                                }`}></div>
                                <span className="text-sm font-medium text-slate-800">
                                  {notification.title}
                                </span>
                              </div>
                              <p className="text-xs text-slate-600 mb-1">
                                {notification.message}
                              </p>
                              <span className="text-xs text-slate-400">
                                {new Date(notification.created_at).toLocaleString('he-IL')}
                              </span>
                            </div>
                            {!notification.is_read && (
                              <button
                                onClick={async () => {
                                  await fetch("/api/admin/notifications", {
                                    method: "PATCH",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ 
                                      notification_id: notification.id, 
                                      is_read: true 
                                    })
                                  });
                                  fetchNotifications();
                                }}
                                className="text-xs text-blue-600 hover:text-blue-800"
                              >
                                סמן כנקרא
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-6 text-center text-slate-500">
                        <Bell size={24} className="mx-auto mb-2 text-slate-300" />
                        <p className="text-sm">אין התראות חדשות</p>
                      </div>
                    )}
                  </div>
                  
                  {notifications.length > 10 && (
                    <div className="p-3 border-t border-slate-200 text-center">
                      <button className="text-sm text-blue-600 hover:text-blue-800">
                        צפה בכל ההתראות
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Clock size={16} />
              <span>עדכון אחרון: {lastUpdate.toLocaleTimeString("he-IL")}</span>
            </div>
            
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                autoRefresh
                  ? "bg-green-100 text-green-700 border border-green-200"
                  : "bg-slate-100 text-slate-700 border border-slate-200"
              }`}
            >
              {autoRefresh ? <Play size={16} /> : <Pause size={16} />}
              {autoRefresh ? "רענון אוטומטי" : "רענון ידני"}
            </button>
            
            <button
              onClick={fetchDiagnostics}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              רענן עכשיו
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
          
          {/* Tab Navigation */}
          <div className="flex space-x-1 bg-white rounded-lg p-1 shadow-sm border border-slate-200 mb-6">
            {[
              { id: "overview", label: "סקירה כללית", icon: LayoutDashboard },
              { id: "customers", label: "לקוחות ומערכות", icon: Users },
              { id: "cameras", label: "מצלמות", icon: Camera },
              { id: "mini-pcs", label: "מיני מחשבים", icon: HardDrive },
              { id: "system", label: "בריאות מערכת", icon: Activity },
              { id: "alerts", label: "התראות", icon: AlertTriangle },
              { id: "activity", label: "פעילות", icon: Clock },
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
                            
                            {/* Alert Button */}
                            {overallStatus !== 'healthy' && (
                              <button
                                onClick={() => sendTestAlert(customer.cameras[0].id, "customer_system_alert")}
                                className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors flex items-center gap-1"
                              >
                                <Bell size={14} />
                                שלח התראה
                              </button>
                            )}
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
                                  
                                  <div className="flex items-center gap-2 text-xs">
                                    
                                    <button
                                      onClick={() => sendTestAlert(camera.id, "camera_test")}
                                      className="px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                                    >
                                      בדיקה
                                    </button>
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
                  
                  <div className="mt-4 flex items-center gap-2">
                    <button
                      onClick={() => sendTestAlert(camera.id, "test_notification")}
                      className="flex-1 px-3 py-2 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors flex items-center justify-center gap-1"
                    >
                      <Bell size={12} />
                      בדיקה
                    </button>
                    <Link
                      href="/admin/cameras"
                      className="px-3 py-2 bg-slate-100 text-slate-700 text-xs rounded hover:bg-slate-200 transition-colors"
                    >
                      <Eye size={12} />
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

        {activeTab === 'alerts' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Bell size={20} className="text-red-600" />
              התראות מערכת
            </h3>
            <div className="space-y-4">
              {alerts.map((alert) => (
                <div key={alert.id} className={`p-4 rounded-lg border ${
                  alert.resolved ? 'bg-gray-50 border-gray-200' : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        alert.severity === 'critical' ? 'bg-red-600' :
                        alert.severity === 'high' ? 'bg-orange-500' :
                        alert.severity === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
                      }`}></div>
                      <div>
                        <p className="font-medium text-slate-800">{alert.message}</p>
                        <p className="text-sm text-slate-600">
                          {alert.camera_name} • {alert.customer_name}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">
                        {new Date(alert.created_at).toLocaleString('he-IL')}
                      </span>
                      {!alert.resolved && (
                        <button
                          onClick={() => resolveAlert(alert.id)}
                          className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors"
                        >
                          פתור
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {alerts.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  <CheckCircle size={48} className="mx-auto mb-2 text-green-500" />
                  <p>אין התראות במערכת</p>
                </div>
              )}
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

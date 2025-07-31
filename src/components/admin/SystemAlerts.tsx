"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

interface Alert {
  id: string;
  type: "critical" | "warning" | "info";
  title: string;
  message: string;
  action?: {
    text: string;
    href: string;
  };
  timestamp: Date;
}

export function SystemAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const generateAlerts = async () => {
    const newAlerts: Alert[] = [];

    try {
      // Check for offline cameras
      const { data: offlineCameras } = await supabase
        .from("cameras")
        .select("name, user:users!cameras_user_id_fkey(full_name), last_seen_at")
        .eq("is_stream_active", false);

      if (offlineCameras && offlineCameras.length > 0) {
        offlineCameras.forEach((camera: any) => {
          const userName = Array.isArray(camera.user) 
            ? camera.user[0]?.full_name 
            : camera.user?.full_name;
          
          newAlerts.push({
            id: `offline-${camera.name}`,
            type: "critical",
            title: "מצלמה לא מקוונת",
            message: `מצלמה "${camera.name}" של ${userName} לא פעילה`,
            action: {
              text: "צפה במצלמות",
              href: "/admin/cameras"
            },
            timestamp: new Date()
          });
        });
      }

      // Check for pending support requests
      const { count: pendingSupport } = await supabase
        .from("support_requests")
        .select("*", { count: "exact", head: true })
        .eq("is_handled", false);

      if (pendingSupport && pendingSupport > 0) {
        newAlerts.push({
          id: "pending-support",
          type: "warning",
          title: "בקשות תמיכה ממתינות",
          message: `יש ${pendingSupport} בקשות תמיכה שטרם טופלו`,
          action: {
            text: "צפה בתמיכה",
            href: "/admin/support"
          },
          timestamp: new Date()
        });
      }

      // Check for new subscription requests
      const { count: newRequests } = await supabase
        .from("subscription_requests")
        .select("*", { count: "exact", head: true })
        .eq("status", "new");

      if (newRequests && newRequests > 0) {
        newAlerts.push({
          id: "new-requests",
          type: "info",
          title: "בקשות הרשמה חדשות",
          message: `יש ${newRequests} בקשות הרשמה חדשות`,
          action: {
            text: "צפה בבקשות",
            href: "/admin/requests"
          },
          timestamp: new Date()
        });
      }

      // Check for cameras with high disk usage
      const { data: cameras } = await supabase
        .from("cameras")
        .select("id, name, user:users!cameras_user_id_fkey(full_name)")
        .eq("is_stream_active", true);

      if (cameras) {
        for (const camera of cameras) {
          try {
            const res = await fetch(`/api/camera-health/${camera.id}`);
            const healthData = await res.json();
            
            if (healthData.success && healthData.health?.disk_root_pct > 85) {
              const userName = Array.isArray((camera as any).user) 
                ? (camera as any).user[0]?.full_name 
                : (camera as any).user?.full_name;
              
              newAlerts.push({
                id: `disk-${camera.id}`,
                type: healthData.health.disk_root_pct > 95 ? "critical" : "warning",
                title: "שימוש דיסק גבוה",
                message: `מצלמה "${camera.name}" של ${userName} - ${healthData.health.disk_root_pct}% שימוש דיסק`,
                action: {
                  text: "צפה במצלמות",
                  href: "/admin/cameras"
                },
                timestamp: new Date()
              });
            }
          } catch (error) {
            // Skip health check errors
          }
        }
      }

      // Add system info alert if no issues
      if (newAlerts.length === 0) {
        newAlerts.push({
          id: "system-ok",
          type: "info",
          title: "המערכת פועלת תקין",
          message: "כל המצלמות פעילות ואין בעיות דחופות",
          timestamp: new Date()
        });
      }

      setAlerts(newAlerts);
    } catch (error) {
      console.error("Failed to generate alerts:", error);
      setAlerts([{
        id: "error",
        type: "critical",
        title: "שגיאה בטעינת התראות",
        message: "לא ניתן לטעון את סטטוס המערכת",
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generateAlerts();
    
    // Update alerts every 2 minutes
    const interval = setInterval(generateAlerts, 120000);
    
    return () => clearInterval(interval);
  }, []);

  const getAlertStyles = (type: Alert["type"]) => {
    switch (type) {
      case "critical":
        return {
          container: "bg-red-50 border-red-200 border-l-4 border-l-red-500",
          icon: "🚨",
          title: "text-red-800",
          message: "text-red-700"
        };
      case "warning":
        return {
          container: "bg-yellow-50 border-yellow-200 border-l-4 border-l-yellow-500",
          icon: "⚠️",
          title: "text-yellow-800",
          message: "text-yellow-700"
        };
      case "info":
        return {
          container: "bg-blue-50 border-blue-200 border-l-4 border-l-blue-500",
          icon: "ℹ️",
          title: "text-blue-800",
          message: "text-blue-700"
        };
    }
  };

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-12 bg-gray-200 rounded"></div>
            <div className="h-12 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">🔔 התראות מערכת</h3>
        <button
          onClick={generateAlerts}
          className="text-blue-600 hover:text-blue-800 text-sm"
        >
          🔄 רענן
        </button>
      </div>
      
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {alerts.map((alert) => {
          const styles = getAlertStyles(alert.type);
          
          return (
            <div
              key={alert.id}
              className={`p-4 rounded-lg border ${styles.container}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 space-x-reverse">
                  <span className="text-lg">{styles.icon}</span>
                  <div className="flex-1">
                    <h4 className={`font-medium text-sm ${styles.title}`}>
                      {alert.title}
                    </h4>
                    <p className={`text-sm mt-1 ${styles.message}`}>
                      {alert.message}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      {alert.timestamp.toLocaleTimeString("he-IL")}
                    </p>
                  </div>
                </div>
                
                {alert.action && (
                  <Link
                    href={alert.action.href}
                    className="text-sm bg-white px-3 py-1 rounded border hover:bg-gray-50 transition"
                  >
                    {alert.action.text}
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

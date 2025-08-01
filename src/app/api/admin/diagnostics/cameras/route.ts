import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // Get all cameras with user info and health data
    const { data: cameras, error } = await supabase
      .from("cameras")
      .select(`
        id,
        name,
        serial_number,
        stream_path,
        user_id,
        is_stream_active,
        last_seen_at,
        created_at,
        user:users!cameras_user_id_fkey(full_name, email, phone)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Get real-time health data for all cameras (same approach as cameras page)
    const healthPromises = cameras?.map(async (camera) => {
      try {
        // Use the same real-time health check as the cameras page
        const healthResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/camera-health/${camera.id}`);
        const healthData = await healthResponse.json();
        
        return { ...camera, realtimeHealth: healthData };
      } catch {
        return { ...camera, realtimeHealth: null };
      }
    }) || [];

    const camerasWithHealth = await Promise.all(healthPromises);

    // Process cameras and add diagnostic information
    const processedCameras = camerasWithHealth.map((camera) => {
      const issues: string[] = [];
      let status: "healthy" | "warning" | "error" | "offline" = "offline"; // Default to offline
      let severity: "low" | "medium" | "high" | "critical" = "critical"; // Default to critical

      // Check if we have real-time health data from camera-health API
      if (camera.realtimeHealth?.success) {
        if (camera.realtimeHealth?.health) {
          // We have actual health data
          const health = camera.realtimeHealth.health;
          
          // Reset to healthy if we have health data
          status = "healthy";
          severity = "low";
          
          // Check last_checked timestamp - camera is considered online if checked recently
          if (health.last_checked) {
            const lastCheck = new Date(health.last_checked);
            const diffMinutes = (Date.now() - lastCheck.getTime()) / (1000 * 60);
            
            if (diffMinutes > 15) {
              issues.push(`בדיקת בריאות לא מעודכנת (${Math.round(diffMinutes)} דקות)`);
              status = "warning";
              severity = "medium";
            }
          } else {
            issues.push("אין נתוני בדיקת בריאות");
            status = "offline";
            severity = "critical";
          }
          
          // Check stream status from real-time health data
          if (health.stream_status) {
            if (health.stream_status.toLowerCase() === "error") {
              issues.push("שגיאה בזרם");
              status = status === "offline" ? "offline" : "error";
              severity = "high";
            } else if (health.stream_status.toLowerCase() === "stale") {
              issues.push(`זרם לא מעודכן - ${health.log_message || 'Stream stale'}`);
              status = status === "offline" ? "offline" : "error";
              severity = "high";
            } else if (health.stream_status.toLowerCase() === "warning") {
              issues.push("אזהרה בזרם");
              if (status === "healthy") status = "warning";
              if (severity === "low") severity = "medium";
            }
          }
          
          // Check disk usage from real-time health data
          if (health.disk_root_pct !== null && health.disk_root_pct !== undefined) {
            if (health.disk_root_pct > 90) {
              issues.push(`דיסק מלא (${health.disk_root_pct}%)`);
              status = status === "offline" ? "offline" : "error";
              severity = "critical";
            } else if (health.disk_root_pct > 75) {
              issues.push(`דיסק כמעט מלא (${health.disk_root_pct}%)`);
              if (status === "healthy") status = "warning";
              if (severity === "low") severity = "medium";
            }
          }
          
          // Check RAM usage from real-time health data
          if (health.disk_ram_pct !== null && health.disk_ram_pct !== undefined) {
            if (health.disk_ram_pct > 90) {
              issues.push(`זיכרון מלא (${health.disk_ram_pct}%)`);
              status = status === "offline" ? "offline" : "error";
              severity = "high";
            } else if (health.disk_ram_pct > 75) {
              issues.push(`זיכרון גבוה (${health.disk_ram_pct}%)`);
              if (status === "healthy") status = "warning";
              if (severity === "low") severity = "medium";
            }
          }
        } else {
          // Camera exists but no health data yet - this is normal for new cameras
          issues.push("מצלמה חדשה - ממתינה לנתוני בריאות ראשונים");
          status = "warning";
          severity = "medium";
        }
        
      } else {
        // No real-time health data available
        issues.push("אין נתוני בריאות זמינים");
        status = "offline";
        severity = "critical";
      }

      // Additional validation: Check if camera is configured for streaming
      if (!camera.is_stream_active && status !== "offline") {
        issues.push("זרם לא מוגדר כפעיל");
        if (status === "healthy") status = "warning";
        if (severity === "low") severity = "medium";
      }


      // Check user assignment
      if (!camera.user_id) {
        issues.push("לא משויך ללקוח");
        if (status === "healthy") status = "warning";
        if (severity === "low") severity = "medium";
      }

      // Check serial number
      if (!camera.serial_number || camera.serial_number.trim() === "") {
        issues.push("חסר מספר סידורי");
        if (status === "healthy") status = "warning";
        if (severity === "low") severity = "medium";
      }

      // Check stream path
      if (!camera.stream_path || !camera.stream_path.includes("rtsp://")) {
        issues.push("נתיב זרם לא תקין");
        status = status === "offline" ? "offline" : "error";
        severity = "high";
      }

      return {
        ...camera,
        issues,
        status,
        severity,
        user: Array.isArray(camera.user) ? camera.user[0] || null : camera.user,
      };
    });

    // Calculate system overview metrics
    const totalCameras = processedCameras.length;
    const healthyCameras = processedCameras.filter(c => c.status === 'healthy').length;
    const warningCameras = processedCameras.filter(c => c.status === 'warning').length;
    const errorCameras = processedCameras.filter(c => c.status === 'error').length;
    const offlineCameras = processedCameras.filter(c => c.status === 'offline').length;
    
    // Calculate storage metrics
    const totalDiskUsage = processedCameras.reduce((sum, camera) => {
      return sum + (camera.realtimeHealth?.success ? camera.realtimeHealth.health?.disk_root_pct || 0 : 0);
    }, 0);
    const avgDiskUsage = totalCameras > 0 ? Math.round(totalDiskUsage / totalCameras) : 0;
    
    const totalRamUsage = processedCameras.reduce((sum, camera) => {
      return sum + (camera.realtimeHealth?.success ? camera.realtimeHealth.health?.disk_ram_pct || 0 : 0);
    }, 0);
    const avgRamUsage = totalCameras > 0 ? Math.round(totalRamUsage / totalCameras) : 0;
    
    // Calculate uptime metrics
    const activeCameras = processedCameras.filter(c => c.is_stream_active).length;
    const streamingCameras = processedCameras.filter(c => 
      c.realtimeHealth?.success && c.realtimeHealth.health?.stream_status === 'OK'
    ).length;
    
    // Get recent activity from system_alerts table (real data)
    const { data: recentActivity } = await supabase
      .from("system_alerts")
      .select('id, type, message, created_at, severity')
      .order('created_at', { ascending: false })
      .limit(10);
    
    const formattedActivity = recentActivity?.map(alert => ({
      id: alert.id,
      type: alert.type,
      message: alert.message,
      timestamp: alert.created_at,
      severity: alert.severity
    })) || [];
    
    // System health metrics
    const systemHealth = {
      database: {
        status: 'healthy',
        responseTime: Math.floor(Math.random() * 50) + 10, // Simulated
        connections: Math.floor(Math.random() * 10) + 5
      },
      api: {
        status: 'healthy',
        avgResponseTime: Math.floor(Math.random() * 100) + 50,
        requestsPerMinute: Math.floor(Math.random() * 50) + 20
      },
      storage: {
        total: '2TB',
        used: `${Math.floor(Math.random() * 40) + 30}%`,
        available: '1.2TB'
      },
      network: {
        status: 'healthy',
        bandwidth: `${Math.floor(Math.random() * 50) + 100}Mbps`,
        latency: `${Math.floor(Math.random() * 20) + 5}ms`
      }
    };
    
    return NextResponse.json({
      success: true,
      cameras: processedCameras,
      systemOverview: {
        totalCameras,
        healthyCameras,
        warningCameras,
        errorCameras,
        offlineCameras,
        activeCameras,
        streamingCameras,
        avgDiskUsage,
        avgRamUsage,
        systemUptime: '15 days, 3 hours', // Simulated
        lastSystemCheck: new Date().toISOString()
      },
      systemHealth,
      recentActivity: formattedActivity,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Diagnostics cameras error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch camera diagnostics' },
      { status: 500 }
    );
  }
}

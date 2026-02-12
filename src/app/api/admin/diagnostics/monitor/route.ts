import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { sendEmailNotification, sendWhatsAppNotification, NotificationData } from "@/lib/notifications";

export const dynamic = 'force-dynamic';

// This endpoint will be called by a cron job or monitoring service
export async function POST() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // Load system settings
    const { data: settingsData, error: settingsError } = await supabase
      .from("system_settings")
      .select("setting_key, setting_value, setting_type");
    
    if (settingsError) {
      console.error('❌ Failed to load settings from database:', settingsError);
      console.log('⚠️ Using hardcoded defaults');
    }
    
    const settings: Record<string, any> = {};
    settingsData?.forEach((setting) => {
      let value = setting.setting_value;
      if (setting.setting_type === 'boolean') {
        value = value === 'true';
      } else if (setting.setting_type === 'number') {
        value = parseInt(value, 10);
      }
      settings[setting.setting_key] = value;
    });
    
    console.log('📋 Loaded settings:', {
      email_enabled: settings.email_notifications_enabled,
      email: settings.alert_email_address,
      health_timeout: settings.health_check_timeout_seconds,
      stream_timeout: settings.stream_check_timeout_seconds,
      monitoring_interval: settings.monitoring_interval_minutes
    });

    // Get configuration values from settings (with defaults)
    const emailNotificationsEnabled = settings.email_notifications_enabled ?? true;
    const adminEmail = settings.alert_email_address || 'yoavddev@gmail.com';
    const healthCheckTimeoutMinutes = (settings.health_check_timeout_seconds || 180) / 60;
    const streamCheckTimeoutSeconds = settings.stream_check_timeout_seconds || 240;
    const criticalThresholdMinutes = settings.critical_alert_threshold_minutes || 10;
    
    console.log(`📧 Email notifications: ${emailNotificationsEnabled ? 'enabled' : 'disabled'}`);
    console.log(`📧 Admin email: ${adminEmail}`);
    console.log(`⏰ Health timeout: ${healthCheckTimeoutMinutes} minutes`);
    console.log(`📺 Stream timeout: ${streamCheckTimeoutSeconds} seconds`);
    console.log(`🔴 Critical threshold: ${criticalThresholdMinutes} minutes`);
    // Get all cameras with health data
    const { data: cameras, error } = await supabase
      .from("cameras")
      .select(`
        id,
        name,
        serial_number,
        user_id,
        is_stream_active,
        last_seen_at,
        user:users!cameras_user_id_fkey(full_name, email, phone)
      `);

    if (error) throw error;

    // Get all Mini PCs with health data
    const { data: miniPcs, error: miniPcError } = await supabase
      .from("mini_pcs")
      .select(`
        id,
        hostname,
        user_id,
        user:users!mini_pcs_user_id_fkey(full_name, email, phone)
      `);

    if (miniPcError) throw miniPcError;

    const alertsToCreate = [];
    const notificationsToSend = [];

    // SMART ALERT LOGIC: Check Mini PC status first
    // If Mini PC is offline, don't spam about individual cameras
    const offlineMiniPcs = new Set<string>();
    
    for (const miniPc of miniPcs || []) {
      const user = Array.isArray(miniPc.user) ? miniPc.user[0] : miniPc.user;
      
      // Get real-time Mini PC health data
      let miniPcHealthData = null;
      try {
        const healthResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/mini-pc-health/${miniPc.id}`);
        const healthResult = await healthResponse.json();
        if (healthResult.success) {
          miniPcHealthData = healthResult.health;
        }
      } catch (error) {
        console.error(`Failed to get Mini PC health data for ${miniPc.id}:`, error);
      }
      
      // Check if Mini PC is offline (use same logic as below)
      let isMiniPcOffline = false;
      if (!miniPcHealthData || !miniPcHealthData.last_checked) {
        isMiniPcOffline = true;
      } else {
        const lastCheck = new Date(miniPcHealthData.last_checked);
        const diffMinutes = (Date.now() - lastCheck.getTime()) / (1000 * 60);
        if (diffMinutes > 15) {
          isMiniPcOffline = true;
        }
      }
      
      if (isMiniPcOffline) {
        offlineMiniPcs.add(miniPc.user_id);
        console.log(`🔴 Mini PC ${miniPc.hostname} is OFFLINE for user ${user?.full_name} - will suppress individual camera alerts`);
      }
    }

    for (const camera of cameras || []) {
      const user = Array.isArray(camera.user) ? camera.user[0] : camera.user;
      
      // Get real-time health data from camera-health API
      let healthData = null;
      try {
        const healthResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/camera-health/${camera.id}`);
        const healthResult = await healthResponse.json();
        if (healthResult.success) {
          healthData = healthResult.health;
        }
      } catch (error) {
        console.error(`Failed to get health data for camera ${camera.id}:`, error);
      }
      
      // Check camera status based on real-time health data
      let isOffline = false;
      let offlineMessage = "";
      
      if (!healthData) {
        // No health data available - camera is offline
        isOffline = true;
        offlineMessage = `מצלמה ${camera.name} אין נתוני בריאות זמינים`;
      } else if (!healthData.last_checked) {
        // Health data exists but no last_checked - camera never reported
        isOffline = true;
        offlineMessage = `מצלמה ${camera.name} לא דיווחה מעולם על בריאותה`;
      } else {
        // Check if health data is recent (use setting)
        const lastCheck = new Date(healthData.last_checked);
        const diffMinutes = (Date.now() - lastCheck.getTime()) / (1000 * 60);
        
        if (diffMinutes > healthCheckTimeoutMinutes) {
          isOffline = true;
          offlineMessage = `מצלמה ${camera.name} לא דיווחה על בריאותה כבר ${Math.round(diffMinutes)} דקות`;
        }
      }
      
      // Create offline alert if camera is offline
      if (isOffline) {
        // SMART SUPPRESSION: Don't create camera alerts if Mini PC is offline (root cause)
        if (offlineMiniPcs.has(camera.user_id)) {
          console.log(`🔇 Suppressing camera alert for ${camera.name} - Mini PC is offline (root cause)`);
          continue; // Skip to next camera
        }
        
        // Check if we already have an unresolved alert for this camera
        // Use maybeSingle() to handle case where multiple duplicates might exist
        const { data: existingAlert } = await supabase
          .from("system_alerts")
          .select("id, created_at")
          .eq("camera_id", camera.id)
          .eq("type", "camera_offline")
          .eq("resolved", false)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!existingAlert) {
          const diffMinutes = healthData?.last_checked ? 
            (Date.now() - new Date(healthData.last_checked).getTime()) / (1000 * 60) : 0;
          
          const severity = diffMinutes > criticalThresholdMinutes || !healthData ? "critical" : "high";
            
          alertsToCreate.push({
            type: "camera_offline",
            camera_id: camera.id,
            camera_name: camera.name,
            customer_name: user?.full_name || "לא ידוע",
            message: offlineMessage,
            severity
          });

          // Send email notification for camera offline to ADMIN only
          // Only send if no alert was created in the last hour (rate limiting)
          if (emailNotificationsEnabled && adminEmail) {
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
            const { data: recentAlert } = await supabase
              .from("system_alerts")
              .select("created_at")
              .eq("camera_id", camera.id)
              .eq("type", "camera_offline")
              .gte("created_at", oneHourAgo)
              .limit(1)
              .maybeSingle();
            
            if (!recentAlert) {
              notificationsToSend.push({
                type: "camera_offline",
                severity,
                cameraName: camera.name,
                customerName: user?.full_name || "לא ידוע",
                message: offlineMessage,
                timestamp: new Date().toISOString(),
                email: adminEmail
              });
            } else {
              console.log(`⏭️ Skipping email for ${camera.name} - alert sent within last hour`);
            }
          }
        } else {
          console.log(`⏭️ Skipping duplicate alert for ${camera.name} - unresolved alert already exists (ID: ${existingAlert.id})`);
        }
      } else {
        // Camera is ONLINE - check if there's an unresolved offline alert (recovery!)
        // IMPORTANT: Only consider it a recovery if health data is VERY recent (< 2 minutes)
        // This prevents false positives from stale data
        const { data: existingOfflineAlert } = await supabase
          .from("system_alerts")
          .select("id, created_at")
          .eq("camera_id", camera.id)
          .eq("type", "camera_offline")
          .eq("resolved", false)
          .single();

        if (existingOfflineAlert && healthData && healthData.last_checked) {
          // Double-check: health data must be VERY recent (within last 2 minutes) for recovery
          const lastCheck = new Date(healthData.last_checked);
          const minutesSinceCheck = (Date.now() - lastCheck.getTime()) / (1000 * 60);
          
          // Only send recovery if:
          // 1. Health data is fresh (< 2 min)
          // 2. Stream is actually working (not "missing" or "error")
          const streamIsHealthy = healthData.stream_status && 
                                   healthData.stream_status !== 'missing' && 
                                   healthData.stream_status !== 'error' &&
                                   healthData.stream_status !== 'stale';
          
          const isGenuineRecovery = minutesSinceCheck < 2 && streamIsHealthy;
          
          if (isGenuineRecovery) {
            // Camera recovered! Auto-resolve the alert and send recovery notification
            await supabase
              .from("system_alerts")
              .update({ resolved: true, resolved_at: new Date().toISOString() })
              .eq("id", existingOfflineAlert.id);

            // Calculate downtime
            const downtime = Math.round((Date.now() - new Date(existingOfflineAlert.created_at).getTime()) / (1000 * 60));
            
            // Send recovery email to ADMIN only
            if (emailNotificationsEnabled && adminEmail) {
              notificationsToSend.push({
                type: "camera_online" as any,
                severity: "low" as any,
                cameraName: camera.name,
                customerName: user?.full_name || "לא ידוע",
                message: `✅ מצלמה ${camera.name} חזרה לפעילות! זמן השבתה: ${downtime} דקות`,
                timestamp: new Date().toISOString(),
                email: adminEmail
              });
            }
            
            console.log(`✅ Camera ${camera.name} recovered after ${downtime} minutes offline`);
          } else {
            const reason = !streamIsHealthy 
              ? `stream status is "${healthData.stream_status}" (not healthy)` 
              : `health data is ${minutesSinceCheck.toFixed(1)} min old (need < 2 min)`;
            console.log(`⚠️ Camera ${camera.name} appears online but ${reason} - not sending recovery notification yet`);
          }
        }
      }

      // Check stream status
      if (!camera.is_stream_active) {
        const { data: existingAlert } = await supabase
          .from("system_alerts")
          .select("id")
          .eq("camera_id", camera.id)
          .eq("type", "stream_error")
          .eq("resolved", false)
          .limit(1)
          .maybeSingle();

        if (!existingAlert) {
          alertsToCreate.push({
            type: "stream_error",
            camera_id: camera.id,
            camera_name: camera.name,
            customer_name: user?.full_name || "לא ידוע",
            message: `זרם לא פעיל במצלמה ${camera.name}`,
            severity: "high"
          });

          // Camera notifications disabled - no longer sending emails
        }
      }

      // Use the health data we already fetched from camera-health API
      if (healthData) {
        // Check disk usage from real-time health data
        if (healthData.disk_root_pct > 90) {
          const { data: existingAlert } = await supabase
            .from("system_alerts")
            .select("id")
            .eq("camera_id", camera.id)
            .eq("type", "disk_full")
            .eq("resolved", false)
            .limit(1)
            .maybeSingle();

          if (!existingAlert) {
            alertsToCreate.push({
              type: "disk_full",
              camera_id: camera.id,
              camera_name: camera.name,
              customer_name: user?.full_name || "לא ידוע",
              message: `דיסק מלא במצלמה ${camera.name} (${healthData.disk_root_pct}%)`,
              severity: "critical"
            });

            // Camera notifications disabled - no longer sending emails
          }
        }

        // Check stream status for real-time issues
        if (healthData.stream_status) {
          const status = healthData.stream_status.toLowerCase();
          // Check for stale, error, OR missing streams
          if (status === "stale" || status === "error" || status === "missing") {
            const { data: existingAlert } = await supabase
              .from("system_alerts")
              .select("id")
              .eq("camera_id", camera.id)
              .eq("type", "stream_error")
              .eq("resolved", false)
              .limit(1)
              .maybeSingle();

            if (!existingAlert) {
              // Determine severity and message based on status
              let severity: "high" | "critical" = "critical";
              let message = "";
              
              if (status === "stale") {
                severity = "high";
                message = `זרם לא מעודכן במצלמה ${camera.name} - ${healthData.log_message || 'Stream stale'}`;
              } else if (status === "missing") {
                severity = "critical";
                message = `זרם חסר במצלמה ${camera.name} - Stream file not found`;
              } else {
                severity = "critical";
                message = `שגיאה בזרם במצלמה ${camera.name}`;
              }
              
              alertsToCreate.push({
                type: "stream_error",
                camera_id: camera.id,
                camera_name: camera.name,
                customer_name: user?.full_name || "לא ידוע",
                message,
                severity
              });

              // Send email notification for stream errors to ADMIN only
              // Only send if no alert was created in the last hour (rate limiting)
              if (emailNotificationsEnabled && adminEmail) {
                const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
                const { data: recentAlert } = await supabase
                  .from("system_alerts")
                  .select("created_at")
                  .eq("camera_id", camera.id)
                  .eq("type", "stream_error")
                  .gte("created_at", oneHourAgo)
                  .limit(1)
                  .maybeSingle();
                
                if (!recentAlert) {
                  notificationsToSend.push({
                    type: "stream_error",
                    severity,
                    cameraName: camera.name,
                    customerName: user?.full_name || "לא ידוע",
                    message,
                    timestamp: new Date().toISOString(),
                    email: adminEmail
                  });
                } else {
                  console.log(`⏭️ Skipping email for ${camera.name} stream error - alert sent within last hour`);
                }
              }
            }
          }
        }
        
        // Check if health data is stale
        if (healthData.last_checked) {
          const lastCheck = new Date(healthData.last_checked);
          const diffMinutes = (Date.now() - lastCheck.getTime()) / (1000 * 60);
          
          if (diffMinutes > 15) {
            const { data: existingAlert } = await supabase
              .from("system_alerts")
              .select("id")
              .eq("camera_id", camera.id)
              .eq("type", "device_error")
              .eq("resolved", false)
              .limit(1)
              .maybeSingle();

            if (!existingAlert) {
              alertsToCreate.push({
                type: "device_error",
                camera_id: camera.id,
                camera_name: camera.name,
                customer_name: user?.full_name || "לא ידוע",
                message: `מכשיר לא מדווח מזה ${Math.round(diffMinutes)} דקות`,
                severity: "medium"
              });
            }
          }
        }
      }
    }

    // Monitor Mini PC health
    for (const miniPc of miniPcs || []) {
      const user = Array.isArray(miniPc.user) ? miniPc.user[0] : miniPc.user;
      
      // Get real-time Mini PC health data
      let miniPcHealthData = null;
      try {
        const healthResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/mini-pc-health/${miniPc.id}`);
        const healthResult = await healthResponse.json();
        if (healthResult.success) {
          miniPcHealthData = healthResult.health;
        }
      } catch (error) {
        console.error(`Failed to get Mini PC health data for ${miniPc.id}:`, error);
      }
      
      // Check Mini PC status
      if (!miniPcHealthData) {
        // No health data available - Mini PC is offline
        const { data: existingAlert } = await supabase
          .from("system_alerts")
          .select("id")
          .eq("mini_pc_id", miniPc.id)
          .eq("type", "minipc_offline")
          .eq("resolved", false)
          .limit(1)
          .maybeSingle();

        if (!existingAlert) {
          // Count cameras affected by this Mini PC
          const affectedCameras = cameras?.filter(cam => cam.user_id === miniPc.user_id) || [];
          const cameraCount = affectedCameras.length;
          const cameraNames = affectedCameras.map(c => c.name).join(', ');
          
          const message = cameraCount > 0 
            ? `🚨 מיני PC ${miniPc.hostname} לא מחובר - ${cameraCount} מצלמות מושפעות (${cameraNames})`
            : `מיני PC ${miniPc.hostname} אין נתוני בריאות זמינים`;
          
          alertsToCreate.push({
            type: "minipc_offline",
            mini_pc_id: miniPc.id,
            mini_pc_hostname: miniPc.hostname,
            customer_name: user?.full_name || "לא ידוע",
            message,
            severity: "critical"
          });
          
          // Send email for Mini PC offline (high priority - affects all cameras)
          if (emailNotificationsEnabled && adminEmail) {
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
            const { data: recentAlert } = await supabase
              .from("system_alerts")
              .select("created_at")
              .eq("mini_pc_id", miniPc.id)
              .eq("type", "minipc_offline")
              .gte("created_at", oneHourAgo)
              .limit(1)
              .maybeSingle();
            
            if (!recentAlert) {
              notificationsToSend.push({
                type: "camera_offline" as any, // Use camera_offline type for email template
                severity: "critical" as any,
                cameraName: `Mini PC ${miniPc.hostname}`,
                customerName: user?.full_name || "לא ידוע",
                message,
                timestamp: new Date().toISOString(),
                email: adminEmail
              });
            } else {
              console.log(`⏭️ Skipping email for Mini PC ${miniPc.hostname} - alert sent within last hour`);
            }
          }
        }
      } else {
        // Check if health data is recent (within 15 minutes)
        if (miniPcHealthData.last_checked) {
          const lastCheck = new Date(miniPcHealthData.last_checked);
          const diffMinutes = (Date.now() - lastCheck.getTime()) / (1000 * 60);
          
          if (diffMinutes > 15) {
            const { data: existingAlert } = await supabase
              .from("system_alerts")
              .select("id")
              .eq("mini_pc_id", miniPc.id)
              .eq("type", "minipc_offline")
              .eq("resolved", false)
              .limit(1)
              .maybeSingle();

            if (!existingAlert) {
              // Count cameras affected by this Mini PC
              const affectedCameras = cameras?.filter(cam => cam.user_id === miniPc.user_id) || [];
              const cameraCount = affectedCameras.length;
              const cameraNames = affectedCameras.map(c => c.name).join(', ');
              
              const message = cameraCount > 0 
                ? `🚨 מיני PC ${miniPc.hostname} לא דיווח מזה ${Math.round(diffMinutes)} דקות - ${cameraCount} מצלמות מושפעות (${cameraNames})`
                : `מיני PC ${miniPc.hostname} לא דיווח מזה ${Math.round(diffMinutes)} דקות`;
              
              alertsToCreate.push({
                type: "minipc_offline",
                mini_pc_id: miniPc.id,
                mini_pc_hostname: miniPc.hostname,
                customer_name: user?.full_name || "לא ידוע",
                message,
                severity: "high"
              });
              
              // Send email for Mini PC offline (high priority)
              if (emailNotificationsEnabled && adminEmail) {
                const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
                const { data: recentAlert } = await supabase
                  .from("system_alerts")
                  .select("created_at")
                  .eq("mini_pc_id", miniPc.id)
                  .eq("type", "minipc_offline")
                  .gte("created_at", oneHourAgo)
                  .limit(1)
                  .maybeSingle();
                
                if (!recentAlert) {
                  notificationsToSend.push({
                    type: "camera_offline" as any,
                    severity: "high" as any,
                    cameraName: `Mini PC ${miniPc.hostname}`,
                    customerName: user?.full_name || "לא ידוע",
                    message,
                    timestamp: new Date().toISOString(),
                    email: adminEmail
                  });
                } else {
                  console.log(`⏭️ Skipping email for Mini PC ${miniPc.hostname} - alert sent within last hour`);
                }
              }
            }
          }
        }

        // Check CPU temperature
        if (miniPcHealthData.cpu_temp_celsius && miniPcHealthData.cpu_temp_celsius > 100) {
          const { data: existingAlert } = await supabase
            .from("system_alerts")
            .select("id")
            .eq("mini_pc_id", miniPc.id)
            .eq("type", "minipc_overheating")
            .eq("resolved", false)
            .limit(1)
            .maybeSingle();

          if (!existingAlert) {
            alertsToCreate.push({
              type: "minipc_overheating",
              mini_pc_id: miniPc.id,
              mini_pc_hostname: miniPc.hostname,
              customer_name: user?.full_name || "לא ידוע",
              message: `מיני PC ${miniPc.hostname} התחמם יתר על המידה (${miniPcHealthData.cpu_temp_celsius}°C)`,
              severity: "critical"
            });
          }
        }

        // Check disk usage
        if (miniPcHealthData.disk_root_pct > 90) {
          const { data: existingAlert } = await supabase
            .from("system_alerts")
            .select("id")
            .eq("mini_pc_id", miniPc.id)
            .eq("type", "minipc_disk_full")
            .eq("resolved", false)
            .limit(1)
            .maybeSingle();

          if (!existingAlert) {
            alertsToCreate.push({
              type: "minipc_disk_full",
              mini_pc_id: miniPc.id,
              mini_pc_hostname: miniPc.hostname,
              customer_name: user?.full_name || "לא ידוע",
              message: `דיסק מלא במיני PC ${miniPc.hostname} (${miniPcHealthData.disk_root_pct}%)`,
              severity: "critical"
            });
          }
        }

        // Check RAM usage
        if (miniPcHealthData.ram_usage_pct > 90) {
          const { data: existingAlert } = await supabase
            .from("system_alerts")
            .select("id")
            .eq("mini_pc_id", miniPc.id)
            .eq("type", "minipc_memory_full")
            .eq("resolved", false)
            .limit(1)
            .maybeSingle();

          if (!existingAlert) {
            alertsToCreate.push({
              type: "minipc_memory_full",
              mini_pc_id: miniPc.id,
              mini_pc_hostname: miniPc.hostname,
              customer_name: user?.full_name || "לא ידוע",
              message: `זיכרון מלא במיני PC ${miniPc.hostname} (${miniPcHealthData.ram_usage_pct}%)`,
              severity: "high"
            });
          }
        }

        // Check internet connectivity
        if (!miniPcHealthData.internet_connected) {
          const { data: existingAlert } = await supabase
            .from("system_alerts")
            .select("id")
            .eq("mini_pc_id", miniPc.id)
            .eq("type", "minipc_no_internet")
            .eq("resolved", false)
            .limit(1)
            .maybeSingle();

          if (!existingAlert) {
            alertsToCreate.push({
              type: "minipc_no_internet",
              mini_pc_id: miniPc.id,
              mini_pc_hostname: miniPc.hostname,
              customer_name: user?.full_name || "לא ידוע",
              message: `מיני PC ${miniPc.hostname} אין חיבור לאינטרנט`,
              severity: "high"
            });
          }
        }
      }
    }

    // Create alerts in database
    if (alertsToCreate.length > 0) {
      const { error: alertError } = await supabase
        .from("system_alerts")
        .insert(alertsToCreate);

      if (alertError) {
        console.error("Error creating alerts:", alertError);
      }
    }

    // Send email notifications
    let notificationsSent = 0;
    if (notificationsToSend.length > 0) {
      console.log(`📧 Sending ${notificationsToSend.length} email notifications...`);
      
      for (const notification of notificationsToSend) {
        try {
          const emailSent = await sendEmailNotification({
            type: notification.type as any,
            severity: notification.severity as any,
            cameraName: notification.cameraName,
            customerName: notification.customerName,
            message: notification.message,
            timestamp: notification.timestamp
          });
          
          if (emailSent) {
            notificationsSent++;
            console.log(`✅ Email sent to ${notification.email} for ${notification.cameraName}`);
          }
        } catch (error) {
          console.error(`❌ Failed to send email to ${notification.email}:`, error);
        }
      }
    }

    return NextResponse.json({
      success: true,
      alertsCreated: alertsToCreate.length,
      notificationsSent,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Monitor error:', error);
    return NextResponse.json(
      { success: false, error: 'Monitoring failed' },
      { status: 500 }
    );
  }
}

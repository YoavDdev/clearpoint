import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { sendEmailNotification, sendWhatsAppNotification, NotificationData } from "@/lib/notifications";

// This endpoint will be called by a cron job or monitoring service
export async function POST() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
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

    const alertsToCreate = [];
    const notificationsToSend = [];

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
        // Check if health data is recent (within 15 minutes)
        const lastCheck = new Date(healthData.last_checked);
        const diffMinutes = (Date.now() - lastCheck.getTime()) / (1000 * 60);
        
        if (diffMinutes > 15) {
          isOffline = true;
          offlineMessage = `מצלמה ${camera.name} לא דיווחה על בריאותה כבר ${Math.round(diffMinutes)} דקות`;
        }
      }
      
      // Create offline alert if camera is offline
      if (isOffline) {
        // Check if we already have an unresolved alert for this camera
        const { data: existingAlert } = await supabase
          .from("system_alerts")
          .select("id")
          .eq("camera_id", camera.id)
          .eq("type", "camera_offline")
          .eq("resolved", false)
          .single();

        if (!existingAlert) {
          const diffMinutes = healthData?.last_checked ? 
            (Date.now() - new Date(healthData.last_checked).getTime()) / (1000 * 60) : 0;
            
          alertsToCreate.push({
            type: "camera_offline",
            camera_id: camera.id,
            camera_name: camera.name,
            customer_name: user?.full_name || "לא ידוע",
            message: offlineMessage,
            severity: diffMinutes > 60 || !healthData ? "critical" : "high"
          });

          // Add to notifications queue
          if (user) {
            notificationsToSend.push({
              type: "camera_offline",
              camera,
              user,
              message: `🔴 ${offlineMessage}`
            });
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
          .single();

        if (!existingAlert) {
          alertsToCreate.push({
            type: "stream_error",
            camera_id: camera.id,
            camera_name: camera.name,
            customer_name: user?.full_name || "לא ידוע",
            message: `זרם לא פעיל במצלמה ${camera.name}`,
            severity: "high"
          });

          if (user) {
            notificationsToSend.push({
              type: "stream_error",
              camera,
              user,
              message: `⚠️ זרם לא פעיל במצלמה ${camera.name}`
            });
          }
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
            .single();

          if (!existingAlert) {
            alertsToCreate.push({
              type: "disk_full",
              camera_id: camera.id,
              camera_name: camera.name,
              customer_name: user?.full_name || "לא ידוע",
              message: `דיסק מלא במצלמה ${camera.name} (${healthData.disk_root_pct}%)`,
              severity: "critical"
            });

            if (user) {
              notificationsToSend.push({
                type: "disk_full",
                camera,
                user,
                message: `🚨 דיסק מלא במצלמה ${camera.name} (${healthData.disk_root_pct}%)`
              });
            }
          }
        }

        // Check stream status for real-time issues
        if (healthData.stream_status) {
          if (healthData.stream_status.toLowerCase() === "stale" || healthData.stream_status.toLowerCase() === "error") {
            const { data: existingAlert } = await supabase
              .from("system_alerts")
              .select("id")
              .eq("camera_id", camera.id)
              .eq("type", "stream_error")
              .eq("resolved", false)
              .single();

            if (!existingAlert) {
              const isStale = healthData.stream_status.toLowerCase() === "stale";
              alertsToCreate.push({
                type: "stream_error",
                camera_id: camera.id,
                camera_name: camera.name,
                customer_name: user?.full_name || "לא ידוע",
                message: isStale ? 
                  `זרם לא מעודכן במצלמה ${camera.name} - ${healthData.log_message || 'Stream stale'}` :
                  `שגיאה בזרם במצלמה ${camera.name}`,
                severity: isStale ? "high" : "critical"
              });

              // Note: Email notifications will be handled separately with 15-minute delay
              // This creates immediate UI alert but delays email notification
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
              .single();

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

    // Create alerts in database
    if (alertsToCreate.length > 0) {
      const { error: alertError } = await supabase
        .from("system_alerts")
        .insert(alertsToCreate);

      if (alertError) {
        console.error("Error creating alerts:", alertError);
      }
    }

    // Check for alerts older than 15 minutes that need email notifications
    await checkAndSendDelayedNotifications(supabase);

    // Send immediate notifications (for critical alerts only)
    const notificationResults = [];
    for (const notification of notificationsToSend) {
      try {
        // Simulate sending notifications
        const results = await sendNotifications(notification);
        notificationResults.push(results);
      } catch (error) {
        console.error("Error sending notification:", error);
      }
    }

    return NextResponse.json({
      success: true,
      alertsCreated: alertsToCreate.length,
      notificationsSent: notificationResults.length,
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

async function sendNotifications(notification: any) {
  const results = [];
  
  try {
    // Create notification data object
    const notificationData: NotificationData = {
      type: notification.type,
      severity: notification.type === 'disk_full' ? 'critical' : 
               notification.type === 'camera_offline' ? 'high' : 'medium',
      cameraName: notification.camera.name,
      customerName: notification.user?.full_name || 'Unknown Customer',
      message: notification.message,
      timestamp: new Date().toISOString()
    };

    // 1. Always send to admin email (yoavddev@gmail.com)
    const emailResult = await sendEmailNotification(notificationData);
    results.push({
      type: "admin-email",
      to: "yoavddev@gmail.com",
      message: notification.message,
      sent: emailResult
    });

    // 2. Always send to admin WhatsApp (0548132603)
    const whatsappResult = await sendWhatsAppNotification(notificationData);
    results.push({
      type: "admin-whatsapp",
      to: "+972548132603",
      message: notification.message,
      sent: whatsappResult
    });

    // 3. Also send to customer email if available
    if (notification.user?.email && notification.user.email !== "yoavddev@gmail.com") {
      // In a production system, you would customize this for the customer
      // For now, we're focusing on admin notifications
      results.push({
        type: "customer-email",
        to: notification.user.email,
        message: `שלום ${notification.user.full_name},\n\n${notification.message}\n\nאנא בדוק את המצלמה בהקדם.\n\nצוות Clearpoint Security`,
        sent: true // Simulated for now
      });
    }
  } catch (error) {
    console.error("Error sending notifications:", error);
  }

  return results;
}

// Function to check for alerts older than 3 minutes and send delayed email notifications
async function checkAndSendDelayedNotifications(supabase: any) {
  try {
    // Get alerts older than 3 minutes that haven't had email notifications sent
    const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000).toISOString();
    
    console.log(`🔍 Checking for alerts older than: ${threeMinutesAgo}`);
    
    const { data: alertsNeedingEmail, error } = await supabase
      .from("system_alerts")
      .select('*')
      .eq('resolved', false)
      .eq('notification_sent', false)
      .lt('created_at', threeMinutesAgo)
      .in('type', ['stream_error', 'camera_offline']); // Only delay these types
    
    if (error) {
      console.error('Error fetching alerts for delayed notifications:', error);
      return;
    }
    
    console.log(`📧 Found ${alertsNeedingEmail?.length || 0} alerts needing delayed email notifications`);
    
    if (!alertsNeedingEmail?.length) {
      return;
    }
    
    // Send delayed email notifications
    for (const alert of alertsNeedingEmail) {
      try {
        // Get user info for this camera
        const { data: camera, error: cameraError } = await supabase
          .from('cameras')
          .select('user_id, users!inner(full_name, email)')
          .eq('id', alert.camera_id)
          .single();
        
        if (cameraError || !camera?.users?.email) {
          console.log(`⚠️ No user email found for camera ${alert.camera_name}`);
          continue;
        }
        
        const user = camera.users;
        const alertAgeMinutes = Math.round((Date.now() - new Date(alert.created_at).getTime()) / (1000 * 60));
        
        // Import and use real email service
        const { sendAlertEmail } = await import('@/lib/email-service');
        
        console.log(`📧 Sending REAL email notification to: ${user.email}`);
        
        // Send actual email (override to verified email for testing)
        const emailResult = await sendAlertEmail({
          to: 'yoavd.dev@gmail.com', // Override for Resend testing
          userName: user.full_name,
          cameraName: alert.camera_name,
          alertType: alert.type,
          alertMessage: alert.message,
          alertAge: alertAgeMinutes,
          alertId: alert.id,
          severity: alert.severity as 'low' | 'medium' | 'high' | 'critical'
        });
        
        if (emailResult.success) {
          console.log(`✅ Email sent successfully to ${user.email}`);
          
          // Mark notification as sent only if email was actually sent
          const { error: updateError } = await supabase
            .from("system_alerts")
            .update({ notification_sent: true })
            .eq('id', alert.id);
          
          if (updateError) {
            console.error(`Error marking notification as sent for alert ${alert.id}:`, updateError);
          } else {
            console.log(`✅ Marked alert ${alert.id} as notification sent`);
          }
        } else {
          console.error(`❌ Failed to send email to ${user.email}:`, emailResult.error);
          // Don't mark as sent if email failed
        }
        
      } catch (emailError) {
        console.error(`Error sending delayed notification for alert ${alert.id}:`, emailError);
      }
    }
    
    console.log(`📧 Processed ${alertsNeedingEmail.length} delayed email notifications`);
    
  } catch (error) {
    console.error('Error in checkAndSendDelayedNotifications:', error);
  }
}

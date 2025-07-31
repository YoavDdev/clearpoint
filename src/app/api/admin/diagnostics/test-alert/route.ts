import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { sendEmailNotification, sendWhatsAppNotification, NotificationData } from "@/lib/notifications";

export async function POST(request: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const { cameraId, type, message: customMessage, severity: customSeverity } = await request.json();

    // Get camera and user info if cameraId is provided
    let camera = null;
    let user = null;
    
    if (cameraId) {
      const { data: cameraData, error: cameraError } = await supabase
        .from("cameras")
        .select(`
          id,
          name,
          user:users!cameras_user_id_fkey(full_name, email, phone)
        `)
        .eq("id", cameraId)
        .single();

      if (cameraError || !cameraData) {
        return NextResponse.json(
          { success: false, error: "Camera not found" },
          { status: 404 }
        );
      }
      
      camera = cameraData;
      user = Array.isArray(camera.user) ? camera.user[0] : camera.user;
    }

    // Create alert message based on type or use custom message
    let message = customMessage || "";
    let severity: "low" | "medium" | "high" | "critical" = customSeverity || "medium";
    
    if (!message && camera) {
      switch (type) {
        case "camera_offline":
          message = `מצלמה ${camera.name} לא מגיבה`;
          severity = "critical";
          break;
        case "disk_full":
          message = `דיסק מלא במצלמה ${camera.name}`;
          severity = "high";
          break;
        case "stream_error":
          message = `שגיאה בזרם במצלמה ${camera.name}`;
          severity = "high";
          break;
        case "device_error":
          message = `שגיאת מכשיר במצלמה ${camera.name}`;
          severity = "medium";
          break;
        case "test_notification":
          message = `זוהי התראת בדיקה מדף הגדרות ההתראות`;
          severity = "medium";
          break;
        default:
          message = camera ? `בעיה במצלמה ${camera.name}` : "התראת בדיקה";
          severity = "medium";
      }
    } else if (!message) {
      message = "התראת בדיקה מדף הגדרות ההתראות";
    }

    // Create notification data object
    const notificationData: NotificationData = {
      type: type || "test_notification",
      severity: severity as "low" | "medium" | "high" | "critical",
      cameraName: camera?.name || "בדיקה",
      customerName: user?.full_name || "מנהל מערכת",
      message: message,
      timestamp: new Date().toISOString()
    };
    
    // Send notifications using our notification functions
    const notifications = [];

    // 1. Store notification in database (would be handled by the notification functions)
    notifications.push({
      type: "in-app",
      message: `התראה נשלחה: ${message}`,
      success: true
    });

    // 2. Send email notification to admin
    try {
      const emailResult = await sendEmailNotification(notificationData);
      notifications.push({
        type: "email",
        to: "yoavddev@gmail.com",
        message: message,
        success: emailResult
      });
    } catch (error) {
      console.error("Email notification error:", error);
      notifications.push({
        type: "email",
        to: "yoavddev@gmail.com",
        message: message,
        success: false,
        error: String(error)
      });
    }

    // 3. Send WhatsApp notification to admin
    try {
      const whatsappResult = await sendWhatsAppNotification(notificationData);
      notifications.push({
        type: "whatsapp",
        to: "0548132603",
        message: message,
        success: whatsappResult
      });
    } catch (error) {
      console.error("WhatsApp notification error:", error);
      notifications.push({
        type: "whatsapp",
        to: "0548132603",
        message: message,
        success: false,
        error: String(error)
      });
    }
    
    // 4. Also send to customer if available (would be handled in production)
    if (user?.email && user.email !== "yoavddev@gmail.com") {
      notifications.push({
        type: "customer-email",
        to: user.email,
        message: `שלום ${user.full_name},\n\nהתקבלה התראה במערכת:\n${message}\n\nאנא בדוק את המצלמה בהקדם.\n\nצוות Clearpoint Security`,
        success: true // Simulated for now
      });
    }

    return NextResponse.json({
      success: true,
      message: "התראות נשלחו בהצלחה",
      notifications,
      alert: {
        camera_name: camera?.name || "בדיקה",
        customer_name: user?.full_name || "לא ידוע",
        type,
        severity,
        message
      }
    });

  } catch (error) {
    console.error('Test alert error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send test alert' },
      { status: 500 }
    );
  }
}

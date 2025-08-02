import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { testDelayMinutes = 3 } = await request.json();
    
    // Get alerts older than specified test delay (default 3 minutes to match production)
    const testDelayAgo = new Date(Date.now() - testDelayMinutes * 60 * 1000).toISOString();
    
    console.log(`🧪 Testing delayed notifications for alerts older than: ${testDelayAgo}`);
    
    const { data: alertsNeedingEmail, error } = await supabase
      .from("system_alerts")
      .select('*')
      .eq('resolved', false)
      .eq('notification_sent', false)
      .lt('created_at', testDelayAgo)
      .in('type', ['stream_error', 'camera_offline']);
    
    if (error) {
      console.error('Error fetching alerts for delayed notifications:', error);
      return NextResponse.json({ success: false, error: error.message });
    }
    
    console.log(`📧 Found ${alertsNeedingEmail?.length || 0} alerts needing delayed email notifications`);
    
    if (!alertsNeedingEmail?.length) {
      return NextResponse.json({ 
        success: true, 
        message: `No alerts found older than ${testDelayMinutes} minutes (using 3-minute delay)`,
        alertsProcessed: 0 
      });
    }
    
    let emailsSent = 0;
    
    // Send delayed email notifications
    for (const alert of alertsNeedingEmail) {
      try {
        // Get user info for this camera
        const { data: camera, error: cameraError } = await supabase
          .from('cameras')
          .select('user_id')
          .eq('id', alert.camera_id)
          .single();
        
        if (cameraError || !camera?.user_id) {
          console.log(`⚠️ No camera found for alert ${alert.camera_name}`);
          continue;
        }
        
        // Get user details
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('full_name, email')
          .eq('id', camera.user_id)
          .single();
        
        if (userError || !user?.email) {
          console.log(`⚠️ No user email found for camera ${alert.camera_name}`);
          continue;
        }
        const alertAgeMinutes = Math.round((Date.now() - new Date(alert.created_at).getTime()) / (1000 * 60));
        
        // Import and use real email service
        const { sendAlertEmail } = await import('@/lib/email-service');
        
        console.log(`📧 [TEST] Sending REAL email notification to: ${user.email}`);
        
        // Send actual email
        const emailResult = await sendAlertEmail({
          to: user.email,
          userName: user.full_name,
          cameraName: alert.camera_name,
          alertType: alert.type,
          alertMessage: alert.message,
          alertAge: alertAgeMinutes,
          alertId: alert.id,
          severity: alert.severity as 'low' | 'medium' | 'high' | 'critical'
        });
        
        if (emailResult.success) {
          console.log(`✅ [TEST] Email sent successfully to ${user.email}`);
          
          // Mark notification as sent only if email was actually sent
          const { error: updateError } = await supabase
            .from("system_alerts")
            .update({ notification_sent: true })
            .eq('id', alert.id);
          
          if (updateError) {
            console.error(`Error marking notification as sent for alert ${alert.id}:`, updateError);
          } else {
            console.log(`✅ Marked alert ${alert.id} as notification sent`);
            emailsSent++;
          }
        } else {
          console.error(`❌ [TEST] Failed to send email to ${user.email}:`, emailResult.error);
          // Don't mark as sent if email failed
        }
        
      } catch (emailError) {
        console.error(`Error sending delayed notification for alert ${alert.id}:`, emailError);
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Processed ${alertsNeedingEmail.length} alerts, sent ${emailsSent} delayed email notifications`,
      alertsProcessed: alertsNeedingEmail.length,
      emailsSent
    });
    
  } catch (error) {
    console.error('Test delayed notifications error:', error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

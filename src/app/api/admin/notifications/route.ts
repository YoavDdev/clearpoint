import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdmin } from "@/lib/admin-auth";

import { apiHandler } from "@/lib/api-handler";

export const dynamic = 'force-dynamic';

export const GET = apiHandler(async () => {
  const authResult = await requireAdmin();
  if (authResult instanceof NextResponse) return authResult;
  try {
    const supabase = getSupabaseAdmin();

    // Return empty notifications array for now
    return NextResponse.json({
      success: true,
      notifications: [],
      message: 'No notifications available'
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
});

export const POST = apiHandler(async (request: NextRequest) => {
  const authResult = await requireAdmin();
  if (authResult instanceof NextResponse) return authResult;
  try {
    const supabase = getSupabaseAdmin();

    const body = await request.json();
    const { type, title, message, severity, camera_id, mini_pc_id } = body;

    console.log('📧 Received notification request:', { type, title, severity });

    // For now, just log the notification since admin_notifications table doesn't exist yet
    console.log('Camera failure notification:', {
      type,
      title,
      message,
      severity,
      camera_id,
      mini_pc_id,
      timestamp: new Date().toISOString()
    });

    // Get camera details for logging
    let cameraName = 'Unknown Camera';
    let customerName = 'Unknown Customer';

    if (camera_id) {
      const { data: camera } = await supabase
        .from('cameras')
        .select(`
          name,
          user_id,
          users(email, full_name)
        `)
        .eq('id', camera_id)
        .single();

      if (camera && camera.users) {
        cameraName = camera.name || 'Unknown Camera';
        // Handle users as array (Supabase returns arrays for relations)
        const user = Array.isArray(camera.users) ? camera.users[0] : camera.users;
        customerName = user?.full_name || 'Unknown Customer';
      }
    }

    console.log(`🚨 CRITICAL ALERT: Camera "${cameraName}" (Customer: ${customerName}) has failed permanently after 3 restart attempts.`);
    
    // Send email notification to support team for proactive customer service
    try {
      // Send to support team - NOT to end customers
      const supportEmails = process.env.SUPPORT_TEAM_EMAILS?.split(',').map(e => e.trim()) || ['yoavddev@gmail.com'];
      
      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM_EMAIL || 'alerts@clearpoint.co.il',
          to: supportEmails,
          subject: `🚨 Camera Permanently Offline - ${cameraName}`,
          html: `
            <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #dc2626, #b91c1c); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
                <h1 style="margin: 0; font-size: 24px;">🚨 התראת מצלמה קריטית</h1>
                <p style="margin: 5px 0 0 0; opacity: 0.9;">Clearpoint Security Alert</p>
              </div>
              
              <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
                <div style="background: #fef2f2; border-right: 4px solid #dc2626; padding: 16px; margin-bottom: 20px; border-radius: 4px;">
                  <h2 style="color: #dc2626; margin: 0 0 10px 0; font-size: 18px;">${title}</h2>
                  <p style="margin: 0; color: #374151; line-height: 1.6;">${message}</p>
                </div>
                
                <div style="background: #f9fafb; padding: 20px; border-radius: 6px; margin-bottom: 20px;">
                  <h3 style="margin: 0 0 15px 0; color: #374151;">פרטי המצלמה</h3>
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280; width: 120px;"><strong>שם מצלמה:</strong></td>
                      <td style="padding: 8px 0; color: #111827;">${cameraName}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280;"><strong>לקוח:</strong></td>
                      <td style="padding: 8px 0; color: #111827;">${customerName}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280;"><strong>זמן התראה:</strong></td>
                      <td style="padding: 8px 0; color: #111827;">${new Date().toLocaleString('he-IL')}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280;"><strong>רמת חומרה:</strong></td>
                      <td style="padding: 8px 0;">
                        <span style="background: #dc2626; color: white; padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: bold;">
                          קריטי
                        </span>
                      </td>
                    </tr>
                  </table>
                </div>
                
                <div style="background: #fffbeb; border: 1px solid #f59e0b; padding: 16px; border-radius: 6px; margin-bottom: 20px;">
                  <h4 style="margin: 0 0 8px 0; color: #d97706;">📋 פעולות נדרשות</h4>
                  <ul style="margin: 0; padding-right: 20px; color: #92400e;">
                    <li>בדוק חיבור המצלמה פיזית</li>
                    <li>וודא שהמצלמה מקבלת חשמל</li>
                    <li>בדוק חיבור רשת</li>
                    <li>פנה לתמיכה טכנית במידת הצורך</li>
                  </ul>
                </div>
                
                <div style="text-align: center; margin-top: 30px;">
                  <a href="https://clearpoint.co.il/admin/diagnostics" 
                     style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                    צפה בפאנל ניהול
                  </a>
                </div>
              </div>
              
              <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px;">
                <p>Clearpoint Security System | alerts@clearpoint.co.il</p>
              </div>
            </div>
          `
        })
      });

      if (emailResponse.ok) {
        console.log('✅ Email sent successfully to yoavddev@gmail.com');
      } else {
        console.error('❌ Failed to send email:', await emailResponse.text());
      }
    } catch (emailError) {
      console.error('❌ Email sending error:', emailError);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Notification logged successfully (email pending table creation)',
      details: {
        camera_name: cameraName,
        customer_name: customerName,
        severity,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Notification API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
});

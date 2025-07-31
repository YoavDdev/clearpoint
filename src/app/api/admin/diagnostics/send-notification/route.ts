import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendNotifications, NotificationData } from '@/lib/notifications';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, severity, cameraId, cameraName, customerName, message } = body;

    // Validate required fields
    if (!type || !severity || !cameraId || !cameraName || !message) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Create notification data
    const notificationData: NotificationData = {
      type,
      severity,
      cameraName,
      customerName: customerName || 'Unknown Customer',
      message,
      timestamp: new Date().toISOString(),
    };

    // Send notifications
    const results = await sendNotifications(notificationData);

    // Store alert in database (if table exists)
    try {
      const { error: alertError } = await supabase
        .from('system_alerts')
        .insert({
          type,
          camera_id: cameraId,
          camera_name: cameraName,
          customer_name: customerName || 'Unknown Customer',
          message,
          severity,
          resolved: false,
          notification_sent: results.email || results.whatsapp,
          created_at: new Date().toISOString(),
        });

      if (alertError) {
        console.warn('Warning: Could not store alert in database:', alertError);
      }
    } catch (dbError) {
      // If the table doesn't exist, just log a warning but continue
      console.warn('Warning: Could not store alert in database (table may not exist):', dbError);
    }

    return NextResponse.json({
      success: true,
      alert: alert,
      notifications: results,
      message: 'Notification sent successfully',
    });

  } catch (error) {
    console.error('Notification API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send notification' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cameraId, type } = body;

    console.log('🔔 Test alert triggered:', { cameraId, type });

    // Get camera info
    const { data: camera, error: cameraError } = await supabase
      .from('cameras')
      .select('name, user:users(full_name, email)')
      .eq('id', cameraId)
      .single();

    if (cameraError || !camera) {
      console.error('Camera not found:', cameraError);
      return NextResponse.json(
        { success: false, error: 'Camera not found' },
        { status: 404 }
      );
    }

    // Create test alert in system_alerts table
    const { error: alertError } = await supabase
      .from('system_alerts')
      .insert({
        type: 'camera_offline',
        camera_id: cameraId,
        camera_name: camera.name,
        customer_name: camera.user?.full_name || 'Unknown',
        message: `Test alert for camera ${camera.name}`,
        severity: 'medium',
        resolved: false,
        notification_sent: true
      });

    if (alertError) {
      console.error('Error creating alert:', alertError);
    }

    // Send notification (if notifications API exists)
    try {
      await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/admin/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'camera_test',
          title: 'Test Alert',
          message: `Test notification for camera ${camera.name}`,
          severity: 'medium',
          camera_id: cameraId
        })
      });
    } catch (notificationError) {
      console.error('Error sending notification:', notificationError);
    }

    return NextResponse.json({
      success: true,
      message: 'Test alert sent successfully',
      camera: camera.name,
      customer: camera.user?.full_name
    });
  } catch (error) {
    console.error('Error sending test alert:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send test alert' },
      { status: 500 }
    );
  }
}

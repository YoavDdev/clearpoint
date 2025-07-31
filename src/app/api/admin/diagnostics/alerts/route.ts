import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // Auto-cleanup: Remove old resolved alerts, especially outdated "never seen" messages
    await cleanupOldResolvedAlerts(supabase);
    
    // Get system alerts from a new alerts table (we'll create this)
    const { data: alerts, error } = await supabase
      .from("system_alerts")
      .select(`
        id,
        type,
        camera_id,
        camera_name,
        customer_name,
        message,
        severity,
        created_at,
        resolved,
        notification_sent
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error && error.code !== 'PGRST116') { // Table doesn't exist yet
      throw error;
    }

// Auto-cleanup function for old resolved alerts
async function cleanupOldResolvedAlerts(supabase: any) {
  try {
    // First, mark old "never seen in system" alerts as resolved since the issue is fixed
    const { error: markResolvedError } = await supabase
      .from("system_alerts")
      .update({ resolved: true })
      .like('message', '%לא נראתה מעולם במערכת%')
      .eq('resolved', false);
    
    // Remove resolved alerts older than 1 hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    const { error: deleteError } = await supabase
      .from("system_alerts")
      .delete()
      .eq('resolved', true)
      .lt('created_at', oneHourAgo);
    
    // Also immediately remove any alerts with the old "never seen in system" message since issue is fixed
    const { error: deleteOldMessageError } = await supabase
      .from("system_alerts")
      .delete()
      .like('message', '%לא נראתה מעולם במערכת%');
    
    if (markResolvedError && markResolvedError.code !== 'PGRST116') {
      console.error('Error marking old alerts as resolved:', markResolvedError);
    }
    
    if (deleteError && deleteError.code !== 'PGRST116') {
      console.error('Error cleaning up old alerts:', deleteError);
    }
    
    if (deleteOldMessageError && deleteOldMessageError.code !== 'PGRST116') {
      console.error('Error cleaning up old message alerts:', deleteOldMessageError);
    }
  } catch (error) {
    console.error('Cleanup error:', error);
  }
}

    // If table doesn't exist, return empty alerts for now
    const systemAlerts = alerts || [];

    return NextResponse.json({
      success: true,
      alerts: systemAlerts,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Diagnostics alerts error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch alerts' },
      { status: 500 }
    );
  }
}

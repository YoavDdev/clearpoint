import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    console.log('🔍 [DEBUG] Investigating alert notification issue...');
    
    // Get all unresolved alerts
    const { data: allAlerts, error: allError } = await supabase
      .from("system_alerts")
      .select('*')
      .eq('resolved', false)
      .order('created_at', { ascending: false });
    
    if (allError) {
      console.error('Error fetching all alerts:', allError);
      return NextResponse.json({ success: false, error: allError.message });
    }
    
    console.log(`📊 Found ${allAlerts?.length || 0} unresolved alerts`);
    
    // Check specifically for stream_error alerts
    const streamAlerts = allAlerts?.filter(alert => alert.type === 'stream_error') || [];
    console.log(`🌊 Found ${streamAlerts.length} stream_error alerts`);
    
    // Check the 3-minute threshold
    const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000).toISOString();
    console.log(`⏰ 3 minutes ago timestamp: ${threeMinutesAgo}`);
    
    // Get alerts that should qualify for delayed notifications
    const { data: qualifyingAlerts, error: qualifyingError } = await supabase
      .from("system_alerts")
      .select('*')
      .eq('resolved', false)
      .eq('notification_sent', false)
      .lt('created_at', threeMinutesAgo)
      .in('type', ['stream_error', 'camera_offline']);
    
    if (qualifyingError) {
      console.error('Error fetching qualifying alerts:', qualifyingError);
    }
    
    console.log(`📧 Found ${qualifyingAlerts?.length || 0} alerts qualifying for delayed notifications`);
    
    // Detailed analysis of each alert
    const alertAnalysis = allAlerts?.map(alert => {
      const alertAge = Math.round((Date.now() - new Date(alert.created_at).getTime()) / (1000 * 60));
      const qualifiesForEmail = !alert.resolved && 
                               !alert.notification_sent && 
                               alertAge >= 3 && 
                               ['stream_error', 'camera_offline'].includes(alert.type);
      
      return {
        id: alert.id,
        type: alert.type,
        camera_name: alert.camera_name,
        created_at: alert.created_at,
        age_minutes: alertAge,
        resolved: alert.resolved,
        notification_sent: alert.notification_sent,
        qualifies_for_email: qualifiesForEmail,
        reason: !qualifiesForEmail ? 
          (alert.resolved ? 'Already resolved' :
           alert.notification_sent ? 'Email already sent' :
           alertAge < 3 ? `Too new (${alertAge} min < 3 min)` :
           !['stream_error', 'camera_offline'].includes(alert.type) ? 'Wrong alert type' :
           'Unknown') : 'Should get email'
      };
    }) || [];
    
    return NextResponse.json({
      success: true,
      debug_info: {
        current_time: new Date().toISOString(),
        three_minutes_ago: threeMinutesAgo,
        total_unresolved_alerts: allAlerts?.length || 0,
        stream_error_alerts: streamAlerts.length,
        qualifying_for_email: qualifyingAlerts?.length || 0,
        alert_analysis: alertAnalysis
      },
      all_alerts: allAlerts,
      qualifying_alerts: qualifyingAlerts
    });
    
  } catch (error) {
    console.error('Debug alerts error:', error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdmin } from "@/lib/admin-auth";

import { apiHandler } from "@/lib/api-handler";

export const dynamic = 'force-dynamic';

export const POST = apiHandler(async (request: NextRequest) => {
  const authResult = await requireAdmin();
  if (authResult instanceof NextResponse) return authResult;
  try {
    const supabase = getSupabaseAdmin();

    const { alertId } = await request.json();
    
    console.log(`🔄 [RESET] Resetting notification_sent flag for alert: ${alertId}`);
    
    // Reset the notification_sent flag to false so the alert can trigger email again
    const { data, error } = await supabase
      .from("system_alerts")
      .update({ notification_sent: false })
      .eq('id', alertId)
      .select()
      .single();
    
    if (error) {
      console.error('Error resetting alert notification flag:', error);
      return NextResponse.json({ success: false, error: error.message });
    }
    
    console.log(`✅ [RESET] Alert ${alertId} notification flag reset to false`);
    console.log(`📧 [RESET] Alert will now qualify for delayed email notifications`);
    
    return NextResponse.json({
      success: true,
      message: "Alert notification flag reset successfully",
      alert: data,
      next_steps: "The alert will now qualify for delayed email notifications on the next monitoring cycle"
    });
    
  } catch (error) {
    console.error('Reset alert notification error:', error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
});

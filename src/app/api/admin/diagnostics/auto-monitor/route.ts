import { NextRequest, NextResponse } from "next/server";
import { POST as monitorPOST } from "../monitor/route";
import { requireAdmin } from "@/lib/admin-auth";

export const dynamic = 'force-dynamic';

// This endpoint will be called automatically every 5 minutes
export async function POST(request: NextRequest) {
  const authResult = await requireAdmin();
  if (authResult instanceof NextResponse) return authResult;
  try {
    console.log(`🤖 [AUTO-MONITOR] Starting automatic system monitoring at ${new Date().toISOString()}`);
    
    // Call the monitor route directly instead of HTTP fetch
    const monitorResponse = await monitorPOST();
    const monitorResult = await monitorResponse.json();
    
    if (monitorResult.success) {
      console.log(`✅ [AUTO-MONITOR] Monitoring completed successfully:`);
      console.log(`   - Alerts Created: ${monitorResult.alertsCreated}`);
      console.log(`   - Notifications Sent: ${monitorResult.notificationsSent}`);
    } else {
      console.error(`❌ [AUTO-MONITOR] Monitoring failed:`, monitorResult.error);
    }
    
    return NextResponse.json({
      success: true,
      message: "Automatic monitoring completed",
      timestamp: new Date().toISOString(),
      monitorResult
    });
    
  } catch (error) {
    console.error('❌ [AUTO-MONITOR] Error in automatic monitoring:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Automatic monitoring failed",
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// Allow GET requests for manual testing
export async function GET(request: NextRequest) {
  const authResult = await requireAdmin();
  if (authResult instanceof NextResponse) return authResult;
  return POST(request);
}

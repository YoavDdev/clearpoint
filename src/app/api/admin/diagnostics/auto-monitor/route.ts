import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";

export const dynamic = 'force-dynamic';

/**
 * Auth: accepts either admin session OR CRON_SECRET header.
 * The scheduler calls this without a browser session.
 */
async function checkAuth(request: NextRequest): Promise<NextResponse | null> {
  const cronSecret = request.headers.get("x-cron-secret");
  if (cronSecret && cronSecret === process.env.CRON_SECRET) {
    return null; // authorized via secret
  }
  const authResult = await requireAdmin();
  if (authResult instanceof NextResponse) return authResult;
  return null;
}

// This endpoint is called by the monitoring scheduler every ~5 minutes
export async function POST(request: NextRequest) {
  const denied = await checkAuth(request);
  if (denied) return denied;

  try {
    console.log(`🤖 [AUTO-MONITOR] Starting automatic system monitoring at ${new Date().toISOString()}`);

    // Call the monitor endpoint via internal HTTP to avoid cross-import issues
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const monitorResponse = await fetch(`${baseUrl}/api/admin/diagnostics/monitor`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-cron-secret": process.env.CRON_SECRET || "",
      },
    });

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
      monitorResult,
    });
  } catch (error) {
    console.error("❌ [AUTO-MONITOR] Error in automatic monitoring:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Automatic monitoring failed",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Allow GET requests for manual testing
export async function GET(request: NextRequest) {
  const denied = await checkAuth(request);
  if (denied) return denied;
  return POST(request);
}

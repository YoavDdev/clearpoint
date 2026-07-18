import { NextRequest, NextResponse } from "next/server";
import monitoringScheduler from "@/lib/monitoring-scheduler";
import { requireAdmin } from "@/lib/admin-auth";

export const dynamic = 'force-dynamic';

// Initialize automatic monitoring system
export async function POST(request: NextRequest) {
  const authResult = await requireAdmin();
  if (authResult instanceof NextResponse) return authResult;
  try {
    console.log('🚀 [INIT] Initializing automatic monitoring system...');
    
    // Start the monitoring scheduler
    monitoringScheduler.start();
    
    const status = monitoringScheduler.getStatus();
    
    console.log('✅ [INIT] Automatic monitoring system initialized successfully');
    console.log(`   - Running: ${status.isRunning}`);
    console.log(`   - Interval: Every ${status.intervalMinutes} minutes`);
    console.log(`   - Next Run: ${status.nextRun}`);
    
    return NextResponse.json({
      success: true,
      message: "Automatic monitoring system initialized",
      status,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ [INIT] Error initializing monitoring system:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to initialize monitoring system",
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// Get monitoring status
export async function GET(request: NextRequest) {
  const authResult = await requireAdmin();
  if (authResult instanceof NextResponse) return authResult;
  try {
    const status = monitoringScheduler.getStatus();
    
    return NextResponse.json({
      success: true,
      status,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ [INIT] Error getting monitoring status:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to get monitoring status",
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";

// Test endpoint to manually trigger monitoring
export async function GET() {
  try {
    console.log('🧪 [TEST] Manually triggering monitoring system...');
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/admin/diagnostics/monitor`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    const result = await response.json();
    
    console.log('🧪 [TEST] Monitoring result:', result);
    
    return NextResponse.json({
      success: true,
      message: "Monitoring test completed",
      result,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('🧪 [TEST] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Test failed' },
      { status: 500 }
    );
  }
}

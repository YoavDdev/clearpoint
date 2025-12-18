import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

// Clear all unresolved alerts - useful for cleanup
export async function POST() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // Resolve all unresolved alerts
    const { data, error } = await supabase
      .from("system_alerts")
      .update({ 
        resolved: true, 
        resolved_at: new Date().toISOString() 
      })
      .eq("resolved", false)
      .select();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: `Successfully resolved ${data?.length || 0} alerts`,
      resolvedCount: data?.length || 0
    });

  } catch (error) {
    console.error('Error clearing alerts:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to clear alerts' },
      { status: 500 }
    );
  }
}

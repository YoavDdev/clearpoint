import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";

import { apiHandler } from "@/lib/api-handler";

export const dynamic = 'force-dynamic';

// Clear all unresolved alerts - useful for cleanup
export const POST = apiHandler(async () => {
  const authResult = await requireAdmin();
  if (authResult instanceof NextResponse) return authResult;
  const supabase = getSupabaseAdmin();

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
});

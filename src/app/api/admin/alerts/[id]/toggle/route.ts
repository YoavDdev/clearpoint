import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Toggle alert resolved status
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { resolved } = body;

    if (typeof resolved !== 'boolean') {
      return NextResponse.json(
        { success: false, error: "Resolved status must be a boolean" },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const updateData: any = { resolved };
    
    // If marking as resolved, set resolved_at timestamp
    if (resolved) {
      updateData.resolved_at = new Date().toISOString();
    } else {
      // If unmarking as resolved, clear the timestamp
      updateData.resolved_at = null;
    }

    const { error } = await supabase
      .from("system_alerts")
      .update(updateData)
      .eq('id', params.id);

    if (error) {
      console.error("Error toggling alert status:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    console.log(`✅ Alert ${params.id} marked as ${resolved ? 'resolved' : 'unresolved'}`);

    return NextResponse.json({
      success: true,
      message: `Alert marked as ${resolved ? 'resolved' : 'unresolved'}`,
      resolved
    });

  } catch (error: any) {
    console.error("Error in toggle alert route:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

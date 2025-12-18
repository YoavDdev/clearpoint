import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { alertId } = await request.json();

    if (!alertId) {
      return NextResponse.json(
        { success: false, error: "Alert ID is required" },
        { status: 400 }
      );
    }

    // Update the alert to mark it as resolved
    const { data, error } = await supabase
      .from("system_alerts")
      .update({ 
        resolved: true,
        resolved_at: new Date().toISOString()
      })
      .eq("id", alertId)
      .select()
      .single();

    if (error) {
      console.error("Error resolving alert:", error);
      return NextResponse.json(
        { success: false, error: "Failed to resolve alert" },
        { status: 500 }
      );
    }

    console.log(`✅ Alert resolved: ${data.camera_name} - ${data.type}`);

    return NextResponse.json({
      success: true,
      message: "Alert resolved successfully",
      alert: data
    });

  } catch (error) {
    console.error("Resolve alert error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

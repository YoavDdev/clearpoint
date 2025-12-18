import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch all cameras with user information
    const { data: cameras, error } = await supabase
      .from("cameras")
      .select(`
        id,
        name,
        serial_number,
        stream_path,
        user_id,
        is_stream_active,
        last_seen_at,
        created_at,
        user:users(
          full_name,
          email
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching cameras:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch cameras" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      cameras: cameras || [],
    });
  } catch (error) {
    console.error("Error in admin-camera-diagnostics:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

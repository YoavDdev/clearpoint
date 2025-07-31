import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const segments = url.pathname.split("/");
  const cameraId = segments[segments.length - 1]; // safely extract cameraId

  if (!cameraId) {
    return NextResponse.json({ success: false, error: "Missing cameraId" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase
    .from("device_health")
    .select("*")
    .eq("camera_id", cameraId)
    .order("last_checked", { ascending: false })
    .limit(1)
    .single();

  // If no health data found, return success with null health (camera exists but no health data yet)
  if (error && error.code === 'PGRST116') {
    return NextResponse.json({ 
      success: true, 
      health: null,
      message: "No health data available for this camera yet" 
    });
  }

  // If other database error, return error
  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, health: data });
}

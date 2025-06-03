import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.email) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Step 1: Get user info (with tunnel_name)
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("tunnel_name, plan_duration_days")
    .eq("email", session.user.email)
    .single();

  if (userError) {
    return NextResponse.json({ success: false, error: userError.message }, { status: 500 });
  }

  // Step 2: Get active cameras for the user
  const { data: cameras, error: cameraError } = await supabase
    .from("cameras")
    .select("id, name")
    .eq("user_email", session.user.email)
    .eq("is_stream_active", true);

  if (cameraError) {
    return NextResponse.json({ success: false, error: cameraError.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    tunnel_name: user.tunnel_name,
    cameras,
    plan_duration_days: user.plan_duration_days ?? 14,
  });
}

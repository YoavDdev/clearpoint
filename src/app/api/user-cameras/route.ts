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

  // Fetch user's cameras
  const { data: cameras, error: cameraError } = await supabase
    .from("cameras")
    .select("*")
    .eq("user_email", session.user.email)
    .eq("is_stream_active", true);

  if (cameraError) {
    return NextResponse.json({ success: false, error: cameraError.message }, { status: 500 });
  }

  // Fetch user's plan retention
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("plan_duration_days")
    .eq("email", session.user.email)
    .single();

  if (userError) {
    return NextResponse.json({ success: false, error: userError.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    cameras,
    plan_duration_days: user?.plan_duration_days ?? 14, // fallback to 14 if null
  });
}

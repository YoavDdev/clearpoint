import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const [{ data: offlineCameras }, { count: pendingSupport }, { count: newRequests }, { data: cameras }]
    = await Promise.all([
      supabaseAdmin
        .from("cameras")
        .select("id, name, last_seen_at, user:users!cameras_user_id_fkey(full_name)")
        .eq("is_stream_active", false),
      supabaseAdmin
        .from("support_requests")
        .select("*", { count: "exact", head: true })
        .eq("is_handled", false),
      supabaseAdmin
        .from("subscription_requests")
        .select("*", { count: "exact", head: true })
        .eq("status", "new"),
      supabaseAdmin
        .from("cameras")
        .select("id, name, user:users!cameras_user_id_fkey(full_name)")
        .eq("is_stream_active", true),
    ]);

  return NextResponse.json({
    success: true,
    offlineCameras: offlineCameras || [],
    pendingSupport: pendingSupport || 0,
    newRequests: newRequests || 0,
    activeCameras: cameras || [],
  });
}

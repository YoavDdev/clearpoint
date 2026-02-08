import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const url = new URL(req.url);
  const category = url.searchParams.get("category");
  const severity = url.searchParams.get("severity");
  const miniPcId = url.searchParams.get("mini_pc_id");
  const limit = Math.min(Number(url.searchParams.get("limit") || 200), 1000);

  let query = supabase
    .from("system_logs")
    .select(`
      *,
      user:users!system_logs_user_id_fkey(full_name, email),
      camera:cameras!system_logs_camera_id_fkey(name),
      mini_pc:mini_pcs!system_logs_mini_pc_id_fkey(id, device_name, hostname, user_id, user:users!mini_pcs_user_id_fkey(full_name, email))
    `)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (category) query = query.eq("category", category);
  if (severity) query = query.eq("severity", severity);
  if (miniPcId) query = query.eq("mini_pc_id", miniPcId);

  const { data, error } = await query;

  if (error) {
    console.error("Failed to fetch system logs:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, logs: data || [] });
}

import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// GET — fetch user's alerts
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: user } = await supabase
    .from("users")
    .select("id, role")
    .eq("email", session.user.email)
    .single();

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = parseInt(searchParams.get("offset") || "0");
  const unacknowledgedOnly = searchParams.get("unacknowledged") === "true";
  const cameraId = searchParams.get("camera_id");
  const detectionType = searchParams.get("detection_type");

  let query = supabase
    .from("alerts")
    .select("*, camera:cameras(id, name), rule:alert_rules(id, name)")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  // Admin sees all alerts, users see only their own
  if (user.role !== "admin") {
    query = query.eq("user_id", user.id);
  }

  if (unacknowledgedOnly) {
    query = query.eq("acknowledged", false);
  }
  if (cameraId) {
    query = query.eq("camera_id", cameraId);
  }
  if (detectionType) {
    query = query.eq("detection_type", detectionType);
  }

  const { data: alerts, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Also get unacknowledged count for badge
  let countQuery = supabase
    .from("alerts")
    .select("id", { count: "exact", head: true })
    .eq("acknowledged", false);

  if (user.role !== "admin") {
    countQuery = countQuery.eq("user_id", user.id);
  }

  const { count: unacknowledgedCount } = await countQuery;

  return NextResponse.json({
    success: true,
    alerts: alerts || [],
    unacknowledged_count: unacknowledgedCount || 0,
  });
}

// PUT — acknowledge alert(s)
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: user } = await supabase
    .from("users")
    .select("id")
    .eq("email", session.user.email)
    .single();

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const body = await req.json();

  // Support single ID or array of IDs or "all"
  if (body.acknowledge_all) {
    const { error } = await supabase
      .from("alerts")
      .update({ acknowledged: true, acknowledged_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("acknowledged", false);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "All alerts acknowledged" });
  }

  const ids: string[] = Array.isArray(body.ids) ? body.ids : [body.id].filter(Boolean);

  if (ids.length === 0) {
    return NextResponse.json({ error: "Missing alert id(s)" }, { status: 400 });
  }

  const { error } = await supabase
    .from("alerts")
    .update({ acknowledged: true, acknowledged_at: new Date().toISOString() })
    .in("id", ids)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

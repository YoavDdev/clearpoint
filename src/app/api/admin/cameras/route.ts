import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

// ─── GET /api/admin/cameras?userId=xxx — Fetch cameras for a user ───────────

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  let query = supabase
    .from("cameras")
    .select(`
      id, name, serial_number, image_url, stream_path,
      user_id, is_stream_active, last_seen_at, created_at,
      user:users!cameras_user_id_fkey(full_name, email)
    `)
    .order("created_at", { ascending: false });

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, cameras: data || [] });
}

// ─── POST /api/admin/cameras — Create camera ────────────────────────────────

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
  }

  const { name, serialNumber, userId, userEmail, streamPath, isStreamActive } = await req.json();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase
    .from("cameras")
    .insert([{
      name,
      serial_number: serialNumber,
      user_id: userId,
      user_email: userEmail,
      stream_path: streamPath,
      is_stream_active: isStreamActive,
    }])
    .select()
    .single();

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  console.log(`✅ Camera ${data.name} created for user ${userId}`);
  return NextResponse.json({ success: true, camera: data });
}

// ─── DELETE /api/admin/cameras — Delete camera ──────────────────────────────

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
  }

  const { cameraId } = await req.json();

  if (!cameraId) {
    return NextResponse.json({ success: false, error: "Missing cameraId" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error } = await supabase
    .from("cameras")
    .delete()
    .eq("id", cameraId);

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { createCameraSchema, deleteCameraSchema, parseBody } from "@/lib/validations";
import { apiHandler } from "@/lib/api-handler";

export const dynamic = "force-dynamic";

// ─── GET /api/admin/cameras?userId=xxx — Fetch cameras for a user ───────────

export const GET = apiHandler(async (req) => {
  const userId = req.nextUrl.searchParams.get("userId");

  const supabase = getSupabaseAdmin();

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
});

// ─── POST /api/admin/cameras — Create camera ────────────────────────────────

export const POST = apiHandler(async (req) => {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = parseBody(createCameraSchema, body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error }, { status: 400 });
  }
  const { name, serialNumber, userId, userEmail, streamPath, isStreamActive } = parsed.data;

  const supabase = getSupabaseAdmin();

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
});

// ─── DELETE /api/admin/cameras — Delete camera ──────────────────────────────

export const DELETE = apiHandler(async (req) => {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = parseBody(deleteCameraSchema, body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error }, { status: 400 });
  }
  const { cameraId } = parsed.data;

  const supabase = getSupabaseAdmin();

  const { error } = await supabase
    .from("cameras")
    .delete()
    .eq("id", cameraId);

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
});

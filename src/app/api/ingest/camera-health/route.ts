import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { validateDeviceToken, sha256Hex } from "@/lib/device-auth";
import { checkRateLimit, INGEST_LIMIT } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

type CameraHealthPayload = {
  camera_id: string;
  stream_status: string;
  last_checked?: string | null;
  log_message?: string | null;
};

export async function POST(req: Request) {
  const token = req.headers.get("x-clearpoint-device-token")?.trim();
  if (!token) {
    return NextResponse.json(
      { success: false, error: "Missing device token" },
      { status: 401 }
    );
  }

  const rl = checkRateLimit(`cam-health:${sha256Hex(token)}`, INGEST_LIMIT);
  if (!rl.allowed) {
    return NextResponse.json({ success: false, error: "Rate limit exceeded" }, { status: 429 });
  }

  let payload: CameraHealthPayload;
  try {
    payload = (await req.json()) as CameraHealthPayload;
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  if (!payload?.camera_id || !payload?.stream_status) {
    return NextResponse.json(
      { success: false, error: "Missing camera_id or stream_status" },
      { status: 400 }
    );
  }

  const supabaseAdmin = getSupabaseAdmin();

  let miniPcId: string | null;
  try {
    miniPcId = await validateDeviceToken(supabaseAdmin, token);
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || "Token lookup failed" }, { status: 500 });
  }

  if (!miniPcId) {
    return NextResponse.json({ success: false, error: "Invalid or revoked device token" }, { status: 403 });
  }

  const { data: cameraRow, error: cameraError } = await supabaseAdmin
    .from("cameras")
    .select("id")
    .eq("id", payload.camera_id)
    .eq("mini_pc_id", miniPcId)
    .maybeSingle();

  if (cameraError) {
    return NextResponse.json(
      { success: false, error: cameraError.message },
      { status: 500 }
    );
  }

  if (!cameraRow) {
    return NextResponse.json(
      { success: false, error: "Camera does not belong to this Mini PC" },
      { status: 403 }
    );
  }

  const { error: upsertError } = await supabaseAdmin
    .from("camera_health")
    .upsert(
      {
        camera_id: payload.camera_id,
        mini_pc_id: miniPcId,
        stream_status: payload.stream_status,
        last_checked: payload.last_checked ?? new Date().toISOString(),
        log_message: payload.log_message ?? null,
      },
      { onConflict: "camera_id" }
    );

  if (upsertError) {
    return NextResponse.json(
      { success: false, error: upsertError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

export const dynamic = "force-dynamic";

type CameraHealthPayload = {
  camera_id: string;
  stream_status: string;
  last_checked?: string | null;
  log_message?: string | null;
};

function sha256Hex(input: string) {
  return crypto.createHash("sha256").update(input, "utf8").digest("hex");
}

export async function POST(req: Request) {
  const token = req.headers.get("x-clearpoint-device-token")?.trim();
  if (!token) {
    return NextResponse.json(
      { success: false, error: "Missing device token" },
      { status: 401 }
    );
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

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const tokenHash = sha256Hex(token);

  const { data: tokenRow, error: tokenError } = await supabaseAdmin
    .from("mini_pc_tokens")
    .select("token_hash, mini_pc_id, revoked_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (tokenError) {
    return NextResponse.json(
      { success: false, error: tokenError.message },
      { status: 500 }
    );
  }

  if (!tokenRow || tokenRow.revoked_at) {
    return NextResponse.json(
      { success: false, error: "Invalid or revoked device token" },
      { status: 403 }
    );
  }

  await supabaseAdmin
    .from("mini_pc_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("token_hash", tokenHash);

  const { data: cameraRow, error: cameraError } = await supabaseAdmin
    .from("cameras")
    .select("id")
    .eq("id", payload.camera_id)
    .eq("mini_pc_id", tokenRow.mini_pc_id)
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
        mini_pc_id: tokenRow.mini_pc_id,
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

import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import crypto from "crypto";

export const dynamic = "force-dynamic";

function sha256Hex(input: string) {
  return crypto.createHash("sha256").update(input, "utf8").digest("hex");
}

async function getTokenMiniPcId(supabaseAdmin: SupabaseClient<any, "public", any>, token: string) {
  const tokenHash = sha256Hex(token);

  const { data: tokenRow, error: tokenError } = await supabaseAdmin
    .from("mini_pc_tokens")
    .select("token_hash, mini_pc_id, revoked_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (tokenError) throw new Error(tokenError.message);
  if (!tokenRow || tokenRow.revoked_at) return null;

  await supabaseAdmin
    .from("mini_pc_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("token_hash", tokenHash);

  return tokenRow.mini_pc_id as string;
}

async function hasActiveSubscription(supabaseAdmin: SupabaseClient<any, "public", any>, userId: string) {
  const { data: activeSubscription } = await supabaseAdmin
    .from("subscriptions")
    .select("id, status")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (activeSubscription) return true;

  const { data: activeRecurringPayment } = await supabaseAdmin
    .from("recurring_payments")
    .select("id, is_active, is_valid")
    .eq("user_id", userId)
    .eq("is_active", true)
    .eq("is_valid", true)
    .maybeSingle();

  return !!activeRecurringPayment;
}

type VodFilePayload = {
  camera_id: string;
  url: string;
  file_id: string;
  object_key?: string | null;
  timestamp: string;
  duration?: number | null;
};

export async function POST(req: Request) {
  const token = req.headers.get("x-clearpoint-device-token")?.trim();
  if (!token) {
    return NextResponse.json({ success: false, error: "Missing device token" }, { status: 401 });
  }

  let payload: VodFilePayload;
  try {
    payload = (await req.json()) as VodFilePayload;
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  if (!payload?.camera_id || !payload?.url || !payload?.file_id || !payload?.timestamp) {
    return NextResponse.json(
      { success: false, error: "Missing camera_id/url/file_id/timestamp" },
      { status: 400 }
    );
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  let miniPcId: string | null;
  try {
    miniPcId = await getTokenMiniPcId(supabaseAdmin, token);
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || "Token lookup failed" }, { status: 500 });
  }

  if (!miniPcId) {
    return NextResponse.json({ success: false, error: "Invalid or revoked device token" }, { status: 403 });
  }

  const { data: cameraRow, error: cameraError } = await supabaseAdmin
    .from("cameras")
    .select("id, mini_pc_id, user_id, user_email")
    .eq("id", payload.camera_id)
    .maybeSingle();

  if (cameraError) {
    return NextResponse.json({ success: false, error: cameraError.message }, { status: 500 });
  }

  if (!cameraRow || cameraRow.mini_pc_id !== miniPcId) {
    return NextResponse.json({ success: false, error: "Camera does not belong to this Mini PC" }, { status: 403 });
  }

  if (!cameraRow.user_id) {
    return NextResponse.json({ success: false, error: "Camera has no assigned user" }, { status: 400 });
  }

  const { data: userRow, error: userError } = await supabaseAdmin
    .from("users")
    .select("id, role")
    .eq("id", cameraRow.user_id)
    .maybeSingle();

  if (userError) {
    return NextResponse.json({ success: false, error: userError.message }, { status: 500 });
  }

  const isAdmin = (userRow?.role || "").toLowerCase() === "admin";
  const allowed = isAdmin ? true : await hasActiveSubscription(supabaseAdmin, cameraRow.user_id);

  if (!allowed) {
    return NextResponse.json({ success: false, error: "No active subscription" }, { status: 403 });
  }

  const { error: insertError } = await supabaseAdmin.from("vod_files").insert([
    {
      user_id: cameraRow.user_id,
      user_email: cameraRow.user_email || null,
      camera_id: payload.camera_id,
      url: payload.url,
      file_id: payload.file_id,
      object_key: payload.object_key || null,
      timestamp: payload.timestamp,
      duration: payload.duration ?? 900,
    },
  ]);

  if (insertError) {
    return NextResponse.json({ success: false, error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

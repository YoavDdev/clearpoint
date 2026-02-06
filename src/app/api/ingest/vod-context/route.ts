import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import crypto from "crypto";

export const dynamic = "force-dynamic";

function sha256Hex(input: string) {
  return crypto.createHash("sha256").update(input, "utf8").digest("hex");
}

type VodContextResponse = {
  allowed: boolean;
  user_id: string | null;
  user_email: string | null;
  reason?: string;
};

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

export async function POST(req: Request) {
  const token = req.headers.get("x-clearpoint-device-token")?.trim();
  if (!token) {
    return NextResponse.json(
      { allowed: false, user_id: null, user_email: null, reason: "Missing device token" } satisfies VodContextResponse,
      { status: 401 }
    );
  }

  let body: { camera_id?: string };
  try {
    body = (await req.json()) as { camera_id?: string };
  } catch {
    return NextResponse.json(
      { allowed: false, user_id: null, user_email: null, reason: "Invalid JSON body" } satisfies VodContextResponse,
      { status: 400 }
    );
  }

  if (!body?.camera_id) {
    return NextResponse.json(
      { allowed: false, user_id: null, user_email: null, reason: "Missing camera_id" } satisfies VodContextResponse,
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
    return NextResponse.json(
      { allowed: false, user_id: null, user_email: null, reason: e?.message || "Token lookup failed" } satisfies VodContextResponse,
      { status: 500 }
    );
  }

  if (!miniPcId) {
    return NextResponse.json(
      { allowed: false, user_id: null, user_email: null, reason: "Invalid or revoked device token" } satisfies VodContextResponse,
      { status: 403 }
    );
  }

  const { data: cameraRow, error: cameraError } = await supabaseAdmin
    .from("cameras")
    .select("id, mini_pc_id, user_id, user_email")
    .eq("id", body.camera_id)
    .maybeSingle();

  if (cameraError) {
    return NextResponse.json(
      { allowed: false, user_id: null, user_email: null, reason: cameraError.message } satisfies VodContextResponse,
      { status: 500 }
    );
  }

  if (!cameraRow || cameraRow.mini_pc_id !== miniPcId) {
    return NextResponse.json(
      { allowed: false, user_id: null, user_email: null, reason: "Camera does not belong to this Mini PC" } satisfies VodContextResponse,
      { status: 403 }
    );
  }

  if (!cameraRow.user_id) {
    return NextResponse.json(
      { allowed: false, user_id: null, user_email: null, reason: "Camera has no assigned user" } satisfies VodContextResponse,
      { status: 200 }
    );
  }

  const { data: userRow, error: userError } = await supabaseAdmin
    .from("users")
    .select("id, role")
    .eq("id", cameraRow.user_id)
    .maybeSingle();

  if (userError) {
    return NextResponse.json(
      { allowed: false, user_id: null, user_email: null, reason: userError.message } satisfies VodContextResponse,
      { status: 500 }
    );
  }

  const isAdmin = (userRow?.role || "").toLowerCase() === "admin";
  if (isAdmin) {
    return NextResponse.json({ allowed: true, user_id: cameraRow.user_id, user_email: cameraRow.user_email || null } satisfies VodContextResponse);
  }

  const allowed = await hasActiveSubscription(supabaseAdmin, cameraRow.user_id);

  return NextResponse.json({
    allowed,
    user_id: allowed ? cameraRow.user_id : null,
    user_email: allowed ? (cameraRow.user_email || null) : null,
    reason: allowed ? undefined : "No active subscription",
  } satisfies VodContextResponse);
}

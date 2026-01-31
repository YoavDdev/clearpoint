import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

export const dynamic = "force-dynamic";

type MiniPcHealthPayload = {
  cpu_temp_celsius?: number | null;
  cpu_usage_pct?: number | null;
  ram_total_mb?: number | null;
  ram_used_mb?: number | null;
  ram_usage_pct?: number | null;
  disk_root_total_gb?: number | null;
  disk_root_used_gb?: number | null;
  disk_root_pct?: number | null;
  disk_ram_total_gb?: number | null;
  disk_ram_used_gb?: number | null;
  disk_ram_pct?: number | null;
  load_avg_1min?: number | string | null;
  load_avg_5min?: number | string | null;
  load_avg_15min?: number | string | null;
  uptime_seconds?: number | null;
  process_count?: number | null;
  internet_connected?: boolean | null;
  ping_gateway_ms?: number | null;
  ping_internet_ms?: number | null;
  total_video_files?: number | null;
  overall_status?: string | null;
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

  let payload: MiniPcHealthPayload;
  try {
    payload = (await req.json()) as MiniPcHealthPayload;
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
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

  const { error: upsertError } = await supabaseAdmin
    .from("mini_pc_health")
    .upsert(
      {
        mini_pc_id: tokenRow.mini_pc_id,
        cpu_temp_celsius: payload.cpu_temp_celsius ?? null,
        cpu_usage_pct: payload.cpu_usage_pct ?? null,
        ram_total_mb: payload.ram_total_mb ?? null,
        ram_used_mb: payload.ram_used_mb ?? null,
        ram_usage_pct: payload.ram_usage_pct ?? null,
        disk_root_total_gb: payload.disk_root_total_gb ?? null,
        disk_root_used_gb: payload.disk_root_used_gb ?? null,
        disk_root_pct: payload.disk_root_pct ?? null,
        disk_ram_total_gb: payload.disk_ram_total_gb ?? null,
        disk_ram_used_gb: payload.disk_ram_used_gb ?? null,
        disk_ram_pct: payload.disk_ram_pct ?? null,
        load_avg_1min:
          payload.load_avg_1min === undefined ? null : (payload.load_avg_1min as any),
        load_avg_5min:
          payload.load_avg_5min === undefined ? null : (payload.load_avg_5min as any),
        load_avg_15min:
          payload.load_avg_15min === undefined ? null : (payload.load_avg_15min as any),
        uptime_seconds: payload.uptime_seconds ?? null,
        process_count: payload.process_count ?? null,
        internet_connected: payload.internet_connected ?? null,
        ping_gateway_ms: payload.ping_gateway_ms ?? null,
        ping_internet_ms: payload.ping_internet_ms ?? null,
        total_video_files: payload.total_video_files ?? null,
        overall_status: payload.overall_status ?? null,
        last_checked: payload.last_checked ?? new Date().toISOString(),
        log_message: payload.log_message ?? null,
      },
      { onConflict: "mini_pc_id" }
    );

  if (upsertError) {
    return NextResponse.json(
      { success: false, error: upsertError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}

import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export const dynamic = "force-dynamic";

const VALID_CATEGORIES = ["camera", "vod", "minipc", "alert", "system"];
const VALID_SEVERITIES = ["info", "warning", "error", "critical"];

function sha256Hex(input: string) {
  return crypto.createHash("sha256").update(input, "utf8").digest("hex");
}

export async function POST(req: NextRequest) {
  const deviceToken = req.headers.get("x-clearpoint-device-token")?.trim();

  if (!deviceToken) {
    return NextResponse.json({ error: "Missing device token" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Resolve mini_pc_id from token (same as mini-pc-health)
  const tokenHash = sha256Hex(deviceToken);
  const { data: tokenRow } = await supabase
    .from("mini_pc_tokens")
    .select("mini_pc_id, revoked_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (!tokenRow || tokenRow.revoked_at) {
    return NextResponse.json({ error: "Invalid or revoked token" }, { status: 403 });
  }

  const miniPcId = tokenRow.mini_pc_id;

  try {
    const body = await req.json();

    // Support single log or batch
    const logs: any[] = Array.isArray(body) ? body : [body];

    const rows = logs.map((log) => {
      if (!log.category || !VALID_CATEGORIES.includes(log.category)) {
        throw new Error(`Invalid category: ${log.category}`);
      }
      if (log.severity && !VALID_SEVERITIES.includes(log.severity)) {
        throw new Error(`Invalid severity: ${log.severity}`);
      }
      if (!log.event || !log.message) {
        throw new Error("Missing event or message");
      }

      return {
        user_id: log.user_id || null,
        mini_pc_id: miniPcId,
        camera_id: log.camera_id || null,
        category: log.category,
        severity: log.severity || "info",
        event: log.event,
        message: log.message,
        metadata: log.metadata || {},
      };
    });

    const { error } = await supabase.from("system_logs").insert(rows);

    if (error) {
      console.error("Failed to insert system logs:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, count: rows.length });
  } catch (err: any) {
    console.error("System log error:", err);
    return NextResponse.json(
      { error: err.message || "Invalid request" },
      { status: 400 }
    );
  }
}

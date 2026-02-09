import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export const dynamic = "force-dynamic";

function sha256Hex(input: string) {
  return crypto.createHash("sha256").update(input, "utf8").digest("hex");
}

/**
 * Check if an alert matches any active rule.
 * Checks: detection_type, min_confidence, camera_id, schedule, day of week.
 */
function findMatchingRule(rules: any[], alert: any): any | null {
  const now = new Date();
  // Israel timezone offset (IST = UTC+2, IDT = UTC+3)
  const israelTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Jerusalem" }));
  const currentHHMM = `${String(israelTime.getHours()).padStart(2, "0")}:${String(israelTime.getMinutes()).padStart(2, "0")}`;
  const currentDay = israelTime.getDay(); // 0=Sunday

  for (const rule of rules) {
    // 1. Detection type check
    if (rule.detection_type !== "any" && rule.detection_type !== alert.detection_type) {
      continue;
    }

    // 2. Min confidence check
    if (alert.confidence != null && rule.min_confidence != null && alert.confidence < rule.min_confidence) {
      continue;
    }

    // 3. Camera check (null = all cameras)
    if (rule.camera_id && rule.camera_id !== alert.camera_id) {
      continue;
    }

    // 4. Day of week check
    if (rule.days_of_week && rule.days_of_week.length > 0 && !rule.days_of_week.includes(currentDay)) {
      continue;
    }

    // 5. Schedule check (start/end times)
    if (rule.schedule_start && rule.schedule_end) {
      const start = rule.schedule_start;
      const end = rule.schedule_end;

      if (start <= end) {
        // Same-day range (e.g. 08:00 - 18:00)
        if (currentHHMM < start || currentHHMM > end) continue;
      } else {
        // Overnight range (e.g. 22:00 - 06:00)
        if (currentHHMM < start && currentHHMM > end) continue;
      }
    }

    // All checks passed — this rule matches
    return rule;
  }

  return null;
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

  // Resolve mini_pc_id from token
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

  // Get user_id from mini_pc
  const { data: miniPc } = await supabase
    .from("mini_pcs")
    .select("user_id")
    .eq("id", miniPcId)
    .single();

  if (!miniPc?.user_id) {
    return NextResponse.json({ error: "Mini PC not linked to user" }, { status: 400 });
  }

  try {
    const body = await req.json();

    // Support single alert or batch
    const items: any[] = Array.isArray(body) ? body : [body];

    // Fetch user's active alert rules
    const { data: activeRules } = await supabase
      .from("alert_rules")
      .select("id, detection_type, min_confidence, camera_id, schedule_start, schedule_end, days_of_week, cooldown_minutes, is_active")
      .eq("user_id", miniPc.user_id)
      .eq("is_active", true);

    const rules = activeRules || [];

    const rows = [];
    let skipped = 0;

    for (const item of items) {
      if (!item.camera_id || !item.detection_type) {
        throw new Error("Missing camera_id or detection_type");
      }

      // Check if alert matches any active rule
      const matchingRule = findMatchingRule(rules, item);
      if (!matchingRule) {
        skipped++;
        continue; // No matching active rule — skip this alert
      }

      // Enforce rule cooldown: skip if a recent alert exists for same rule+camera
      if (matchingRule.cooldown_minutes > 0) {
        const cooldownCutoff = new Date(Date.now() - matchingRule.cooldown_minutes * 60_000).toISOString();
        const { data: recentAlert } = await supabase
          .from("alerts")
          .select("id")
          .eq("rule_id", matchingRule.id)
          .eq("camera_id", item.camera_id)
          .gte("created_at", cooldownCutoff)
          .limit(1)
          .maybeSingle();

        if (recentAlert) {
          skipped++;
          continue; // Cooldown not expired — skip
        }
      }

      let snapshotUrl = item.snapshot_url || null;

      // Upload base64 snapshot to Supabase Storage
      if (snapshotUrl && snapshotUrl.startsWith("data:image/")) {
        try {
          const base64Data = snapshotUrl.split(",")[1];
          const bytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
          const ts = new Date().toISOString().replace(/[:.]/g, "-");
          const filePath = `${miniPc.user_id}/${item.camera_id}/${ts}.jpg`;

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from("alert-snapshots")
            .upload(filePath, bytes, {
              contentType: "image/jpeg",
              upsert: false,
            });

          if (uploadError) {
            console.error("Snapshot upload error:", JSON.stringify(uploadError));
          } else {
            const { data: urlData } = supabase.storage
              .from("alert-snapshots")
              .getPublicUrl(filePath);
            snapshotUrl = urlData.publicUrl;
          }
        } catch (uploadErr: any) {
          console.error("Snapshot processing error:", uploadErr?.message || uploadErr);
        }
      }

      rows.push({
        user_id: miniPc.user_id,
        camera_id: item.camera_id,
        rule_id: matchingRule.id,
        mini_pc_id: miniPcId,
        detection_type: item.detection_type,
        confidence: item.confidence || null,
        snapshot_url: snapshotUrl,
        thumbnail_url: item.thumbnail_url || null,
        message: item.message || null,
        metadata: item.metadata || {},
      });
    }

    if (rows.length === 0) {
      return NextResponse.json({ success: true, count: 0, skipped, message: "No matching active rules" });
    }

    const { data, error } = await supabase
      .from("alerts")
      .insert(rows)
      .select();

    if (error) {
      console.error("Failed to insert alerts:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, count: rows.length, skipped, alerts: data });
  } catch (err: any) {
    console.error("Alert ingest error:", err);
    return NextResponse.json(
      { error: err.message || "Invalid request" },
      { status: 400 }
    );
  }
}

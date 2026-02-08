import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export const dynamic = "force-dynamic";

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

    const rows = [];
    for (const item of items) {
      if (!item.camera_id || !item.detection_type) {
        throw new Error("Missing camera_id or detection_type");
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
        rule_id: item.rule_id || null,
        mini_pc_id: miniPcId,
        detection_type: item.detection_type,
        confidence: item.confidence || null,
        snapshot_url: snapshotUrl,
        thumbnail_url: item.thumbnail_url || null,
        message: item.message || null,
        metadata: item.metadata || {},
      });
    }

    const { data, error } = await supabase
      .from("alerts")
      .insert(rows)
      .select();

    if (error) {
      console.error("Failed to insert alerts:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, count: rows.length, alerts: data });
  } catch (err: any) {
    console.error("Alert ingest error:", err);
    return NextResponse.json(
      { error: err.message || "Invalid request" },
      { status: 400 }
    );
  }
}

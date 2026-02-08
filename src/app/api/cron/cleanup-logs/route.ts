import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

  // 1. Cleanup old system logs
  const { error: logsError, count: logsDeleted } = await supabase
    .from("system_logs")
    .delete({ count: "exact" })
    .lt("created_at", cutoff);

  if (logsError) {
    console.error("Failed to cleanup logs:", logsError);
  }

  // 2. Cleanup old alerts + their snapshots from Storage
  let alertsDeleted = 0;
  let snapshotsDeleted = 0;

  // Fetch old alerts that have snapshot URLs (to delete files from Storage)
  const { data: oldAlerts } = await supabase
    .from("alerts")
    .select("id, snapshot_url")
    .lt("created_at", cutoff);

  if (oldAlerts && oldAlerts.length > 0) {
    // Extract Storage file paths from snapshot URLs
    const filePaths = oldAlerts
      .filter((a) => a.snapshot_url && a.snapshot_url.includes("/alert-snapshots/"))
      .map((a) => {
        const parts = a.snapshot_url.split("/alert-snapshots/");
        return parts[1]; // e.g. "user_id/camera_id/timestamp.jpg"
      })
      .filter(Boolean);

    // Delete snapshot files from Storage (in batches of 100)
    for (let i = 0; i < filePaths.length; i += 100) {
      const batch = filePaths.slice(i, i + 100);
      const { data: removed, error: removeError } = await supabase.storage
        .from("alert-snapshots")
        .remove(batch);

      if (removeError) {
        console.error("Snapshot cleanup error:", removeError);
      } else {
        snapshotsDeleted += removed?.length || 0;
      }
    }

    // Delete old alerts from DB
    const { error: alertsError, count } = await supabase
      .from("alerts")
      .delete({ count: "exact" })
      .lt("created_at", cutoff);

    if (alertsError) {
      console.error("Failed to cleanup alerts:", alertsError);
    } else {
      alertsDeleted = count || 0;
    }
  }

  return NextResponse.json({
    success: true,
    logs_deleted: logsDeleted || 0,
    alerts_deleted: alertsDeleted,
    snapshots_deleted: snapshotsDeleted,
  });
}

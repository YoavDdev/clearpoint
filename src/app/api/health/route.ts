import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

import { apiHandler } from "@/lib/api-handler";

export const dynamic = "force-dynamic";

export const GET = apiHandler(async () => {
  const start = Date.now();

  // Check DB connection
  let dbOk = false;
  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("users").select("id").limit(1);
    dbOk = !error;
  } catch {
    dbOk = false;
  }

  // Check required env vars
  const envVars = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "NEXTAUTH_SECRET",
    "CRON_SECRET",
  ];
  const missingEnv = envVars.filter((v) => !process.env[v]);

  const status = dbOk && missingEnv.length === 0 ? "ok" : "degraded";

  return NextResponse.json({
    status,
    timestamp: new Date().toISOString(),
    latencyMs: Date.now() - start,
    checks: {
      database: dbOk ? "ok" : "error",
      env: missingEnv.length === 0 ? "ok" : `missing: ${missingEnv.join(", ")}`,
    },
  }, { status: status === "ok" ? 200 : 503 });
});

import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import crypto from "crypto";

export const dynamic = "force-dynamic";

function signBunnyUrl(objectKey: string, expiresInSeconds: number) {
  const cdnBase = (process.env.BUNNY_CDN_BASE || "https://clearpoint-cdn.b-cdn.net").replace(/\/$/, "");
  const tokenKey = process.env.BUNNY_TOKEN_KEY;
  if (!tokenKey) {
    throw new Error("Missing BUNNY_TOKEN_KEY env var");
  }

  const normalizedPath = objectKey.startsWith("/") ? objectKey : `/${objectKey}`;
  const expires = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const signatureBase = tokenKey + normalizedPath + expires;
  const token = crypto.createHash("sha256").update(signatureBase).digest("hex");
  return `${cdnBase}${normalizedPath}?token=${token}&expires=${expires}`;
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const objectKey = (body?.objectKey || body?.object_key || "").trim();
  if (!objectKey) {
    return NextResponse.json({ error: "Missing objectKey" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: user } = await supabase
    .from("users")
    .select("id, plan_duration_days, role")
    .eq("email", session.user.email)
    .single();

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { data: vodRow, error: vodErr } = await supabase
    .from("vod_files")
    .select("id, user_id, timestamp, object_key")
    .eq("object_key", objectKey)
    .eq("user_id", user.id)
    .maybeSingle();

  if (vodErr) {
    return NextResponse.json({ error: vodErr.message }, { status: 500 });
  }

  if (!vodRow) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isAdmin = (user.role || "").toLowerCase() === "admin";
  if (!isAdmin) {
    const { data: activeSubscription } = await supabase
      .from("subscriptions")
      .select("id, status")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    const { data: activeRecurringPayment } = await supabase
      .from("recurring_payments")
      .select("id, is_active, is_valid")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .eq("is_valid", true)
      .maybeSingle();

    const hasActiveSubscription = !!activeSubscription || !!activeRecurringPayment;
    if (!hasActiveSubscription) {
      return NextResponse.json({ error: "אין מנוי פעיל - נדרש מנוי לגישה להקלטות" }, { status: 403 });
    }

    const retentionDays = user.plan_duration_days ?? 14;
    const requestedDate = new Date(vodRow.timestamp as any);
    const now = new Date();
    const daysAgo = Math.floor((now.getTime() - requestedDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysAgo > retentionDays) {
      return NextResponse.json({ error: "Beyond retention" }, { status: 403 });
    }
  }

  let url: string;
  try {
    url = signBunnyUrl(objectKey, 60 * 60);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Signing failed" }, { status: 500 });
  }

  return NextResponse.json({ url });
}

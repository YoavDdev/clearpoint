import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
// ❌ import removed - subscription-check deleted

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.email) {
    return NextResponse.json([], { status: 401 });
  }

  const { cameraId, cameraIds, date } = await req.json();

  const isBatch = Array.isArray(cameraIds) && cameraIds.length > 0;
  if (!isBatch && !cameraId) {
    return NextResponse.json({ error: 'Missing cameraId or cameraIds' }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // קבלת user ID, plan_duration_days, ו-role
  const { data: user } = await supabase
    .from("users")
    .select("id, plan_duration_days, role")
    .eq("email", session.user.email)
    .single();

  if (!user) {
    return NextResponse.json([], { status: 404 });
  }

  // Admin users always have footage access
  const isAdmin = user.role?.toLowerCase() === 'admin';
  if (isAdmin) {
    console.log(`👑 Admin user ${user.id} - granting footage access without subscription check`);
    const retentionDays = user.plan_duration_days ?? 14;
    
    const start = new Date(`${date}T00:00:00`).toISOString();
    const end = new Date(`${date}T23:59:59`).toISOString();

    const query = supabase
      .from("vod_files")
      .select("id, url, object_key, file_id, duration, timestamp, camera_id")
      .eq("user_id", user.id)
      .gte("timestamp", start)
      .lte("timestamp", end)
      .order("timestamp");

    const { data, error } = isBatch
      ? await query.in("camera_id", cameraIds)
      : await query.eq("camera_id", cameraId);

    if (!isBatch) {
      return NextResponse.json(data || []);
    }

    const clipsByCamera: Record<string, any[]> = {};
    for (const id of cameraIds) clipsByCamera[id] = [];
    for (const row of data || []) {
      const id = (row as any).camera_id as string;
      if (!clipsByCamera[id]) clipsByCamera[id] = [];
      clipsByCamera[id].push(row);
    }

    return NextResponse.json({ clipsByCamera });
  }

  // בדיקת מנוי פעיל (subscriptions או recurring_payments)
  const { data: activeSubscription } = await supabase
    .from("subscriptions")
    .select("id, status")
    .eq("user_id", user.id)
    .eq("status", "active")
    .single();

  const { data: activeRecurringPayment } = await supabase
    .from("recurring_payments")
    .select("id, is_active, is_valid")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .eq("is_valid", true)
    .single();

  const hasActiveSubscription = !!activeSubscription || !!activeRecurringPayment;

  if (!hasActiveSubscription) {
    console.warn(`⚠️ User ${user.id} has no active subscription - blocking footage access`);
    return NextResponse.json({ error: "אין מנוי פעיל - נדרש מנוי לגישה להקלטות" }, { status: 403 });
  }

  // לקוחות עם מנוי פעיל יכולים לצפות בהקלטות
  const retentionDays = user.plan_duration_days ?? 14;
  console.log(`✅ User ${user.id} has active subscription - footage access granted (${retentionDays} days retention)`);

  const start = new Date(`${date}T00:00:00`).toISOString();
  const end = new Date(`${date}T23:59:59`).toISOString();

  // בדיקה שהתאריך המבוקש בטווח ימי השמירה
  const requestedDate = new Date(date);
  const now = new Date();
  const daysAgo = Math.floor((now.getTime() - requestedDate.getTime()) / (1000 * 60 * 60 * 24));

  if (daysAgo > retentionDays) {
    console.warn(`⚠️ Requested date ${date} is beyond retention period (${retentionDays} days)`);
    return NextResponse.json([], { status: 403 });
  }

  const query = supabase
    .from("vod_files")
    .select("id, url, object_key, file_id, duration, timestamp, camera_id")
    .eq("user_id", user.id)
    .gte("timestamp", start)
    .lte("timestamp", end)
    .order("timestamp");

  const { data, error } = isBatch
    ? await query.in("camera_id", cameraIds)
    : await query.eq("camera_id", cameraId);

  if (!isBatch) {
    return NextResponse.json(data || []);
  }

  const clipsByCamera: Record<string, any[]> = {};
  for (const id of cameraIds) clipsByCamera[id] = [];
  for (const row of data || []) {
    const id = (row as any).camera_id as string;
    if (!clipsByCamera[id]) clipsByCamera[id] = [];
    clipsByCamera[id].push(row);
  }

  return NextResponse.json({ clipsByCamera });
}

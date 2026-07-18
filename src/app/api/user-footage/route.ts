import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

// חישוב גבולות היום לפי שעון ישראל (תומך בשעון קיץ/חורף)
function getIsraelDayRange(dateStr: string) {
  const ref = new Date(`${dateStr}T12:00:00Z`);
  const utcStr = ref.toLocaleString('en-US', { timeZone: 'UTC' });
  const israelStr = ref.toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' });
  const offsetMs = new Date(israelStr).getTime() - new Date(utcStr).getTime();
  const start = new Date(new Date(`${dateStr}T00:00:00Z`).getTime() - offsetMs);
  const end = new Date(new Date(`${dateStr}T23:59:59.999Z`).getTime() - offsetMs);
  return { start: start.toISOString(), end: end.toISOString() };
}

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
    
    const { start, end } = getIsraelDayRange(date);

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

  // בדיקת מנוי פעיל (recurring_payments)
  const { data: activeRecurringPayment } = await supabase
    .from("recurring_payments")
    .select("id, is_active, is_valid")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .eq("is_valid", true)
    .maybeSingle();

  const hasActiveSubscription = !!activeRecurringPayment;

  if (!hasActiveSubscription) {
    console.warn(`⚠️ User ${user.id} has no active subscription - blocking footage access`);
    return NextResponse.json({ error: "אין מנוי פעיל - נדרש מנוי לגישה להקלטות" }, { status: 403 });
  }

  // לקוחות עם מנוי פעיל יכולים לצפות בהקלטות
  const retentionDays = user.plan_duration_days ?? 14;
  console.log(`✅ User ${user.id} has active subscription - footage access granted (${retentionDays} days retention)`);

  const { start, end } = getIsraelDayRange(date);

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

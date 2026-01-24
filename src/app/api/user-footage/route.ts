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

  const { cameraId, date } = await req.json();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // קבלת user ID ו-plan_duration_days
  const { data: user } = await supabase
    .from("users")
    .select("id, plan_duration_days")
    .eq("email", session.user.email)
    .single();

  if (!user) {
    return NextResponse.json([], { status: 404 });
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

  const { data, error } = await supabase
    .from("vod_files")
    .select("url, timestamp, camera_id")
    .eq("user_email", session.user.email)
    .eq("camera_id", cameraId)
    .gte("timestamp", start)
    .lte("timestamp", end)
    .order("timestamp");

  return NextResponse.json(data || []);
}

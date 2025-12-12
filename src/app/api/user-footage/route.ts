import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { canStoreRecordings } from "@/lib/subscription-check";

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

  // קבלת user ID
  const { data: user } = await supabase
    .from("users")
    .select("id")
    .eq("email", session.user.email)
    .single();

  if (!user) {
    return NextResponse.json([], { status: 404 });
  }

  // בדיקה אם למשתמש יש הרשאה לצפות בהקלטות
  const storagePermission = await canStoreRecordings(user.id);

  if (!storagePermission.allowed) {
    console.warn(`⚠️ User ${user.id} tried to access recordings without active subscription`);
    return NextResponse.json([], { status: 403 }); // רשימה ריקה - אין הרשאה
  }

  console.log(`✅ User ${user.id} has permission to view recordings (${storagePermission.retentionDays} days retention)`);

  const start = new Date(`${date}T00:00:00`).toISOString();
  const end = new Date(`${date}T23:59:59`).toISOString();

  // בדיקה שהתאריך המבוקש בטווח ימי השמירה
  const requestedDate = new Date(date);
  const now = new Date();
  const daysAgo = Math.floor((now.getTime() - requestedDate.getTime()) / (1000 * 60 * 60 * 24));

  if (daysAgo > storagePermission.retentionDays) {
    console.warn(`⚠️ Requested date ${date} is beyond retention period (${storagePermission.retentionDays} days)`);
    return NextResponse.json([]); // תאריך ישן מדי
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

import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

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

  const start = new Date(`${date}T00:00:00`).toISOString();
  const end = new Date(`${date}T23:59:59`).toISOString();

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

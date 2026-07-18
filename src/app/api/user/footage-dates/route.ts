import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { apiHandler } from "@/lib/api-handler";
import { format } from 'date-fns';

export const dynamic = 'force-dynamic';

export const GET = apiHandler(async (req) => {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const cameraId = url.searchParams.get('cameraId');

  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('vod_files')
    .select('timestamp')
    .eq('camera_id', cameraId);

  if (error) {
    return Response.json({ success: false, error: error.message });
  }

  // Convert all timestamps to `yyyy-MM-dd` date strings
  const dates = data.map((clip) =>
    format(new Date(clip.timestamp), 'yyyy-MM-dd')
  );

  // Keep only unique dates
  const uniqueDates = [...new Set(dates)];

  return NextResponse.json({ success: true, dates: uniqueDates });
});

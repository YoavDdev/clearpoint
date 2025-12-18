import { createClient } from '@supabase/supabase-js';
import { format } from 'date-fns';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const cameraId = url.searchParams.get('cameraId');

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

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

  return Response.json({ success: true, dates: uniqueDates });
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const cameraId = req.nextUrl.searchParams.get('cameraId');

  if (!cameraId) {
    return NextResponse.json({ success: false, error: 'Missing cameraId' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('vod_files')
    .select('timestamp')
    .eq('camera_id', cameraId);

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  // Normalize timestamps into unique date strings
  const dates = Array.from(
    new Set(
      data.map((clip) => new Date(clip.timestamp).toISOString().split('T')[0])
    )
  );

  return NextResponse.json({ success: true, dates });
}

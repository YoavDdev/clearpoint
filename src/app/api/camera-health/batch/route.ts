import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

type Body = {
  cameraIds?: string[];
};

export async function POST(request: Request) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const cameraIds = Array.isArray(body.cameraIds) ? body.cameraIds.filter(Boolean) : [];
  if (!cameraIds.length) {
    return NextResponse.json({ success: true, healthByCameraId: {} });
  }

  if (cameraIds.length > 2000) {
    return NextResponse.json(
      { success: false, error: 'Too many cameraIds (max 2000)' },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from('camera_health')
    .select('*')
    .in('camera_id', cameraIds);

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  const healthByCameraId: Record<string, any> = {};
  for (const row of data || []) {
    if (row?.camera_id) healthByCameraId[row.camera_id] = row;
  }

  return NextResponse.json({ success: true, healthByCameraId });
}

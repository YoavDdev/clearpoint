import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { createClient } from '@supabase/supabase-js';
import { generateCameraScript } from '../../../../scripts/utils/generateCameraScript';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
  }

  const {
    name,
    serialNumber,
    userId,
    userEmail,
    streamPath,
    isStreamActive,
  } = await req.json();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase.from('cameras').insert([
    {
      name,
      serial_number: serialNumber,
      user_id: userId,
      user_email: userEmail,
      stream_path: streamPath,
      is_stream_active: isStreamActive,
    },
  ]).select().single();

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  // ✅ Create .sh script for new camera
  try {
    const scriptPath = generateCameraScript(userId, data.id, streamPath);
    console.log(`✅ Camera script created at: ${scriptPath}`);
  } catch (err: any) {
    console.error('❌ Failed to generate script:', err.message || err);
  }

  return NextResponse.json({ success: true, camera: data });
}

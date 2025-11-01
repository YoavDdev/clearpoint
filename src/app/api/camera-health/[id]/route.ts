import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // Get the latest health record for this camera
    const { data: health, error } = await supabaseAdmin
      .from('camera_health')
      .select('*')
      .eq('camera_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching camera health:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // If no health data exists, return success: false
    // This tells admin panel the camera has never reported
    if (!health) {
      return NextResponse.json({ 
        success: false, 
        health: null,
        error: 'No health data found for this camera'
      });
    }

    return NextResponse.json({ 
      success: true, 
      health: health 
    });
  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

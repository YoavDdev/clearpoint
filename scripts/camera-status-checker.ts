// scripts/camera-status-checker.ts
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkCameras() {
  const { data: cameras, error } = await supabase.from('cameras').select('id');

  if (error || !cameras) {
    console.error('❌ Failed to fetch cameras:', error);
    return;
  }

  for (const camera of cameras) {
    const streamURL = `http://localhost:8888/${camera.id}/index.m3u8`;

    try {
      const res = await fetch(streamURL);

      if (res.ok) {
        await supabase
          .from('cameras')
          .update({
            is_stream_active: true,
            last_seen_at: new Date().toISOString(),
          })
          .eq('id', camera.id);

        console.log(`✅ Camera ${camera.id} is ONLINE`);
      } else {
        throw new Error(`Non-200 response: ${res.status}`);
      }
    } catch (err) {
      await supabase
        .from('cameras')
        .update({ is_stream_active: false })
        .eq('id', camera.id);

      console.log(`❌ Camera ${camera.id} is OFFLINE`);
    }
  }
}

checkCameras();
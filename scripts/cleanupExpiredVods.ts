import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import axios from 'axios';
dotenv.config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function deleteFromB2(fileName: string, fileId: string) {
  try {
    const credentials = Buffer.from(`${process.env.B2_ACCOUNT_ID}:${process.env.B2_APP_KEY}`).toString('base64');
    const authRes = await axios.get('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
      headers: { Authorization: `Basic ${credentials}` }
    });
    const apiUrl = authRes.data.apiUrl;
    const authToken = authRes.data.authorizationToken;

    await axios.post(`${apiUrl}/b2api/v2/b2_delete_file_version`, {
      fileName,
      fileId,
    }, {
      headers: { Authorization: authToken }
    });

    console.log(`🧹 Deleted from B2: ${fileName}`);
  } catch (err: any) {
    console.error(`❌ Failed to delete from B2: ${fileName}`, err.message || err);
  }
}

async function cleanupExpiredVods() {
  // Fetch all videos with user retention info
  const { data: vods, error: vodError } = await supabase.from('vod_files').select('id, url, timestamp, user_email, file_id');
  if (vodError) {
    console.error('❌ Failed to fetch vod_files:', vodError.message);
    return;
  }

  const { data: users, error: userError } = await supabase.from('users').select('email, plan_duration_days');
  if (userError) {
    console.error('❌ Failed to fetch users:', userError.message);
    return;
  }

  // Map user email to retention days (7 or 14)
  const userRetentionMap: Record<string, number> = {};
  users.forEach(u => {
    if (u.email && u.plan_duration_days) {
      userRetentionMap[u.email] = u.plan_duration_days;
    }
  });

  const now = Date.now();

  for (const vod of vods) {
    const retention = userRetentionMap[vod.user_email];
    if (!retention) {
      console.log(`⚠️ Skipping VOD with unknown user or retention: ${vod.id}`);
      continue;
    }

    const vodTime = new Date(vod.timestamp).getTime();
    const ageInDays = (now - vodTime) / 86400000;

    if (ageInDays > retention && vod.file_id) {
      const url = new URL(vod.url);
      const pathOnly = url.pathname.replace(/^\//, '');

      await deleteFromB2(pathOnly, vod.file_id);
      await supabase.from('vod_files').delete().eq('id', vod.id);
      console.log(`🧺 Removed Supabase record for VOD ID: ${vod.id}`);
    }
  }
}

cleanupExpiredVods();

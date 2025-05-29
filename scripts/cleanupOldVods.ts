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

    const { apiUrl, authorizationToken } = authRes.data;

    await axios.post(`${apiUrl}/b2api/v2/b2_delete_file_version`, {
      fileName,
      fileId,
    }, {
      headers: { Authorization: authorizationToken }
    });

    console.log(`🧹 Deleted from B2: ${fileName}`);
  } catch (err: any) {
    console.error(`❌ Failed to delete from B2: ${fileName}`, err.message || err);
  }
}

async function cleanupExpiredVods() {
  const { data: vods, error: vodError } = await supabase
    .from('vod_files')
    .select('id, url, timestamp, user_id, file_id');

  if (vodError) {
    console.error('❌ Failed to fetch vod_files:', vodError.message);
    return;
  }

  const { data: users, error: userError } = await supabase
    .from('users')
    .select('id, plan_duration_days');

  if (userError) {
    console.error('❌ Failed to fetch users:', userError.message);
    return;
  }

  const retentionMap: Record<string, number> = {};
  users.forEach(u => {
    if (u.id && u.plan_duration_days) {
      retentionMap[u.id] = u.plan_duration_days;
    }
  });

  const now = Date.now();

  for (const vod of vods) {
    const retention = retentionMap[vod.user_id];
    if (!retention) {
      console.warn(`⚠️ Skipping: Unknown retention for user ${vod.user_id}`);
      continue;
    }

    const vodDate = new Date(vod.timestamp);
    const ageInDays = (now - vodDate.getTime()) / 86400000;

    if (ageInDays > retention) {
      try {
        const urlPath = new URL(vod.url).pathname.replace(/^\//, '');
        await deleteFromB2(urlPath, vod.file_id);
        await supabase.from('vod_files').delete().eq('id', vod.id);
        console.log(`🧺 Cleaned up expired VOD ID: ${vod.id}`);
      } catch (err) {
        console.error(`❌ Error cleaning VOD ID ${vod.id}:`, err);
      }
    }
  }
}

cleanupExpiredVods();

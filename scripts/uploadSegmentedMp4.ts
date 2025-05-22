import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import crypto from 'crypto';
dotenv.config();

const TEST_MODE = false;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BUNNY_TOKEN_KEY = '7d50c21c-f068-4da0-a518-b214db713b3f';
const BUNNY_CDN_BASE = 'https://clearpoint-cdn.b-cdn.net';

function generateSignedBunnyUrl(filePath: string, expiresInSeconds = 1209600): string {
  const normalizedPath = filePath.startsWith('/') ? filePath : `/${filePath}`;
  const expires = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const signatureBase = BUNNY_TOKEN_KEY + normalizedPath + expires;
  const token = crypto.createHash('sha256').update(signatureBase).digest('hex');
  return `${BUNNY_CDN_BASE}${normalizedPath}?token=${token}&expires=${expires}`;
}

async function getB2Auth() {
  const credentials = Buffer.from(`${process.env.B2_ACCOUNT_ID}:${process.env.B2_APP_KEY}`).toString('base64');
  const res = await axios.get('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
    headers: { Authorization: `Basic ${credentials}` }
  });
  return res.data;
}

async function getUploadUrl(apiUrl: string, authToken: string, bucketId: string) {
  const res = await axios.post(`${apiUrl}/b2api/v2/b2_get_upload_url`, { bucketId }, {
    headers: { Authorization: authToken }
  });
  return res.data;
}

async function uploadToB2(filePath: string, b2Key: string) {
  const auth = await getB2Auth();
  const upload = await getUploadUrl(auth.apiUrl, auth.authorizationToken, process.env.B2_BUCKET_ID!);

  const fileBuffer = fs.readFileSync(filePath);
  const sha1 = crypto.createHash('sha1').update(fileBuffer).digest('hex');

  const response = await axios.post(upload.uploadUrl, fileBuffer, {
    headers: {
      Authorization: upload.authorizationToken,
      'X-Bz-File-Name': encodeURIComponent(b2Key),
      'Content-Type': 'video/mp4',
      'Content-Length': fileBuffer.length,
      'X-Bz-Content-Sha1': sha1,
    }
  });

  return {
    filePath: `/${b2Key}`,
    fileId: response.data.fileId,
  };
}

async function logToSupabase(userEmail: string, cameraId: string, url: string, fileId: string, timestamp: string, duration = 900) {
  if (TEST_MODE) {
    console.log(`🧪 [TEST] Would log to Supabase for ${userEmail}: ${url}`);
    return;
  }
  const { error } = await supabase.from('vod_files').insert([{ user_email: userEmail, camera_id: cameraId, url, file_id: fileId, timestamp, duration }]);
  if (error) {
    console.error(`❌ Supabase insert error:`, error.message);
  } else {
    console.log(`✅ Logged to Supabase: ${url}`);
  }
}

async function processSegments() {
  const rootPath = './recordings';
  const users = fs.existsSync(rootPath) ? fs.readdirSync(rootPath) : [];

  const { data: userRows } = await supabase.from('users').select('id, email, plan_type, plan_duration_days');
  const userMap: Record<string, { email: string; plan_type: string; retention: number }> = {};
  userRows?.forEach((u) => {
    if (u.id && u.email && u.plan_type && u.plan_duration_days) {
      userMap[u.id] = {
        email: u.email,
        plan_type: u.plan_type,
        retention: u.plan_duration_days
      };
    }
  });

  for (const userId of users) {
    const user = userMap[userId];
    if (!user) {
      console.warn(`⚠️ Skipping unknown userId: ${userId}`);
      continue;
    }

    const userPath = path.join(rootPath, userId);
    const cameras = fs.readdirSync(userPath);

    for (const cameraId of cameras) {
      const cameraPath = path.join(userPath, cameraId);
      const files = fs.readdirSync(cameraPath).filter(f => f.endsWith('.mp4'));

      for (const file of files) {
        const filePath = path.join(cameraPath, file);

        const stats = fs.statSync(filePath);
        const modifiedAgo = (Date.now() - stats.mtime.getTime()) / 1000;
        const ageInDays = modifiedAgo / 86400;

        if (ageInDays > user.retention) {
          if (TEST_MODE) {
            console.log(`🧪 [TEST] Would delete expired file: ${file}`);
          } else {
            fs.unlinkSync(filePath);
            console.log(`🧹 Deleted expired file for ${user.plan_type}: ${file}`);
          }
          continue;
        }

        if (modifiedAgo < 60) {
          console.log(`⏳ Skipping (still writing): ${file}`);
          continue;
        }

        if (user.plan_type === 'local') {
          console.log(`🟤 Skipping upload for Plan C (local): ${file}`);
          continue;
        }

        const match = file.match(/(\d{4}-\d{2}-\d{2})_(\d{2}-\d{2}-\d{2})/);
        if (!match) {
          console.warn(`⚠️ Skipping unrecognized filename: ${file}`);
          continue;
        }

        const [_, date, time] = match;
        const timestamp = new Date(`${date}T${time.replace(/-/g, ':')}`).toISOString();
        const b2Key = `${userId}/${cameraId}/${file}`;

        if (TEST_MODE) {
          console.log(`🧪 [TEST] Would upload & log: ${file}`);
          continue;
        }

        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const { filePath: fullPath, fileId } = await uploadToB2(filePath, b2Key);
            const signedUrl = generateSignedBunnyUrl(fullPath, 1209600);
            await logToSupabase(user.email, cameraId, signedUrl, fileId, timestamp);
            fs.unlinkSync(filePath);
            console.log(`✅ Uploaded: ${file}`);
            break;
          } catch (err: any) {
            if (attempt === 2) {
              console.error(`❌ Failed after 3 attempts: ${file}:`, err.message || err);
            } else {
              console.warn(`⏳ Retrying upload for ${file} (attempt ${attempt + 2}/3)...`);
              await new Promise((r) => setTimeout(r, 2000));
            }
          }
        }
      }
    }
  }
}

processSegments();

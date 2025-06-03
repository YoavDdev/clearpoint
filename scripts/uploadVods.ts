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

async function logToSupabase(userId: string, userEmail: string, cameraId: string, url: string, fileId: string, timestamp: string, duration = 900) {
  if (!userId || !cameraId || !url || !fileId || !timestamp) {
    console.warn(`⚠️ Skipping logToSupabase: missing data`, { userId, cameraId, url });
    return;
  }

  if (TEST_MODE) {
    console.log(`🧪 [TEST] Would log to Supabase for ${userEmail}: ${url}`);
    return;
  }

  const { error } = await supabase.from('vod_files').insert([{
    user_id: userId,
    user_email: userEmail,
    camera_id: cameraId,
    url,
    file_id: fileId,
    timestamp,
    duration
  }]);

  if (error) {
    console.error(`❌ Supabase insert error:`, error.message);
  } else {
    console.log(`✅ Logged to Supabase: ${url}`);
  }
}

async function processSegments() {
  console.log("🚀 Starting VOD upload script...");
  const rootPath = path.resolve(process.env.HOME || '', 'clearpoint-recordings');
  const folders = fs.existsSync(rootPath) ? fs.readdirSync(rootPath).filter(f => f !== '.DS_Store') : [];

  for (const userFolder of folders) {
    const userPath = path.join(rootPath, userFolder, 'footage');
    if (!fs.existsSync(userPath)) continue;

    const cameras = fs.readdirSync(userPath).filter(name => {
      const fullPath = path.join(userPath, name);
      return fs.statSync(fullPath).isDirectory();
    });

    for (const cameraId of cameras) {
      const cameraPath = path.join(userPath, cameraId);
      const files = fs.readdirSync(cameraPath).filter(f => f.endsWith('.mp4'));
      console.log(`📸 Camera ${cameraId} – ${files.length} files`);

      // Fetch user info from camera table
      const { data: cameraRow, error: cameraErr } = await supabase
        .from('cameras')
        .select('user_id, user_email')
        .eq('id', cameraId)
        .single();

      if (cameraErr || !cameraRow?.user_id) {
        console.warn(`⚠️ Skipping: can't find user for camera ${cameraId}`);
        continue;
      }

      const userId = cameraRow.user_id;
      const userEmail = cameraRow.user_email || 'unknown@clearpoint.local';

      for (const file of files) {
        const filePath = path.join(cameraPath, file);
        const stats = fs.statSync(filePath);
        const modifiedAgo = (Date.now() - stats.mtime.getTime()) / 1000;
        const ageInDays = modifiedAgo / 86400;

        if (modifiedAgo < 60) {
          console.log(`⏳ Skipping (still writing): ${file}`);
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

        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const { filePath: fullPath, fileId } = await uploadToB2(filePath, b2Key);
            const signedUrl = generateSignedBunnyUrl(fullPath);
            await logToSupabase(userId, userEmail, cameraId, signedUrl, fileId, timestamp);
            fs.unlinkSync(filePath);
            console.log(`✅ Uploaded: ${file}`);
            break;
          } catch (err: any) {
            if (attempt === 2) {
              console.error(`❌ Failed after 3 attempts: ${file}:`, err.message || err);
            } else {
              console.warn(`⏳ Retrying upload for ${file} (attempt ${attempt + 2}/3)...`);
              await new Promise(r => setTimeout(r, 2000));
            }
          }
        }
      }
    }
  }
}

processSegments().catch(err => console.error("💥 Script error:", err));

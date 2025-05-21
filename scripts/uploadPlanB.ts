// 🔼 1. IMPORTS AT THE TOP
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import mime from 'mime-types';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

// 🔐 2. SUPABASE CLIENT INIT
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 📦 3. INSERT THIS HERE ⬇️ — Backblaze helper functions
async function getB2Auth() {
  const credentials = Buffer.from(`${process.env.B2_ACCOUNT_ID}:${process.env.B2_APP_KEY}`).toString('base64');

  const res = await axios.get('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
    headers: {
      Authorization: `Basic ${credentials}`
    }
  });

  return res.data;
}

async function getUploadUrl(apiUrl: string, authToken: string, bucketId: string) {
  const res = await axios.post(`${apiUrl}/b2api/v2/b2_get_upload_url`, {
    bucketId: bucketId
  }, {
    headers: {
      Authorization: authToken
    }
  });

  return res.data;
}

async function uploadToB2(filePath: string, b2Key: string) {
  const auth = await getB2Auth();
  const upload = await getUploadUrl(auth.apiUrl, auth.authorizationToken, process.env.B2_BUCKET_ID!);

  const fileBuffer = fs.readFileSync(filePath);
  const sha1 = require('crypto').createHash('sha1').update(fileBuffer).digest('hex');

  await axios.post(upload.uploadUrl, fileBuffer, {
    headers: {
      Authorization: upload.authorizationToken,
      'X-Bz-File-Name': encodeURIComponent(b2Key),
      'Content-Type': 'b2/x-auto',
      'Content-Length': fileBuffer.length,
      'X-Bz-Content-Sha1': sha1,
    }
  });

  return `${auth.downloadUrl}/file/${process.env.B2_BUCKET}/${b2Key}`;
}

// 🧾 4. Log to Supabase
async function logToSupabase(url: string, timestamp: string, duration: number = 10) {
  await supabase.from('vod_files').insert({
    user_id: process.env.USER_ID,
    camera_id: process.env.CAMERA_ID,
    url,
    timestamp,
    duration,
  });
}

// 🔄 5. Main script
async function processFiles() {
  const basePath = path.join('recordings', process.env.CAMERA_ID!);
  if (!fs.existsSync(basePath)) return console.log('No recordings folder found.');

  const dates = fs.readdirSync(basePath);

  for (const date of dates) {
    const dir = path.join(basePath, date);
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.ts'));

    for (const file of files) {
      const filePath = path.join(dir, file);
      const timePart = file.replace('.ts', '').replace(/-/g, ':');
      const timestamp = `${date}T${timePart}:00Z`;
      const b2Key = `${process.env.USER_ID}/${process.env.CAMERA_ID}/${date}/${file}`;

      try {
        const url = await uploadToB2(filePath, b2Key);
        await logToSupabase(url, timestamp);
        fs.unlinkSync(filePath);
        console.log(`✅ Uploaded and logged: ${file}`);
      } catch (err: any) {
        console.error(`❌ Failed for ${file}:`, err.message || err);
      }
    }
  }
}

// ▶️ 6. Run it
processFiles();

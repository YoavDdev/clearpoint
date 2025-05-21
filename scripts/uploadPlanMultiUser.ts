'use client';

import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

// Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Backblaze B2: Auth & Upload
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

// Supabase Logging
async function logToSupabase(userEmail: string, cameraId: string, url: string, timestamp: string, duration = 10) {
  const { error } = await supabase
    .from('vod_files')
    .insert([
      {
        user_email: userEmail,
        camera_id: cameraId,
        url,
        timestamp,
        duration,
      },
    ]);

  if (error) {
    console.error(`❌ Supabase insert error:`, error.message);
  } else {
    console.log(`✅ Logged to Supabase: ${url}`);
  }
}

// Process All Recordings: users → cameras → dates → files
async function processAllRecordings() {
  const rootPath = './recordings';
  const users = fs.existsSync(rootPath) ? fs.readdirSync(rootPath) : [];

  // Load userId → email map
  const { data: userRows } = await supabase
    .from('users')
    .select('id, email');

  const userMap: Record<string, string> = {};
  userRows?.forEach((u) => {
    if (u.id && u.email) userMap[u.id] = u.email;
  });

  for (const userId of users) {
    const userEmail = userMap[userId];
    if (!userEmail) {
      console.warn(`⚠️ No email found for userId ${userId}, skipping`);
      continue;
    }

    const userPath = path.join(rootPath, userId);
    const cameras = fs.readdirSync(userPath);

    for (const cameraId of cameras) {
      const cameraPath = path.join(userPath, cameraId);
      const dates = fs.readdirSync(cameraPath);

      for (const date of dates) {
        const datePath = path.join(cameraPath, date);
        const files = fs.readdirSync(datePath).filter(f => f.endsWith('.ts'));

        for (const file of files) {
          const filePath = path.join(datePath, file);
          const timePart = file.replace('.ts', '');
          const timestamp = new Date(`${date}T${timePart.replace(/-/g, ':')}`).toISOString();

          const b2Key = `${userId}/${cameraId}/${date}/${file}`;

          try {
            const url = await uploadToB2(filePath, b2Key);
            await logToSupabase(userEmail, cameraId, url, timestamp);
            fs.unlinkSync(filePath);
            console.log(`✅ Uploaded: ${file} (User: ${userId}, Camera: ${cameraId})`);
          } catch (err: any) {
            console.error(`❌ Failed for ${file}:`, err.message || err);
          }
        }
      }
    }
  }
}

processAllRecordings();

import fs from 'fs';
import path from 'path';
import axios from 'axios';
import dotenv from 'dotenv';
import crypto from 'crypto';
import chokidar from 'chokidar';

dotenv.config();

const LOCAL_LIVE_PATH = process.env.LOCAL_LIVE_PATH || '/home/pi/clearpoint-recordings';
const B2_ACCOUNT_ID = process.env.B2_ACCOUNT_ID!;
const B2_APP_KEY = process.env.B2_APP_KEY!;
const B2_BUCKET_ID = process.env.B2_BUCKET_ID!;
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
  const credentials = Buffer.from(`${B2_ACCOUNT_ID}:${B2_APP_KEY}`).toString('base64');
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

async function uploadFile(filePath: string, b2Key: string) {
  const auth = await getB2Auth();
  const upload = await getUploadUrl(auth.apiUrl, auth.authorizationToken, B2_BUCKET_ID);

  const fileBuffer = fs.readFileSync(filePath);
  const sha1 = crypto.createHash('sha1').update(fileBuffer).digest('hex');
  const isM3U8 = path.extname(filePath) === '.m3u8';
  const contentType = isM3U8 ? 'application/vnd.apple.mpegurl' : 'video/MP2T';

  const headers: any = {
    Authorization: upload.authorizationToken,
    'X-Bz-File-Name': encodeURIComponent(b2Key),
    'Content-Type': contentType,
    'Content-Length': fileBuffer.length,
    'X-Bz-Content-Sha1': sha1,
  };

  if (isM3U8) {
    headers['Cache-Control'] = 'no-cache';
  }

  const response = await axios.post(upload.uploadUrl, fileBuffer, { headers });
  console.log(`✅ Uploaded to B2: ${b2Key}`);
}

function watchLiveHLS() {
  const watchPath = path.resolve(LOCAL_LIVE_PATH);

  const watcher = chokidar.watch(watchPath, {
    ignored: /(^|[\/])\../,
    persistent: true,
    ignoreInitial: false,
    awaitWriteFinish: true,
    depth: 5,
  });

  const handleUpload = async (filePath: string) => {
    if (!filePath.endsWith('.ts') && !filePath.endsWith('.m3u8')) return;
    const relativeKey = path.relative(LOCAL_LIVE_PATH, filePath);
    try {
      await uploadFile(filePath, relativeKey);
    } catch (err: any) {
      if (err.response) {
        console.error(`❌ Upload failed: ${relativeKey}`, err.response.status, err.response.data);
      } else {
        console.error(`❌ Upload error: ${relativeKey}`, err.message || err);
      }
    }
  };

  watcher.on('add', handleUpload);
  watcher.on('change', handleUpload);

  console.log(`📡 Watching: ${watchPath} for .ts/.m3u8 files...`);
}

watchLiveHLS();

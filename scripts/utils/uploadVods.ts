import fs from 'fs';
import path from 'path';
import axios from 'axios';
import dotenv from 'dotenv';
import crypto from 'crypto';
dotenv.config();

const TEST_MODE = false;

const API_BASE = (process.env.CLEARPOINT_API_BASE || process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '');
const DEVICE_TOKEN = (process.env.CLEARPOINT_DEVICE_TOKEN || '').trim();

const UPLOAD_CONCURRENCY = Math.max(1, Number(process.env.UPLOAD_CONCURRENCY || 1));
const MAX_FILES_PER_CAMERA = Math.max(0, Number(process.env.MAX_FILES_PER_CAMERA || 0));

if (!API_BASE) {
  throw new Error('Missing CLEARPOINT_API_BASE (or NEXT_PUBLIC_SITE_URL) env var');
}

if (!DEVICE_TOKEN) {
  throw new Error('Missing CLEARPOINT_DEVICE_TOKEN env var');
}

const BUNNY_TOKEN_KEY = '7d50c21c-f068-4da0-a518-b214db713b3f';
const BUNNY_CDN_BASE = 'https://clearpoint-cdn.b-cdn.net';

const LOCK_FILE_PATH = process.env.UPLOAD_LOCK_FILE || '/tmp/clearpoint-uploadVods.lock';

function isPidRunning(pid: number) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function acquireLockOrExit() {
  try {
    const fd = fs.openSync(LOCK_FILE_PATH, 'wx');
    fs.writeFileSync(fd, String(process.pid), { encoding: 'utf8' });
    fs.closeSync(fd);
  } catch (err: any) {
    if (err?.code !== 'EEXIST') throw err;

    try {
      const existing = fs.readFileSync(LOCK_FILE_PATH, 'utf8').trim();
      const pid = Number(existing);
      if (Number.isFinite(pid) && pid > 1 && isPidRunning(pid)) {
        console.error(`❌ Another uploadVods.ts process is already running (pid=${pid}). Exiting.`);
        process.exit(0);
      }
      fs.unlinkSync(LOCK_FILE_PATH);
      return acquireLockOrExit();
    } catch {
      console.error('❌ uploadVods.ts lock exists but could not be validated/removed. Exiting.');
      process.exit(1);
    }
  }

  const cleanup = () => {
    try {
      fs.unlinkSync(LOCK_FILE_PATH);
    } catch {}
  };

  process.on('exit', cleanup);
  process.on('SIGINT', () => {
    cleanup();
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    cleanup();
    process.exit(0);
  });
}

function generateSignedBunnyUrl(filePath: string, expiresInSeconds = 1209600): string {
  const normalizedPath = filePath.startsWith('/') ? filePath : `/${filePath}`;
  const expires = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const signatureBase = BUNNY_TOKEN_KEY + normalizedPath + expires;
  const token = crypto.createHash('sha256').update(signatureBase).digest('hex');
  return `${BUNNY_CDN_BASE}${normalizedPath}?token=${token}&expires=${expires}`;
}

async function retryWithBackoff<T>(fn: () => Promise<T>, retries = 5, delay = 1000): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      const status = err?.response?.status;
      if ((status === 429 || status === 503) && i < retries - 1) {
        const retryAfter = parseInt(err?.response?.headers['retry-after']) || delay;
        const waitTime = retryAfter * Math.pow(2, i);
        console.warn(`⚠️ B2 rate limit (HTTP ${status}). Waiting ${waitTime}ms before retry #${i + 1}...`);
        await new Promise(res => setTimeout(res, waitTime));
      } else {
        throw err;
      }
    }
  }
  throw new Error("Max retries exceeded for Backblaze B2 upload");
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

type VodContext = {
  allowed: boolean;
  user_id: string | null;
  user_email: string | null;
  reason?: string;
};

async function getVodContext(cameraId: string): Promise<VodContext> {
  const res = await axios.post(
    `${API_BASE}/api/ingest/vod-context`,
    { camera_id: cameraId },
    {
      headers: {
        'Content-Type': 'application/json',
        'x-clearpoint-device-token': DEVICE_TOKEN,
      },
      timeout: 30_000,
    }
  );

  return res.data as VodContext;
}

async function logVodFile(params: {
  camera_id: string;
  url: string;
  file_id: string;
  object_key?: string;
  timestamp: string;
  duration?: number;
}) {
  if (!params.camera_id || !params.url || !params.file_id || !params.timestamp) {
    console.warn(`⚠️ Skipping logVodFile: missing data`, params);
    return;
  }

  if (TEST_MODE) {
    console.log(`🧪 [TEST] Would log VOD via API: ${params.url}`);
    return;
  }

  const res = await axios.post(
    `${API_BASE}/api/ingest/vod-file`,
    {
      camera_id: params.camera_id,
      url: params.url,
      file_id: params.file_id,
      object_key: params.object_key,
      timestamp: params.timestamp,
      duration: params.duration ?? 900,
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'x-clearpoint-device-token': DEVICE_TOKEN,
      },
      timeout: 30_000,
    }
  );

  if (!res.data?.success) {
    throw new Error(res.data?.error || 'Unknown ingest error');
  }
}

async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T, workerId: number) => Promise<void>
) {
  const queue = [...items];
  const runners = Array.from({ length: Math.max(1, concurrency) }, async (_, workerId) => {
    while (queue.length > 0) {
      const item = queue.shift();
      if (item === undefined) return;
      await worker(item, workerId);
    }
  });
  await Promise.all(runners);
}

async function processSegments() {
  acquireLockOrExit();
  console.log("🚀 Starting VOD upload script...");
  const rootPath = path.resolve(process.env.HOME || '', 'clearpoint-recordings');
  const folders = fs.existsSync(rootPath) ? fs.readdirSync(rootPath).filter(f => f !== '.DS_Store') : [];

  const auth = await getB2Auth(); // ✅ Only once

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

      let vodContext: VodContext;
      try {
        vodContext = await getVodContext(cameraId);
      } catch (err: any) {
        console.error(`❌ Failed to fetch VOD context for camera ${cameraId}:`, err?.message || err);
        continue;
      }

      if (!vodContext.allowed || !vodContext.user_id) {
        console.log(`⏸️ Camera ${cameraId} not allowed for VOD upload - cleaning local files`);
        for (const file of files) {
          const filePath = path.join(cameraPath, file);
          try {
            fs.unlinkSync(filePath);
            console.log(`🗑️ Deleted local file: ${file}`);
          } catch (err) {
            console.error(`❌ Failed to delete ${file}:`, err);
          }
        }
        continue;
      }

      const userId = vodContext.user_id;
      const userEmail = vodContext.user_email || 'unknown@clearpoint.local';

      const filesToProcess = MAX_FILES_PER_CAMERA > 0 ? files.slice(0, MAX_FILES_PER_CAMERA) : files;

      const uploadSessions: Array<{ uploadUrl: string; authorizationToken: string } | null> = Array.from(
        { length: Math.max(1, UPLOAD_CONCURRENCY) },
        () => null
      );

      await runWithConcurrency(filesToProcess, UPLOAD_CONCURRENCY, async (file, workerId) => {
        const filePath = path.join(cameraPath, file);
        if (!fs.existsSync(filePath)) {
          console.warn(`⚠️ File disappeared before processing, skipping: ${file}`);
          return;
        }

        let stats: fs.Stats;
        try {
          stats = fs.statSync(filePath);
        } catch (err: any) {
          if (err?.code === 'ENOENT') {
            console.warn(`⚠️ File disappeared during stat, skipping: ${file}`);
            return;
          }
          throw err;
        }

        const modifiedAgo = (Date.now() - stats.mtime.getTime()) / 1000;

        if (modifiedAgo < 60) {
          console.log(`⏳ Skipping (still writing): ${file}`);
          return;
        }

        const match = file.match(/(\d{4}-\d{2}-\d{2})_(\d{2}-\d{2}-\d{2})/);
        if (!match) {
          console.warn(`⚠️ Skipping unrecognized filename: ${file}`);
          return;
        }

        const [_, date, time] = match;
        const timestamp = new Date(`${date}T${time.replace(/-/g, ':')}`).toISOString();
        const b2Key = `${userId}/${cameraId}/${file}`;

        let fileBuffer: Buffer;
        try {
          fileBuffer = fs.readFileSync(filePath);
        } catch (err: any) {
          if (err?.code === 'ENOENT') {
            console.warn(`⚠️ File disappeared during read, skipping: ${file}`);
            return;
          }
          throw err;
        }

        const sha1 = crypto.createHash('sha1').update(fileBuffer).digest('hex');

        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            if (!uploadSessions[workerId]) {
              uploadSessions[workerId] = await getUploadUrl(
                auth.apiUrl,
                auth.authorizationToken,
                process.env.B2_BUCKET_ID!
              );
            }

            const session = uploadSessions[workerId]!;

            const uploadCall = () =>
              axios.post(session.uploadUrl, fileBuffer, {
                headers: {
                  Authorization: session.authorizationToken,
                  'X-Bz-File-Name': encodeURIComponent(b2Key),
                  'Content-Type': 'video/mp4',
                  'Content-Length': fileBuffer.length,
                  'X-Bz-Content-Sha1': sha1,
                },
              });

            const response = await retryWithBackoff(uploadCall);
            const fullPath = `/${b2Key}`;
            const fileId = response.data.fileId;
            const signedUrl = generateSignedBunnyUrl(fullPath);

            await logVodFile({
              camera_id: cameraId,
              url: signedUrl,
              file_id: fileId,
              object_key: b2Key,
              timestamp,
              duration: 900,
            });

            try {
              fs.unlinkSync(filePath);
            } catch (err: any) {
              if (err?.code !== 'ENOENT') {
                throw err;
              }
              console.warn(`⚠️ File already deleted after upload: ${file}`);
            }
            console.log(`✅ Uploaded: ${file}`);
            return;
          } catch (err: any) {
            const status = err?.response?.status;
            if (status === 400 || status === 401 || status === 403) {
              uploadSessions[workerId] = null;
            }

            if (attempt === 2) {
              console.error(`❌ Failed after 3 attempts: ${file}:`, err.message || err);
            } else {
              console.warn(`⏳ Retrying upload for ${file} (attempt ${attempt + 2}/3)...`);
              await new Promise(r => setTimeout(r, 2000));
            }
          }
        }
      });
    }
  }
}

processSegments().catch(err => console.error("💥 Script error:", err));

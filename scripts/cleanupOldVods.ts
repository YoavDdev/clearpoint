// cleanupOldVods.ts
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import axios from 'axios';
dotenv.config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ---------- helpers ----------
function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function utcMidnight(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

async function b2Authorize() {
  const credentials = Buffer.from(
    `${process.env.B2_ACCOUNT_ID}:${process.env.B2_APP_KEY}`
  ).toString('base64');

  const authRes = await axios.get(
    'https://api.backblazeb2.com/b2api/v2/b2_authorize_account',
    { headers: { Authorization: `Basic ${credentials}` } }
  );

  return { apiUrl: authRes.data.apiUrl, token: authRes.data.authorizationToken };
}

async function deleteFromB2(fileName: string, fileId?: string | null): Promise<void> {
  try {
    const { apiUrl, token } = await b2Authorize();

    // Resolve fileId if missing (prevents “stuck” rows)
    if (!fileId) {
      const list = await axios.post(
        `${apiUrl}/b2api/v2/b2_list_file_names`,
        { bucketId: process.env.B2_BUCKET_ID, startFileName: fileName, maxFileCount: 1 },
        { headers: { Authorization: token } }
      );
      const match = list.data?.files?.find((f: any) => f.fileName === fileName);
      fileId = match?.fileId;
      if (!fileId) {
        console.warn(`Skip delete (no fileId found) for ${fileName}`);
        return;
      }
    }

    await axios.post(
      `${apiUrl}/b2api/v2/b2_delete_file_version`,
      { fileName, fileId },
      { headers: { Authorization: token } }
    );

    console.log(`Deleted from B2: ${fileName}`);
  } catch (err: any) {
    console.error(`Failed to delete from B2: ${fileName}`, err?.message ?? err);
  }
}

// ---------- main ----------
async function cleanupExpiredVods() {
  console.time('Cleanup time');

  // 1) Build effective retention per user: COALESCE(user.plan_duration_days, plan.retention_days)
  const [{ data: users, error: userErr }, { data: plans, error: planErr }] = await Promise.all([
    supabase.from('users').select('id, plan_id, plan_duration_days'),
    supabase.from('plans').select('id, retention_days'),
  ]);

  if (userErr) { console.error('Failed to fetch users:', userErr.message); return; }
  if (planErr) { console.error('Failed to fetch plans:', planErr.message); return; }

  const planById = new Map<string, number>();
  for (const p of plans ?? []) {
    const v = Number(p?.retention_days);
    if (p?.id && Number.isFinite(v)) planById.set(p.id, v);
  }

  const retentionByUser: Record<string, number> = {};
  for (const u of users ?? []) {
    const uDays = Number(u?.plan_duration_days);
    const pDays = planById.has(u?.plan_id) ? Number(planById.get(u.plan_id!)) : NaN;
    const eff = Number.isFinite(uDays) ? uDays : pDays;
    if (u?.id && Number.isFinite(eff)) retentionByUser[u.id] = eff; // 1, 3, 7, 14
  }

  const nowUtc = utcMidnight(new Date());
  const retValues = Object.values(retentionByUser).filter(Number.isFinite) as number[];
  if (retValues.length === 0) {
    console.log('No users have retention (user override or plan). Nothing to delete.');
    console.timeEnd('Cleanup time');
    return;
  }

  // 2) Reduce scan: fetch only files older than the MIN retention, in pages of 1000
  const minRetention = Math.min(...retValues);
  const minCutoffUtc = new Date(nowUtc.getTime() - minRetention * 86400000);

  console.log(`Now (UTC midnight): ${nowUtc.toISOString()}`);
  console.log(`Users with effective retention: ${Object.keys(retentionByUser).length}`);
  console.log(`Min retention: ${minRetention} days -> min cutoff: ${minCutoffUtc.toISOString()}`);

  const pageSize = 1000;
  let from = 0, to = pageSize - 1;
  let allCandidates: any[] = [];

  while (true) {
    const { data, error } = await supabase
      .from('vod_files')
      .select('id, url, timestamp, user_id, file_id')
      .lte('timestamp', minCutoffUtc.toISOString())
      .order('timestamp', { ascending: true })
      .range(from, to);

    if (error) {
      console.error('Paged fetch error:', error.message);
      break;
    }
    if (!data || data.length === 0) break;

    allCandidates = allCandidates.concat(data);
    console.log(`Fetched ${data.length} (total so far ${allCandidates.length})`);

    from += pageSize; to += pageSize;
  }

  // 3) Final per-user check: delete when ageDays >= effective retention (UTC day math)
  const expired = allCandidates.filter(v => {
    const r = retentionByUser[v.user_id];
    if (!Number.isFinite(r)) return false;
    const vodUtc = utcMidnight(new Date(v.timestamp));
    const ageDays = Math.floor((nowUtc.getTime() - vodUtc.getTime()) / 86400000);
    return ageDays >= r;
  });

  console.log(`Expired candidates found: ${expired.length}`);

  // 4) Delete in small concurrent batches
  let deletedCount = 0;
  const batches = chunk(expired, 10); // 10 parallel per batch

  for (const batch of batches) {
    await Promise.allSettled(
      batch.map(async (vod) => {
        try {
          const urlPath = new URL(vod.url).pathname.replace(/^\//, '');
          await deleteFromB2(urlPath, vod.file_id);

          const { error: delErr } = await supabase.from('vod_files').delete().eq('id', vod.id);
          if (delErr) {
            console.error(`DB delete failed for VOD ${vod.id}:`, delErr.message);
          } else {
            console.log(`Deleted VOD ID ${vod.id}`);
            deletedCount++;
          }
        } catch (err) {
          console.error(`Error cleaning VOD ID ${vod.id}:`, err);
        }
      })
    );
  }

  console.log(`Cleanup finished. Total deleted: ${deletedCount}`);
  console.timeEnd('Cleanup time');
}

cleanupExpiredVods();
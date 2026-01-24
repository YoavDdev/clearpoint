// cleanupOldVods.ts
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import axios from 'axios';
import { Resend } from 'resend';
dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

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

  // 1) Fetch users, plans, and active recurring payments
  const [
    { data: users, error: userErr },
    { data: plans, error: planErr },
    { data: activeRecurringPayments, error: recErr }
  ] = await Promise.all([
    supabase.from('users').select('id, role, plan_id, plan_duration_days'),
    supabase.from('plans').select('id, retention_days'),
    supabase.from('recurring_payments').select('user_id').eq('is_active', true).eq('is_valid', true),
  ]);

  if (userErr) { console.error('Failed to fetch users:', userErr.message); return; }
  if (planErr) { console.error('Failed to fetch plans:', planErr.message); return; }
  if (recErr) { console.error('Failed to fetch recurring payments:', recErr.message); return; }

  // Build set of users with active subscription (from recurring_payments only)
  const activeUserIds = new Set<string>();
  for (const r of activeRecurringPayments ?? []) {
    if (r?.user_id) activeUserIds.add(r.user_id);
  }

  const planById = new Map<string, number>();
  for (const p of plans ?? []) {
    const v = Number(p?.retention_days);
    if (p?.id && Number.isFinite(v)) planById.set(p.id, v);
  }

  // Track statistics for report
  const stats = {
    usersWithSubscription: 0,
    usersWithoutSubscription: 0,
    adminUsers: 0,
    deletedByCategory: {
      withSubscription: 0,
      withoutSubscription: 0,
      admin: 0,
    }
  };

  const retentionByUser: Record<string, number> = {};
  const userCategory: Record<string, 'admin' | 'withSubscription' | 'withoutSubscription'> = {};
  
  for (const u of users ?? []) {
    // אדמין - 14 ימים כמו לקוח רגיל
    if (u?.role?.toLowerCase() === 'admin') {
      console.log(`👑 Admin user ${u.id} - 14 days retention`);
      retentionByUser[u.id] = 14;
      userCategory[u.id] = 'admin';
      stats.adminUsers++;
      continue;
    }
    
    // בדוק אם יש מנוי פעיל
    const hasActiveSubscription = activeUserIds.has(u.id);
    
    if (hasActiveSubscription) {
      // לקוח עם מנוי פעיל - retention מלא (14 ימים)
      const uDays = Number(u?.plan_duration_days);
      const pDays = planById.has(u?.plan_id) ? Number(planById.get(u.plan_id!)) : NaN;
      const eff = Number.isFinite(uDays) ? uDays : pDays;
      if (u?.id && Number.isFinite(eff)) {
        retentionByUser[u.id] = eff;
        userCategory[u.id] = 'withSubscription';
        stats.usersWithSubscription++;
        console.log(`✅ User ${u.id} has active subscription - ${eff} days retention`);
      }
    } else {
      // לקוח ללא מנוי - 3 ימי grace period בלבד
      retentionByUser[u.id] = 3;
      userCategory[u.id] = 'withoutSubscription';
      stats.usersWithoutSubscription++;
      console.log(`⚠️ User ${u.id} has NO active subscription - 3 days grace period`);
    }
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
  let errorCount = 0;
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
            errorCount++;
          } else {
            console.log(`Deleted VOD ID ${vod.id}`);
            deletedCount++;
            
            // Track deletion by category
            const category = userCategory[vod.user_id];
            if (category === 'admin') {
              stats.deletedByCategory.admin++;
            } else if (category === 'withSubscription') {
              stats.deletedByCategory.withSubscription++;
            } else if (category === 'withoutSubscription') {
              stats.deletedByCategory.withoutSubscription++;
            }
          }
        } catch (err) {
          console.error(`Error cleaning VOD ID ${vod.id}:`, err);
          errorCount++;
        }
      })
    );
  }

  console.log(`Cleanup finished. Total deleted: ${deletedCount}`);
  console.timeEnd('Cleanup time');

  // 5) Send email report
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@clearpoint.co.il';
  const executionTimeSeconds = Math.round((Date.now() - Date.parse(nowUtc.toISOString())) / 1000);
  
  try {
    const emailHtml = `
      <!DOCTYPE html>
      <html dir="rtl" lang="he">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>דוח ניקוי הקלטות - Clearpoint</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4;">
        <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; border-bottom: 3px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0; font-size: 28px;">🗑️ דוח ניקוי הקלטות</h1>
            <p style="color: #666; margin: 5px 0 0 0; font-size: 16px;">Clearpoint Cleanup System</p>
            <p style="color: #999; margin: 5px 0 0 0; font-size: 14px;">${new Date().toLocaleString('he-IL')}</p>
          </div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 25px;">
            <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 20px; border-radius: 8px; text-align: center; color: white;">
              <div style="font-size: 32px; font-weight: bold;">${deletedCount}</div>
              <div style="font-size: 14px; opacity: 0.9;">קבצים נמחקו</div>
            </div>
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 20px; border-radius: 8px; text-align: center; color: white;">
              <div style="font-size: 32px; font-weight: bold;">${executionTimeSeconds}s</div>
              <div style="font-size: 14px; opacity: 0.9;">זמן ריצה</div>
            </div>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
            <h2 style="color: #333; margin-top: 0; font-size: 18px;">📊 סטטיסטיקות</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px 0; font-weight: bold; color: #555; border-bottom: 1px solid #e5e7eb;">קבצים שנסרקו:</td>
                <td style="padding: 10px 0; color: #333; text-align: left; border-bottom: 1px solid #e5e7eb;">${allCandidates.length.toLocaleString('he-IL')}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; font-weight: bold; color: #555; border-bottom: 1px solid #e5e7eb;">קבצים נמחקו:</td>
                <td style="padding: 10px 0; color: #dc2626; font-weight: bold; text-align: left; border-bottom: 1px solid #e5e7eb;">${deletedCount.toLocaleString('he-IL')}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; font-weight: bold; color: #555; border-bottom: 1px solid #e5e7eb;">לקוחות עם מנוי:</td>
                <td style="padding: 10px 0; color: #10b981; text-align: left; border-bottom: 1px solid #e5e7eb;">${stats.usersWithSubscription}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; font-weight: bold; color: #555; border-bottom: 1px solid #e5e7eb;">לקוחות ללא מנוי:</td>
                <td style="padding: 10px 0; color: #f59e0b; text-align: left; border-bottom: 1px solid #e5e7eb;">${stats.usersWithoutSubscription}</td>
              </tr>
              ${errorCount > 0 ? `
              <tr>
                <td style="padding: 10px 0; font-weight: bold; color: #dc2626;">שגיאות:</td>
                <td style="padding: 10px 0; color: #dc2626; font-weight: bold; text-align: left;">${errorCount}</td>
              </tr>
              ` : ''}
            </table>
          </div>
          
          <div style="background: #e0f2fe; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
            <h3 style="color: #0369a1; margin-top: 0; font-size: 16px;">📁 פירוט מחיקות</h3>
            <ul style="color: #0284c7; margin: 0; padding-right: 20px; font-size: 14px;">
              <li><strong>${stats.deletedByCategory.withSubscription}</strong> קבצים מלקוחות עם מנוי (14+ ימים)</li>
              <li><strong>${stats.deletedByCategory.withoutSubscription}</strong> קבצים מלקוחות ללא מנוי (3+ ימים)</li>
              <li><strong>${stats.deletedByCategory.admin}</strong> קבצים ממשתמשי אדמין (14+ ימים)</li>
            </ul>
          </div>
          
          ${deletedCount > 0 ? `
          <div style="background: #d1fae5; border: 1px solid #6ee7b7; padding: 15px; border-radius: 8px; margin-bottom: 25px; text-align: center;">
            <div style="font-size: 18px; color: #065f46; font-weight: bold;">
              💾 חיסכון משוער: ~${((deletedCount * 50) / 1024).toFixed(2)} GB
            </div>
            <div style="font-size: 13px; color: #047857; margin-top: 5px;">
              (הערכה: 50MB לקובץ בממוצע)
            </div>
          </div>
          ` : ''}
          
          <div style="text-align: center; border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px;">
            <p style="color: #666; font-size: 14px; margin: 0;">דוח זה נשלח אוטומטית לאחר כל הרצה של cleanupOldVods</p>
            <p style="color: #999; font-size: 12px; margin: 5px 0 0 0;">Clearpoint Security - Automated Cleanup System</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const result = await resend.emails.send({
      from: 'Clearpoint System <system@clearpoint.co.il>',
      to: [adminEmail],
      subject: `🗑️ דוח ניקוי הקלטות - ${deletedCount} קבצים נמחקו`,
      html: emailHtml,
    });

    if (result.error) {
      console.error('❌ Failed to send cleanup report:', result.error);
    } else {
      console.log(`✅ Cleanup report sent to ${adminEmail}`);
    }
  } catch (emailError) {
    console.error('❌ Error sending cleanup report:', emailError);
  }
}

cleanupExpiredVods();
# Operations Manual — Clearpoint Security

<!--
purpose: Document operational procedures, admin workflows, installation checklists, and troubleshooting guides
audience: Operators, admin users, field technicians, AI assistants
when_to_read: Before performing admin tasks, installations, or diagnosing production issues
prerequisites: MINI_PC.md (device architecture), BUSINESS_RULES.md (customer lifecycle), MONITORING.md (alerts)
related_docs:
  - MINI_PC.md (edge device setup)
  - MONITORING.md (health checks + alerting)
  - BUSINESS_RULES.md (customer lifecycle + payments)
  - SECURITY.md (token management)
  - DATABASE.md (table schemas)
source_of_truth_for: Admin workflows, installation procedures, troubleshooting guides
confidence: Verified — traced from admin UI code + API routes
last_verified: 2026-07-17
owner: Engineering Lead
-->

---

## 1. Admin Dashboard Overview

| Path | Purpose |
|------|---------|
| `/admin/requests` | Incoming subscription requests (lead management) |
| `/admin/customers` | Customer list + management |
| `/admin/customers/new` | Create new customer manually |
| `/admin/cameras` | All cameras across customers |
| `/admin/cameras/new` | Add camera to a customer |
| `/admin/mini-pcs` | Mini PC fleet management + health |
| `/admin/mini-pcs/[id]` | Individual Mini PC details |
| `/admin/diagnostics` | System monitoring + alerts |
| `/admin/support` | Customer support requests |
| `/admin/system-overview` | System logs + overview |
| `/admin/invoices` | Invoices + quotes management |
| `/admin/recurring-payments` | Recurring payment management |

---

## 2. New Customer Onboarding

### 2.1 Flow A: From Subscription Request (Recommended)

```
┌─────────────────────────────────────────────────────────┐
│ 1. Customer submits form at /subscribe                   │
│    → subscription_requests table (status: "new")         │
├─────────────────────────────────────────────────────────┤
│ 2. Admin opens /admin/requests                           │
│    → Sees new request (🟣 purple)                        │
├─────────────────────────────────────────────────────────┤
│ 3. Admin clicks "שלח לינק תשלום" (Send Payment Link)    │
│    → POST /api/admin/create-user-and-payment             │
│    → Creates: user + PayPlus customer + payment link     │
│    → Status changes to "payment_link_sent" (🔵 blue)     │
├─────────────────────────────────────────────────────────┤
│ 4. Admin copies payment link → sends to customer         │
│    (WhatsApp / SMS — manual step)                        │
├─────────────────────────────────────────────────────────┤
│ 5. Customer pays via PayPlus page                        │
│    → Webhook updates payment → status "paid" (💰)        │
├─────────────────────────────────────────────────────────┤
│ 6. Admin schedules and performs physical installation     │
│    → Marks request as "handled" (✅)                     │
└─────────────────────────────────────────────────────────┘
```

### 2.2 Flow B: Manual Customer Creation

Used when admin creates a customer without a prior subscription request.

1. **Navigate**: `/admin/customers/new`
2. **Fill fields**: name, email, phone, address, plan, custom price, tunnel name, business fields
3. **Submit**: Calls `POST /api/admin-invite-user`
   - Creates Supabase Auth user (no password)
   - Creates `users` record with plan linkage
   - Generates invite link via Supabase Auth
   - Sends invite email via Resend
4. **Customer**: Receives email → sets password → can login

### 2.3 Post-Creation Steps

After customer account exists:

| Step | Admin Action | API/UI |
|------|-------------|--------|
| Create Mini PC | Add mini_pc record | `/admin/mini-pcs` → Add |
| Generate device token | Create token for Mini PC | `POST /api/admin/mini-pc-tokens/create` |
| Add cameras | Create camera records | `/admin/cameras/new` |
| Download scripts | Get camera-*.sh files | `/admin/cameras` → Download button |
| Setup recurring billing | Create recurring payment | `/admin/recurring-payments` → Create |
| Send invoice/quote | Generate document | `/admin/invoices` → Create |

---

## 3. Camera Management

### 3.1 Adding a Camera

**UI**: `/admin/cameras/new`

| Field | Example | Notes |
|-------|---------|-------|
| Customer | (dropdown) | Select from existing users |
| Camera name | "כניסה" | Hebrew name for display |
| Serial number | "DS-2CD..." | Camera model/serial |
| Username | "admin" | RTSP credentials |
| Password | "pass123" | RTSP credentials |
| IP Address | "192.168.1.101" | Camera LAN IP |

**Generated RTSP URL**: `rtsp://<username>:<password>@<ip>:554/h264/ch1/main/av_stream`

### 3.2 Downloading Camera Script

From `/admin/cameras`, click the download button for a camera. This generates a `camera-<uuid>.sh` script containing:
- Camera ID and user ID
- RTSP URL
- FFmpeg recording command (15-min segments)
- FFmpeg HLS live stream command
- Background cleanup process

### 3.3 Camera Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Camera shows "offline" in dashboard | Health data stale (>3 min) | Check status-check.sh is running on Mini PC |
| Stream "missing" | m3u8 file doesn't exist | Camera script not running → restart |
| Stream "stale" | m3u8 older than 60s | RTSP connection dropped → auto-restart (or manual) |
| No live video in dashboard | Express server down | Restart live-server.js on Mini PC |
| Recording gaps | FFmpeg crash | Check disk space; restart camera script |
| Camera not appearing | Camera record not created | Create in `/admin/cameras/new` |

---

## 4. Mini PC Management

### 4.1 Creating a Mini PC Record

**UI**: `/admin/mini-pcs` → Add

| Field | Purpose |
|-------|---------|
| Hostname | Device hostname (e.g., "clearpoint") |
| User | Associated customer |
| Device name | Descriptive label |
| IP Address | LAN IP (for reference) |

### 4.2 Token Management

**Generate new token**:
1. Go to Mini PC details page
2. Click "Generate Token"
3. `POST /api/admin/mini-pc-tokens/create`
4. **IMPORTANT**: Copy the returned raw token immediately — it's shown only once
5. Token is stored as SHA-256 hash; old tokens are auto-revoked

**Deploy token on device**:
```bash
# Add to ~/clearpoint-core/.env on Mini PC
CLEARPOINT_DEVICE_TOKEN=<raw-token-from-step-4>
```

### 4.3 Mini PC Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| "minipc_offline" alert | No health data for >15 min | SSH → check status-check.sh cron |
| High CPU temp (>100°C) | Heavy load or ventilation | Check physical placement; reduce AI CPUQuota |
| Disk >90% | Old recordings not uploading | Check uploadVods cron; manual cleanup |
| RAM >90% | Memory leak | Restart services; check for zombie processes |
| Internet disconnected | Network issue | Check cable/WiFi; restart router |
| 401 on health report | Token invalid/revoked | Generate new token; update .env |
| 403 on health report | Token revoked or wrong | Verify token matches active hash in DB |

---

## 5. Monitoring Operations

### 5.1 Starting/Stopping Monitoring

**Start scheduler**:
```
POST /api/admin/diagnostics/init-monitoring
```

**Check status**:
```
GET /api/admin/diagnostics/init-monitoring
```

**Manual run**:
```
POST /api/admin/diagnostics/monitor
```

### 5.2 Alert Resolution

System alerts auto-resolve only for `camera_offline` (when camera health returns fresh data). All other alerts require manual resolution:

1. **View alerts**: `/admin/diagnostics`
2. **Investigate**: Check Mini PC health, camera status
3. **Resolve**: Mark alert as resolved in UI
4. **Verify**: Confirm health data is flowing again

### 5.3 Email Notification Management

Settings in `system_settings` table (editable via admin UI):

| Key | Default | Notes |
|-----|---------|-------|
| `email_notifications_enabled` | true | Master switch |
| `alert_email_address` | yoavddev@gmail.com | Admin recipient |
| `monitoring_interval_minutes` | 10 | Check frequency |
| `health_check_timeout_seconds` | 180 | Camera staleness |
| `critical_alert_threshold_minutes` | 10 | Escalation to critical |

---

## 6. Payment Operations

### 6.1 Creating a Payment Link (From Request)

Automated via "שלח לינק תשלום" button in `/admin/requests`:
1. Creates user account (if not exists)
2. Creates PayPlus customer
3. Creates payment record (pending)
4. Generates PayPlus payment page link
5. Returns link for admin to share

### 6.2 Setting Up Recurring Billing

**UI**: `/admin/recurring-payments` → Create

1. Select user
2. Enter amount (monthly)
3. Set start date
4. System creates PayPlus recurring payment page
5. Admin sends link to customer
6. Customer enters card details on PayPlus page
7. Monthly charges happen automatically

### 6.3 Syncing Payment Status

**Cron**: `GET /api/cron/sync-payplus-recurring`

Checks PayPlus API for recurring payment status and updates local `recurring_payments` table. Handles:
- Active/cancelled/suspended/expired statuses
- Last charge date
- Payment failures

### 6.4 Invoice Operations

| Action | Path | Notes |
|--------|------|-------|
| Create invoice | `/admin/invoices` → Create | Generates payment link |
| Create quote | `/admin/invoices` → Create (type: quote) | No payment link |
| Convert quote | `/admin/invoices` → Convert | Creates invoice from quote |
| Send via email | `/admin/invoices` → Send | Uses Resend |

---

## 7. Support Operations

### 7.1 Support Request Handling

**UI**: `/admin/support`

Customer submits support from dashboard (`/dashboard` → עזרה ותמיכה):
- Categories: technical, billing, general
- Can attach files (uploaded to `supportuploads` bucket)

Admin flow:
1. View unhandled requests
2. Contact customer (phone/WhatsApp — external)
3. Mark as handled: `POST /api/admin-handle-support`

### 7.2 Support Request Fields

| Field | Source |
|-------|--------|
| Email | Customer's email |
| Message | Free text description |
| Category | technical / billing / general |
| File URL | Attached screenshot/document |
| User ID | Linked to user account |

---

## 8. Installation Checklist

### 8.1 Pre-Installation (Cloud)

- [ ] Customer account created (via Flow A or B)
- [ ] Plan assigned (`users.plan_id`)
- [ ] Mini PC record created in database
- [ ] Device token generated (copy raw token!)
- [ ] Camera records created (one per physical camera)
- [ ] Camera scripts downloaded
- [ ] Recurring payment set up (or one-time payment collected)

### 8.2 On-Site Installation (Physical)

- [ ] Mini PC powered on and connected to network
- [ ] Ubuntu installed with HWE kernel
- [ ] RAM disk configured in fstab (`/mnt/ram-ts tmpfs defaults,size=128m 0 0`)
- [ ] Mount RAM disk: `sudo mount -a`
- [ ] Dependencies installed: FFmpeg, Node.js 18+, Python 3.10+, OpenVINO
- [ ] Cloudflared tunnel configured and running (systemd)
- [ ] `~/clearpoint-core/.env` created with `CLEARPOINT_DEVICE_TOKEN`
- [ ] Camera scripts copied to `~/clearpoint-scripts/`
- [ ] `start-clearpoint.sh` and `status-check.sh` copied
- [ ] AI models copied to `~/clearpoint-ai/models/`
- [ ] AI systemd service created (`clearpoint-ai.service`)
- [ ] Cron jobs configured (see below)
- [ ] RustDesk installed, configured to relay via `172.236.221.235`
- [ ] RustDesk ID noted and saved
- [ ] Camera RTSP streams verified working
- [ ] Live stream visible via tunnel URL

### 8.3 Cron Jobs to Configure

```cron
@reboot /home/clearpoint/clearpoint-scripts/start-clearpoint.sh >> /home/clearpoint/clearpoint-logs/startup.log 2>&1
*/5 * * * * /home/clearpoint/clearpoint-scripts/status-check.sh >> /home/clearpoint/clearpoint-logs/status-check.log 2>&1
0 6 * * * /home/clearpoint/clearpoint-scripts/disk-check.sh >> /home/clearpoint/clearpoint-logs/disk-check.log 2>&1
*/20 * * * * cd /home/clearpoint/clearpoint-core && npx ts-node uploadVods.ts >> /home/clearpoint/clearpoint-logs/upload.log 2>&1
```

### 8.4 Post-Installation Verification

- [ ] Mini PC health appearing in admin dashboard
- [ ] All cameras showing "healthy" stream status
- [ ] Live video playing in customer dashboard
- [ ] AI detections triggering (test with person in frame)
- [ ] VOD files uploading to BunnyCDN
- [ ] Alerts working when camera disconnected (test by unplugging)

---

## 9. Common Admin Tasks

### 9.1 Revoking Customer Access

1. Set `users.subscription_active = false` (or mark recurring payment as inactive)
2. Revoke device token: `POST /api/admin/mini-pc-tokens/create` with same Mini PC (revokes old)
3. (Optional) Disable cameras: set `cameras.is_stream_active = false`

### 9.2 Changing Customer Plan

1. Update `users.plan_id` to new plan ID
2. Update `users.custom_price` if overriding
3. Update `users.plan_duration_days` if changing retention
4. Update recurring payment amount in PayPlus (if applicable)

### 9.3 Replacing Mini PC Hardware

1. Generate new device token for the Mini PC
2. Setup new hardware (follow Installation Checklist)
3. Deploy new token to device `.env`
4. Verify health data flowing
5. Old hardware can be wiped

### 9.4 Adding a Camera to Existing Customer

1. Go to `/admin/cameras/new`
2. Select customer
3. Fill camera details (name, serial, RTSP credentials)
4. Download camera script
5. SSH to Mini PC → copy script to `~/clearpoint-scripts/`
6. Run: `bash ~/clearpoint-scripts/camera-<uuid>.sh &`
7. Verify in status-check (next 5-min cycle will detect it)

---

## 10. Environment Variables Reference

### 10.1 Vercel (Cloud)

| Variable | Purpose | Required |
|----------|---------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (public) | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase admin key | ✅ |
| `NEXTAUTH_SECRET` | NextAuth encryption key | ✅ |
| `NEXTAUTH_URL` | Site URL for auth callbacks | ✅ |
| `PAYPLUS_API_KEY` | PayPlus API key | ✅ |
| `PAYPLUS_SECRET_KEY` | PayPlus secret for webhooks | ✅ |
| `PAYPLUS_PAYMENT_PAGE_UID` | PayPlus payment page ID | ✅ |
| `PAYPLUS_TERMINAL_UID` | PayPlus terminal ID | ✅ |
| `RESEND_API_KEY` | Email sending (Resend) | ✅ |
| `RESEND_FROM_EMAIL` | Sender email | ✅ |
| `BUNNY_TOKEN_KEY` | BunnyCDN signed URL key | ✅ |
| `CLEARPOINT_DEVICE_TOKEN` | Fallback for ingest auth | ⚠️ Legacy |
| `SUPPORT_TEAM_EMAILS` | Comma-separated alert recipients | Optional |
| `PAYPLUS_USE_MOCK` | Enable mock payment mode | Dev only |

### 10.2 Mini PC (Device)

| Variable | Location | Purpose |
|----------|----------|---------|
| `CLEARPOINT_DEVICE_TOKEN` | `~/clearpoint-core/.env` | Auth for all ingest API calls |

---

## 11. Emergency Procedures

### 11.1 All Cameras Down (Single Customer)

1. Check Mini PC health in `/admin/mini-pcs`
2. If Mini PC offline → likely power/network issue at customer site
3. Contact customer to verify power and internet
4. If reachable via SSH tunnel → restart services:
   ```bash
   bash ~/clearpoint-scripts/start-clearpoint.sh
   ```

### 11.2 System-Wide Alert Storm

1. Check if monitoring scheduler is creating false positives
2. Review `system_settings.health_check_timeout_seconds` — increase if too aggressive
3. Temporarily disable email: set `email_notifications_enabled = false`
4. Investigate root cause before re-enabling

### 11.3 Payment System Down

1. PayPlus webhook not arriving → check webhook URL in PayPlus dashboard
2. Verify `PAYPLUS_SECRET_KEY` matches between PayPlus and Vercel env
3. Check Vercel function logs for webhook errors
4. Manual payment status update: directly update `payments.status` in Supabase

---

## 12. Linode Server — Utility Infrastructure

### 12.1 Server Details

| Property | Value |
|----------|-------|
| **Provider** | Linode (Akamai) |
| **Name** | ubuntu-de-fra-2 |
| **Plan** | Nanode 1 GB |
| **Location** | Frankfurt, DE (DE-FRA-2) |
| **IP** | 172.236.221.235 |
| **OS** | Ubuntu (with Docker) |
| **Access** | SSH as root |
| **Dashboard** | https://cloud.linode.com/linodes/86497358 |

### 12.2 Services Running

| Service | Type | Ports | Purpose |
|---------|------|-------|---------|
| **RustDesk hbbs** | Docker container | 21115, 21116, 21118 | Signaling server — ID registration, NAT traversal |
| **RustDesk hbbr** | Docker container | 21117, 21119 | Relay server — proxies connections when direct P2P fails |
| **cleanupOldVods** | Cron job (03:00 daily) | — | Deletes expired VOD files from B2 + database |

### 12.3 RustDesk Remote Access

**Architecture**:
```
Admin PC (RustDesk client)
    │
    ▼  connects via
┌─────────────────────────────┐
│ Linode: 172.236.221.235     │
│  hbbs (signaling) port 21116│
│  hbbr (relay)    port 21117 │
└─────────────┬───────────────┘
              │
              ▼  relays to
┌─────────────────────────────┐
│ Mini PC (RustDesk client)    │
│  port 20241 (localhost only) │
└─────────────────────────────┘
```

**Usage**: Allows admin to remotely control Mini PCs for troubleshooting without needing port forwarding or VPN. Each Mini PC has a unique RustDesk ID displayed in the client.

**Docker containers** (running 8+ months, stable):
```bash
docker ps
# hbbs — rustdesk/rustdesk-server:latest
# hbbr — rustdesk/rustdesk-server:latest
```

### 12.4 VOD Cleanup Job

| Property | Value |
|----------|-------|
| **Script** | `/opt/clearpoint-cleanup/cleanupOldVods.ts` |
| **Schedule** | Daily at 03:00 UTC |
| **Runtime** | ts-node (with 60min timeout) |
| **Log** | `/var/log/clearpoint-cleanup.log` |
| **Report** | Sends email summary after each run (via Resend) |

**Cron entry**:
```cron
0 3 * * * cd /opt/clearpoint-cleanup && timeout 60m /usr/bin/ts-node cleanupOldVods.ts >> /var/log/clearpoint-cleanup.log 2>&1
```

**Retention logic**:
| User Type | Retention | Action |
|-----------|-----------|--------|
| Active subscriber | `plan_duration_days` or `plans.retention_days` (default 14) | Delete from B2 + DB after retention expires |
| No active subscription | **3 days** (grace period) | Aggressive cleanup |
| Admin | **14 days** | Same as regular customer |

**Process**:
1. Fetches all users + plans + active recurring payments
2. Determines per-user retention days
3. Scans `vod_files` table for records older than minimum retention
4. Deletes from **Backblaze B2** (actual file) via API
5. Deletes from **vod_files** table (database record)
6. Sends HTML email report to admin with statistics

### 12.5 Video Storage Architecture (B2 + BunnyCDN)

```
Mini PC
  │  uploadVods.ts (cron */20 min)
  │  Transcodes HEVC → H.264
  │  Uploads via B2 API
  ▼
┌──────────────────────────────────┐
│  Backblaze B2 Bucket             │
│  Path: <user_id>/<camera_id>/    │
│        2025-07-18_14-30-00.mp4   │
│  Auth: B2_ACCOUNT_ID + B2_APP_KEY│
│  Bucket: B2_BUCKET_ID            │
└──────────────┬───────────────────┘
               │  BunnyCDN Pull Zone (CDN layer)
               ▼
┌──────────────────────────────────┐
│  clearpoint-cdn.b-cdn.net        │
│  Signed URLs (SHA-256 token)     │
│  Token key: BUNNY_TOKEN_KEY      │
│  Expiry: 14 days per URL         │
└──────────────────────────────────┘
               │
               ▼  Customer watches
         Dashboard → /api/vod/signed-url → CDN URL
```

**Env vars on Linode** (in `/opt/clearpoint-cleanup/.env`):
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `B2_ACCOUNT_ID`
- `B2_APP_KEY`
- `B2_BUCKET_ID`
- `RESEND_API_KEY`
- `ADMIN_EMAIL`

### 12.6 Linode Maintenance

| Task | How |
|------|-----|
| Check cleanup logs | `ssh root@172.236.221.235 'tail -100 /var/log/clearpoint-cleanup.log'` |
| Restart RustDesk | `ssh root@172.236.221.235 'docker restart hbbs hbbr'` |
| Check Docker status | `ssh root@172.236.221.235 'docker ps'` |
| View cron schedule | `ssh root@172.236.221.235 'crontab -l'` |
| Server uptime | `ssh root@172.236.221.235 'uptime'` |

---

*Document verified against source code and live server inspection on 2026-07-18.*

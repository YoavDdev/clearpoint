# Monitoring & Alerting — Clearpoint Security

<!--
purpose: Document the health monitoring model, alert lifecycle, notification system, and cleanup operations
audience: All engineers, AI assistants, on-call operators
when_to_read: Before modifying monitoring logic, alert rules, or cron jobs
prerequisites: DATABASE.md (tables), API_REFERENCE.md (endpoints), SYSTEM_ARCHITECTURE.md (data flow)
related_docs:
  - DATABASE.md (system_alerts, alerts, mini_pc_health, camera_health, system_logs)
  - API_REFERENCE.md (ingest + diagnostics endpoints)
  - SECURITY.md (device token auth for ingest)
  - TECHNICAL_DEBT.md (dead cron jobs)
source_of_truth_for: Health monitoring model, alert lifecycle, notification channels, data retention
confidence: Verified — traced from source code
last_verified: 2026-07-17
owner: Engineering Lead
-->

---

## 1. Monitoring Architecture Overview

The system has **two independent alert systems** that serve different purposes:

| System | Source | Table | Purpose | Audience |
|--------|--------|-------|---------|----------|
| **AI Detection Alerts** | Mini PC AI engine (YOLOv8n) | `alerts` | Person/vehicle/fire detection | End customer |
| **System Alerts** | Cloud monitoring scheduler | `system_alerts` | Device offline, stream error, disk full | Admin only |

```
                    ┌─────────────────────────┐
                    │      Mini PC (Edge)       │
                    │                           │
                    │  ┌───────┐  ┌──────────┐ │
                    │  │ AI    │  │ Health    │ │
                    │  │Engine │  │ Reporter  │ │
                    │  └───┬───┘  └────┬─────┘ │
                    └──────┼──────────┼────────┘
                           │          │
                    ───── INTERNET ─────
                           │          │
                    ┌──────┼──────────┼────────┐
                    │      ▼          ▼        │
                    │  /ingest/   /ingest/      │
                    │  alert      mini-pc-health│
                    │  (→alerts)  camera-health │
                    │             system-log    │
                    │                           │
                    │  ┌───────────────────┐    │
                    │  │ Monitoring        │    │
                    │  │ Scheduler         │────┼──→ Email (Resend)
                    │  │ (→system_alerts)  │    │
                    │  └───────────────────┘    │
                    │       Vercel (Cloud)       │
                    └───────────────────────────┘
```

---

## 2. Health Data Ingest (Device → Cloud)

### 2.1 Mini PC Health

**Endpoint**: `POST /api/ingest/mini-pc-health`  
**Auth**: Device token  
**Write mode**: UPSERT (one row per mini_pc, always current)  
**Table**: `mini_pc_health`

| Metric | Column | Type | Alert Threshold |
|--------|--------|------|-----------------|
| CPU temperature | `cpu_temp_celsius` | REAL | > 100°C → `minipc_overheating` (critical) |
| CPU usage | `cpu_usage_pct` | REAL | Informational only |
| RAM total | `ram_total_mb` | INTEGER | — |
| RAM used | `ram_used_mb` | INTEGER | — |
| RAM usage % | `ram_usage_pct` | REAL | > 90% → `minipc_memory_full` (high) |
| Disk root % | `disk_root_pct` | REAL | > 90% → `minipc_disk_full` (critical) |
| Internet connected | `internet_connected` | BOOLEAN | false → `minipc_no_internet` (high) |
| Last checked | `last_checked` | TIMESTAMPTZ | > 15 min stale → `minipc_offline` (critical) |

### 2.2 Camera Health

**Endpoint**: `POST /api/ingest/camera-health`  
**Auth**: Device token  
**Write mode**: UPSERT (one row per camera, always current)  
**Table**: `camera_health`

| Metric | Column | Alert Threshold |
|--------|--------|-----------------|
| Stream status | `stream_status` | `missing`/`error` → `stream_error` (critical) |
| | | `stale` → `stream_error` (high) |
| Log message | `log_message` | Informational |
| Last checked | `last_checked` | > health_check_timeout → `camera_offline` |

### 2.3 System Logs

**Endpoint**: `POST /api/ingest/system-log`  
**Auth**: Device token  
**Write mode**: INSERT (append-only)  
**Table**: `system_logs`

| Field | Values |
|-------|--------|
| Category | `camera`, `vod`, `minipc`, `alert`, `system` |
| Severity | `info`, `warning`, `error`, `critical` |

**Retention**: 14 days (cleaned by `cron/cleanup-logs`)

---

## 3. System Monitoring Scheduler

### 3.1 Architecture

**File**: `src/lib/monitoring-scheduler.ts` (singleton class)

The monitoring scheduler is an in-process `setInterval` running on the Vercel serverless instance. It calls the monitor endpoint periodically.

```
MonitoringScheduler (singleton)
    │
    ├── loadIntervalFromSettings()     → reads system_settings.monitoring_interval_minutes
    ├── start()                        → runs immediately, then at interval
    ├── checkAndUpdateInterval()       → polls settings every 5 min for changes
    ├── runMonitoring()                → calls POST /admin/diagnostics/auto-monitor
    └── stop()                         → clears intervals
```

**Initialization**: Triggered manually via `POST /api/admin/diagnostics/init-monitoring`. Does NOT auto-start.

**Default interval**: 10 minutes (configurable via `system_settings.monitoring_interval_minutes`)

### 3.2 Monitor Logic (Smart Alert Detection)

**File**: `src/app/api/admin/diagnostics/monitor/route.ts` (722 lines)

The monitor runs this sequence every cycle:

```
1. Load system_settings (thresholds, email config)
2. Fetch all cameras + Mini PCs with user data
3. SMART SUPPRESSION: Check Mini PC status first
   └── If Mini PC is offline → suppress individual camera alerts for that user
4. For each camera:
   ├── Fetch camera-health API
   ├── Check: health data stale? → camera_offline
   ├── Check: stream status error/missing/stale? → stream_error
   ├── Check: disk > 90%? → disk_full
   ├── Check: health data > 15 min old? → device_error
   └── Check: camera recovered? → auto-resolve existing alert + send recovery email
5. For each Mini PC:
   ├── Fetch mini-pc-health API
   ├── Check: no health data? → minipc_offline
   ├── Check: health data > 15 min? → minipc_offline
   ├── Check: CPU temp > 100°C? → minipc_overheating
   ├── Check: disk > 90%? → minipc_disk_full
   ├── Check: RAM > 90%? → minipc_memory_full
   └── Check: internet disconnected? → minipc_no_internet
6. INSERT new alerts to system_alerts
7. Send email notifications (with rate limiting)
```

### 3.3 Smart Alert Features

| Feature | Description |
|---------|-------------|
| **Root cause suppression** | If Mini PC is offline, individual camera alerts are suppressed |
| **Deduplication** | Checks for existing unresolved alert before creating new one |
| **Auto-recovery** | Resolves camera_offline alerts when health data returns (< 2 min fresh + healthy stream) |
| **Email rate limiting** | No duplicate emails within 1 hour for same camera + alert type |
| **Severity escalation** | `camera_offline` → `high` if within threshold, `critical` if > threshold or no data |

### 3.4 Configurable Settings

All read from `system_settings` table:

| Setting Key | Default | Purpose |
|-------------|---------|---------|
| `monitoring_interval_minutes` | 10 | How often the scheduler runs |
| `email_notifications_enabled` | true | Enable/disable email alerts |
| `alert_email_address` | yoavddev@gmail.com | Admin email for alerts |
| `health_check_timeout_seconds` | 180 | Camera health staleness threshold |
| `stream_check_timeout_seconds` | 240 | Stream check threshold |
| `critical_alert_threshold_minutes` | 10 | Minutes before camera_offline → critical |

---

## 4. AI Detection Alert System

### 4.1 Alert Pipeline

```
Mini PC (detect.py)                     Cloud API                        Database
       │                                    │                              │
       │── POST /ingest/alert ──────────────▶                              │
       │   {camera_id, detection_type,      │                              │
       │    confidence, snapshot (base64)}   │                              │
       │                                    │                              │
       │                                    │── Validate device token       │
       │                                    │── Get user_id from mini_pc    │
       │                                    │── Fetch user's alert_rules    │
       │                                    │                              │
       │                                    │── findMatchingRule()          │
       │                                    │   ├── detection_type match    │
       │                                    │   ├── exclude_types check     │
       │                                    │   ├── min_confidence check    │
       │                                    │   ├── camera_id filter        │
       │                                    │   ├── days_of_week check      │
       │                                    │   └── schedule window check   │
       │                                    │                              │
       │                                    │── Cooldown check (per rule)   │
       │                                    │                              │
       │                                    │── Upload snapshot to Storage  │
       │                                    │   (alert-snapshots bucket)    │
       │                                    │                              │
       │                                    │── INSERT into alerts ─────────▶
       │                                    │                              │
       │◀── {success, count, skipped} ──────│                              │
```

### 4.2 Alert Rule Engine

Rules are per-user, stored in `alert_rules` table. Each detection is checked against all active rules.

| Rule Field | Function |
|------------|----------|
| `detection_type` | `any`, `person`, `vehicle`, `animal`, `fire_smoke`, `suspicious_object`, `weapon` |
| `exclude_types` | Array of types to skip even if main type matches |
| `min_confidence` | Minimum confidence score (0.0–1.0) |
| `camera_id` | NULL = all cameras, or specific camera UUID |
| `schedule_start` / `schedule_end` | Time window (HH:MM), supports overnight ranges |
| `days_of_week` | Array of day numbers (0=Sunday) |
| `cooldown_minutes` | Minimum gap between alerts for same rule+camera |
| `is_active` | Enable/disable rule |

**Auto-created presets**: When a user first requests their rules, system presets are auto-created (e.g., "All detections", "Fire & Smoke").

### 4.3 Detection Types

Reported by the Mini PC AI engine:

| Type | Model | Status |
|------|-------|--------|
| `person` | YOLOv8n (COCO) | Active |
| `vehicle` | YOLOv8n (COCO) | Active |
| `dog`, `cat`, `animal` | YOLOv8n (COCO) | Active |
| `suspicious_object` | YOLOv8n (COCO) — backpack/suitcase/handbag | Active |
| `weapon` | YOLOv8n (COCO) — knife/scissors | Active |
| `fire`, `smoke` | Custom fire_smoke_fp16 model | Active |

**AI performance**: ~18-19 frames/30s per camera on Intel N150.

---

## 5. Notification Channels

### 5.1 Email (Active)

**Provider**: Resend (`resend.emails.send`)  
**From**: `alerts@clearpoint.co.il` (or `RESEND_FROM_EMAIL`)  
**Recipients**: Support team (`SUPPORT_TEAM_EMAILS` env var, default: admin email)  
**Content**: Rich HTML email in Hebrew with:
- Severity badge (color-coded)
- Camera + customer info
- Problem explanation
- Solutions list
- Link to monitoring dashboard

**Email types**:

| Type | Trigger |
|------|---------|
| Camera offline | Health data stale beyond threshold |
| Stream error | Stream status = `missing`/`error`/`stale` |
| Mini PC offline | No health data or stale > 15 min |
| Camera recovery | Previously offline camera returns with fresh healthy data |

### 5.2 WhatsApp (Placeholder)

**Status**: Stub implementation only (logs to console, inserts to `notification_logs` table)  
**Planned provider**: Twilio  
**Not active in production.**

### 5.3 User-Facing Alert Display

End customers see AI detection alerts (from `alerts` table) in their dashboard at `/dashboard/alerts`. They can:
- View alerts with camera name, detection type, confidence, snapshot
- Filter by camera, detection type, acknowledged status
- Acknowledge individual alerts or all at once
- Manage alert rules (create, edit, enable/disable, delete)

---

## 6. System Alert Types

All stored in `system_alerts` table (admin-only visibility):

| Type | Severity | Trigger | Auto-Resolve? |
|------|----------|---------|---------------|
| `camera_offline` | high/critical | Health data stale beyond threshold | ✅ Yes (when health returns) |
| `stream_error` | high/critical | Stream status = missing/error/stale | No |
| `disk_full` | critical | camera disk_root_pct > 90% | No |
| `device_error` | medium | Health data > 15 min stale | No |
| `minipc_offline` | high/critical | No health data or stale > 15 min | No |
| `minipc_overheating` | critical | CPU temp > 100°C | No |
| `minipc_disk_full` | critical | Disk > 90% | No |
| `minipc_memory_full` | high | RAM > 90% | No |
| `minipc_no_internet` | high | internet_connected = false | No |

---

## 7. Cron Jobs

### 7.1 Active Cron

| Endpoint | Schedule | Purpose | Retention |
|----------|----------|---------|-----------|
| `GET /api/cron/cleanup-logs` | Daily | Delete old system_logs + alerts + snapshots | 14 days |
| `GET /api/cron/sync-payplus-recurring` | Periodic | Sync recurring payment status from PayPlus | — |

### 7.2 Dead Cron Jobs (See TECHNICAL_DEBT.md TD-2)

| Endpoint | Purpose | Status |
|----------|---------|--------|
| `GET /api/cron/process-cancellations` | Cancel expired subscriptions | ❌ Dead — references non-existent `subscriptions` table |
| `GET /api/cron/process-trials` | Expire trial periods | ❌ Dead |
| `GET /api/cron/resume-paused` | Resume paused subscriptions | ❌ Dead |

### 7.3 Cleanup Logic (`cleanup-logs`)

```
1. Delete system_logs older than 14 days
2. Fetch alerts older than 14 days that have snapshot_url
3. Extract Storage file paths from snapshot URLs
4. Delete snapshot files from alert-snapshots bucket (batches of 100)
5. Delete alert records from database
```

---

## 8. Data Flow Summary

### Health Data (UPSERT — always current)

```
Mini PC ──(every 5 min)──▶ /ingest/mini-pc-health ──▶ mini_pc_health (1 row per mini_pc)
Mini PC ──(every 5 min)──▶ /ingest/camera-health  ──▶ camera_health  (1 row per camera)
```

### Logs (INSERT — append-only, 14-day retention)

```
Mini PC ──(on event)──▶ /ingest/system-log ──▶ system_logs
```

### AI Alerts (INSERT — append-only, 14-day retention)

```
Mini PC ──(on detection)──▶ /ingest/alert ──▶ alerts + alert-snapshots bucket
```

### System Alerts (INSERT by scheduler, auto-resolved on recovery)

```
Scheduler ──(every 10 min)──▶ monitor route ──▶ system_alerts + email notifications
```

---

## 9. Admin Monitoring Dashboard

**Path**: `/admin/diagnostics`

Admin can:
- View all system alerts (filtered by resolved/unresolved)
- See real-time camera and Mini PC health
- Manually run monitoring check
- Start/stop/configure monitoring scheduler
- View system logs with category/severity filters
- Delete/resolve individual alerts or bulk operations
- Send test alerts and notifications

---

## 10. On-Device Monitoring (Mini PC Side)

The Mini PC runs several cron-based monitoring scripts:

| Script | Schedule | Purpose |
|--------|----------|---------|
| `status-check.sh` | Every 5 min | Check camera RTSP streams, restart if down, report health |
| `disk-check.sh` | Daily 6 AM | Check disk usage, clean old recordings if needed |
| AI watchdog | Every 2 min | Restart AI engine if crashed (redundant with systemd) |

**Process management**: Mixed systemd (AI engine, cloudflared) + cron (cameras, VOD upload, health checks).

---

*Document verified against source code on 2026-07-17.*

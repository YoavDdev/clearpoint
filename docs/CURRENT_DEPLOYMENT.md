# Clearpoint Security — Current Deployment State

<!--
purpose: Verified production state of the working Mini PC, documented from live inspection
audience: Engineers, operations, future installer design
when_to_read: When comparing documentation to reality, designing new installer, or troubleshooting
deployment_specific: true — This documents ONE specific Mini PC, not a product standard
verified_date: 2026-07-17T20:13:00+03:00
verified_by: Read-only production inspection (5 phases)
-->

> **This document represents the actual deployed state of the production Mini PC as inspected on 2026-07-17.**
> It is the strongest source of truth for deployment reality but does NOT define the product standard.
> The current installation is primarily manual/mixed and was not produced cleanly by either repository installer.

---

## 1. Hardware & Operating System

| Property | Value | Source |
|----------|-------|--------|
| Hostname | `clearpoint` | `hostname` |
| OS | Ubuntu 24.04.3 LTS (Noble Numbat) | `/etc/os-release` |
| Kernel | 7.0.0-28-generic (HWE kernel, newer than stock 6.8) | `uname -r` |
| Architecture | x86_64 | `uname -m` |
| CPU | Intel N150, 4 cores, 1 thread/core, no hyperthreading | `lscpu` |
| RAM | 7.5 GiB (8 GB physical) | `free -h` |
| Disk | 233 GB NVMe SSD, 33 GB used (15%) | `df -hT` |
| PC Model | DMI reports "default" (GMKtec doesn't set proper DMI) | `dmidecode` |
| Serial | WBHZN6M0251100095 | `dmidecode` |
| RAM Disk | 128 MB tmpfs at `/mnt/ram-ts` (in `/etc/fstab`) | `mount`, `df` |
| Uptime at inspection | 13 minutes (just rebooted) | `uptime` |

---

## 2. Customer & Camera Configuration

**Single customer deployment:**

| Property | Value |
|----------|-------|
| User ID | `14a644fe-3bbe-44f3-ac91-1f6be8a20b0f` |
| Tunnel hostname | `minipc.clearpoint.co.il` |
| Number of cameras | 4 |

**Cameras:**

| # | Name | Camera ID | IP | Codec | Status |
|---|------|-----------|-----|-------|--------|
| 1 | כניסה (Entrance) | `82015c1c-84a4-4b7e-a9ce-ffc813255f85` | 192.168.1.101 | H.265 (HEVC) | ✅ Stable |
| 2 | חצר (Yard) | `8ffbf456-d0c8-429f-a327-af22285c7059` | 192.168.1.102 | H.265 (HEVC) | ✅ Stable |
| 3 | מרפסת (Balcony) | `d7d99961-6c65-4fda-b345-6fbbf08c0cb5` | 192.168.1.103 | H.265 (HEVC) | ✅ Stable |
| 4 | חניה (Parking) | `a8db2e16-c900-48ee-a61d-effe469aa51a` | 192.168.1.104 | H.265 (HEVC) | ⚠️ Intermittent (RTSP drops, auto-recovered) |

**Per-camera architecture**: Each camera script spawns 3 background processes:
1. FFmpeg recording: RTSP → MP4 segments (900s/15 min, codec copy + AAC audio)
2. FFmpeg HLS: RTSP → HLS (1.5s segments, 8 in playlist, auto-delete)
3. Bash cleanup loop: deletes .ts files > 5 min old (every 300s)

**Orphaned camera**: `c8a74876-9024-4ee2-8cfc-6ac720390363` (from Aug 22, 2025) in `~/orphaned-cameras/`

---

## 3. Process Management

### 3.1 Systemd Services (auto-restart, reliable)

| Service | File | Installed | Status | Restart Policy |
|---------|------|-----------|--------|----------------|
| `clearpoint-ai.service` | `/etc/systemd/system/clearpoint-ai.service` | Feb 11, 2026 | ✅ Active | `Restart=always`, `RestartSec=10` |
| `cloudflared.service` | `/etc/systemd/system/cloudflared.service` | Jun 7, 2025 | ✅ Active | Standard cloudflared daemon |

**AI Service configuration:**
- ExecStart: `/home/clearpoint/clearpoint-ai/venv/bin/python3 /home/clearpoint/clearpoint-ai/detect.py`
- WorkingDirectory: `/home/clearpoint/clearpoint-ai`
- CPUQuota: 200%
- MemoryMax: 512M
- Logging: appends to `~/clearpoint-logs/ai-detect.log` and `ai-detect-error.log`
- ⚠️ Device token hardcoded in `Environment=` line (should use `EnvironmentFile=`)

### 3.2 Cron Jobs (user `clearpoint`)

| Schedule | Command | Purpose | Working? |
|----------|---------|---------|----------|
| `@reboot sleep 45` | `bash ~/start-clearpoint.sh` | Bootstrap cameras + Express | ✅ Yes |
| `@reboot sleep 60` | `node ~/live-server.js >> ~/express-log.txt` | Backup Express start (redundant) | ⚠️ Redundant — start-clearpoint.sh already starts it |
| `*/20 * * * *` | `cd ~/clearpoint-core && ts-node uploadVods.ts` | VOD upload to B2 | ✅ Yes |
| `*/5 * * * *` | `bash ~/clearpoint-scripts/status-check.sh` | Health + camera recovery | ✅ Yes |
| `0 6 * * *` | `bash ~/clearpoint-scripts/disk-check.sh` | Daily disk check | ✅ Yes |
| `*/2 * * * *` | `pgrep -f 'detect.py' \|\| python3 detect.py` | AI watchdog | ⚠️ Redundant — systemd already manages AI |

**Root crontab**: Empty (no root cron jobs).

### 3.3 Boot Recovery (via `start-clearpoint.sh`)

1. Discovers user_id from `~/clearpoint-recordings/`
2. Launches camera scripts from `~/clearpoint-scripts/camera-*.sh` (each in background)
3. Kills old Express servers, starts `live-server.js`
4. Waits 30s, tries to start AI from `~/clearpoint-core/detect.py` — **FAILS** (file moved to `~/clearpoint-ai/`)
5. AI actually starts via systemd independently (before the cron even fires)

**Result**: Boot recovery works, but AI startup in `start-clearpoint.sh` is dead code.

### 3.4 Self-Healing

| Component | Watchdog | Recovery Method | Tested? |
|-----------|----------|-----------------|---------|
| Camera FFmpeg | `status-check.sh` (*/5 min) | Checks m3u8 freshness, restarts | ✅ Confirmed working (camera 4 recovered) |
| AI engine | systemd `Restart=always` | Automatic restart in 10s | ✅ Reliable |
| AI engine (backup) | Cron */2 min watchdog | Redundant, harmless | ✅ But unnecessary |
| Express server | **None** | Only recovers on reboot | ❌ Gap |
| Cloudflared | systemd | Standard daemon restart | ✅ Reliable |
| VOD upload | Cron */20 min | Retries next cycle | ✅ Built-in retry |

---

## 4. File Layout

```
/home/clearpoint/
├── start-clearpoint.sh              (Feb 9, 1.7KB — bootstrap)
├── live-server.js                   (Jun 7 2025, 1.1KB — Express HLS server)
├── express-log.txt                  (12KB — today's cron @reboot Express log)
├── express-server-log.txt           (129B — start-clearpoint.sh Express log)
├── vod-upload-log.txt               (19MB — NO ROTATION)
├── package.json                     (Jun 7 2025 — home-level node deps)
├── node_modules/                    (Jun 7 2025 — Express/cors deps)
├── cloudflared-linux-amd64.deb      (18MB — installer artifact, orphaned)
│
├── clearpoint-core/                 (Upload + config)
│   ├── .env                         (676B, 644 perms ⚠️ world-readable)
│   ├── uploadVods.ts                (Feb 7, 16KB)
│   ├── ai-config.json               (Feb 8 — 4 cameras, analysis_fps: 2)
│   ├── tsconfig.json                (Jun 7 2025)
│   ├── package.json                 (Jun 7 2025)
│   └── node_modules/
│
├── clearpoint-ai/                   (AI engine — SEPARATE from core)
│   ├── detect.py                    (Feb 12, 35KB)
│   ├── live_debug.py                (Feb 11 — debug tool)
│   ├── requirements.txt             (Feb 8)
│   ├── venv/                        (Python 3 virtualenv)
│   └── models/
│       ├── yolov8n_fp16.xml/.bin    (Feb 11, 6.9MB — PRIMARY MODEL)
│       ├── yolov8n.onnx             (Feb 11, 12.8MB — source)
│       ├── fire_smoke_fp16.xml/.bin  (Feb 12, 6.3MB — ACTIVE)
│       ├── fire_smoke.onnx          (Feb 12, 12.3MB — source)
│       ├── weapons_fp16.xml.disabled (Feb 12 — DISABLED)
│       ├── weapons.onnx             (Feb 12, 12.3MB)
│       ├── yolov8s_fp16.xml/.bin    (Feb 11, 22.9MB — OBSOLETE, superseded by nano)
│       ├── yolov8s.onnx             (Feb 9, 44.9MB — OBSOLETE)
│       └── yolox_nano.onnx          (Dec 2021, 3.7MB — ANCIENT, never used)
│
├── clearpoint-scripts/              (Camera + monitoring scripts)
│   ├── camera-82015c1c-*.sh         (Feb 7 — כניסה)
│   ├── camera-8ffbf456-*.sh         (Feb 7 — חצר)
│   ├── camera-a8db2e16-*.sh         (Feb 7 — חניה)
│   ├── camera-d7d99961-*.sh         (Feb 7 — מרפסת)
│   ├── status-check.sh              (Feb 8, 14.6KB)
│   ├── disk-check.sh                (Jun 18, 2025)
│   └── setup-cron.sh                (Feb 9)
│
├── clearpoint-recordings/           (Active VOD storage)
│   └── 14a644fe-.../footage/
│       ├── 82015c1c-.../            (Entrance recordings)
│       ├── 8ffbf456-.../            (Yard recordings)
│       ├── a8db2e16-.../            (Parking recordings)
│       └── d7d99961-.../            (Balcony recordings)
│
├── clearpoint-snapshots/            (AI detection snapshots, 122KB dir size)
├── clearpoint-logs/
│   ├── ai-detect.log               (605MB — NO ROTATION ⚠️)
│   ├── ai-detect-error.log         (52MB — NO ROTATION ⚠️)
│   └── health.log                   (59KB — disk-check output)
│
├── orphaned-cameras/                (Old camera config)
│   └── c8a74876-.../                (Aug 2025, removed)
├── ai/                              (Feb 12 — possibly experimental)
└── intel/                           (Feb 8 — OpenVINO related?)
```

---

## 5. AI Detection Engine

| Property | Value | Source |
|----------|-------|--------|
| Model (primary) | YOLOv8n → OpenVINO IR FP16 | `models/yolov8n_fp16.xml` |
| Model (fire/smoke) | Custom → OpenVINO IR FP16 | `models/fire_smoke_fp16.xml` |
| Model (weapons) | DISABLED | `weapons_fp16.xml.disabled` |
| Input resolution | 640×640 | detect.py code |
| Analysis FPS | 2 (from ai-config.json) | `ai-config.json` |
| Performance | **18-19 frames/30s** per camera (point-in-time measurement, 2026-07-17) | Live heartbeat logs |
| CPUQuota | 200% (2 full cores) | systemd service |
| MemoryMax | 512M | systemd service |
| Confidence threshold | 0.45 | detect.py |
| Cooldown | 60s local per (camera, type) | detect.py |
| Current detections | Vehicle on כניסה at 45-63% | Live log |

> **Performance note**: 18–19 frames/30s was measured on 2026-07-17 on this specific Intel N150 deployment with 4 cameras at `analysis_fps=2`. This is a point-in-time observation, not a performance guarantee. Throughput will vary with hardware, camera count, stream resolution, and system load.

**AI error log**: Shows HEVC decoder reference frame warnings — normal during RTSP reconnections, not a functional issue.

---

## 6. Networking

| Port | Service | Binding | Status |
|------|---------|---------|--------|
| 8080 | Express `live-server.js` | `*:8080` (all interfaces) | ✅ Active |
| 20241 | RustDesk (remote desktop) | `127.0.0.1` only | ℹ️ Admin tool |
| 631 | CUPS (printing) | `127.0.0.1` only | ⚠️ Unnecessary |
| 53 | systemd-resolved (DNS) | `127.0.0.53` | ℹ️ Normal |

**Cloudflare Tunnel:**
- Hostname: `minipc.clearpoint.co.il`
- Routes to: `http://localhost:8080`
- Fallback: `http_status:404`
- Service installed Jun 7, 2025

---

## 7. VOD Upload Pipeline

| Property | Value |
|----------|-------|
| Schedule | Every 20 minutes (cron) |
| Script | `~/clearpoint-core/uploadVods.ts` via `ts-node` |
| Pre-processing | **Transcodes HEVC → H.264** before upload |
| Skip logic | Skips files still being written |
| Retry logic | 3 attempts with retry |
| Recent batch | 6 files, 119.2 MB |
| Destination | Backblaze B2 (via .env config) |
| Status | ✅ Working with occasional transcode failures (retried) |

---

## 8. Health Monitoring

**disk-check.sh** (daily 6:00 AM):
- Checks root `/` and RAM disk `/mnt/ram-ts`
- Current: Root 15%, RAM disk 3-4% — all healthy
- Logs to `~/clearpoint-logs/health.log` (59 KB)
- ✅ Running consistently (verified 4 consecutive days in log)

**status-check.sh** (every 5 min):
- 14.6 KB comprehensive script
- Checks camera stream freshness, system metrics
- Reports to cloud API
- Auto-restarts failed cameras (max 3 retries/10 min)
- ✅ Confirmed working — recovered camera 4 after reboot

---

## 9. Security Findings

| Finding | Severity | Location | Detail |
|---------|----------|----------|--------|
| `.env` world-readable | High | `~/clearpoint-core/.env` (mode 644) | Should be 600 |
| Device token in systemd unit | Medium | `/etc/systemd/system/clearpoint-ai.service` | Use `EnvironmentFile=` instead |
| RTSP credentials in config | Medium | `~/clearpoint-core/ai-config.json` | Plaintext in JSON |
| Default camera passwords | Medium | All 4 cameras | Factory default shared across all |
| RTSP URLs in process list | Low | `ps aux` output | Any local user can read |
| Orphaned installer package | Low | `~/cloudflared-linux-amd64.deb` (18MB) | Cleanup recommended |

---

## 10. Installation Classification

**Classification: Primarily manual installation with iterative development**

Evidence:
- Initial setup: Jun 7, 2025 (cloudflared, basic node structure, live-server.js)
- Camera scripts added: Feb 7, 2026
- AI engine developed: Feb 8-12, 2026 (multiple iterations)
- Cron configured: Feb 9, 2026
- No `.bash_history` entries matching any installer script execution
- File dates span 8+ months of incremental work
- Two separate Express start mechanisms (cron @reboot + start-clearpoint.sh)
- AI script path mismatch (start-clearpoint.sh references old path)
- Orphaned files from earlier development (yolov8s, yolox_nano, cloudflared .deb)

**Neither the older `scripts/utils/install-clearpoint.sh` nor the newer `installer/clearpoint-linux-installer.sh` created this system.** It was assembled manually through SSH sessions over multiple months.

---

## 11. Reboot Recovery Assessment

| Component | Recovers Automatically? | Mechanism | Time to Recovery |
|-----------|------------------------|-----------|-----------------|
| RAM disk mount | ✅ Yes | `/etc/fstab` | Boot time |
| Camera FFmpeg (3/4) | ✅ Yes | cron @reboot → start-clearpoint.sh | ~45-50s |
| Camera 4 (intermittent) | ⚠️ Partial | status-check.sh restarts | 5-10 min |
| Express live server | ✅ Yes | cron @reboot (×2 paths) | ~60s |
| AI detection | ✅ Yes | systemd `Restart=always` | ~10s |
| Cloudflare Tunnel | ✅ Yes | systemd | ~5s |
| VOD upload | ✅ Yes | cron */20 min | Next scheduled run |
| Health reporting | ✅ Yes | cron */5 min | Next scheduled run |

**Can this system be reproduced on a new Mini PC?** Not automatically. The setup requires:
1. OS installation (Ubuntu 24.04)
2. Manual file creation (camera scripts, .env, ai-config.json)
3. Manual package installation (Node.js, ts-node, Python, OpenVINO)
4. Manual AI model download/conversion
5. Manual systemd service creation
6. Manual cron configuration
7. Manual Cloudflare Tunnel setup
8. Camera-specific RTSP configuration

**Estimated manual reproduction time**: 2-4 hours with documentation, assuming all credentials and camera IPs are known.

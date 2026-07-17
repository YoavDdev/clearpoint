# Mini PC — Edge Device Architecture

<!--
purpose: Document the Mini PC hardware, software architecture, camera pipelines, AI engine, and on-device operations
audience: Engineers, AI assistants, field technicians
when_to_read: Before modifying edge scripts, AI detection, camera config, or device provisioning
prerequisites: MONITORING.md (health reporting), SECURITY.md (device tokens)
related_docs:
  - MONITORING.md (health metrics + alerting)
  - SECURITY.md (device token authentication)
  - DATABASE.md (mini_pcs, cameras, mini_pc_tokens tables)
source_of_truth_for: Edge device architecture, process model, camera pipelines, AI detection
confidence: Verified — traced from live production inspection + repo scripts
last_verified: 2026-07-17
owner: Engineering Lead
-->

---

## 1. Hardware Specification

| Component | Specification |
|-----------|---------------|
| **Model** | GMKtec Mini PC |
| **CPU** | Intel N150, 4 cores |
| **RAM** | 8 GB |
| **Storage** | 256 GB NVMe SSD |
| **OS** | Ubuntu 24.04.3 LTS (HWE kernel 7.0.0-28-generic) |
| **Network** | Ethernet + WiFi (depends on installation) |
| **RAM Disk** | 128 MB tmpfs at `/mnt/ram-ts` (in fstab) |

---

## 2. Directory Structure

```
~/
├── clearpoint-ai/              # AI detection engine
│   ├── detect.py               # Main AI script
│   ├── models/                 # OpenVINO IR models
│   │   ├── yolov8n_fp16.xml/.bin          # Main COCO model (active)
│   │   ├── fire_smoke_fp16.xml/.bin       # Fire/smoke model (active)
│   │   └── weapons_fp16.xml.disabled      # Weapons model (disabled)
│   └── venv/                   # Python virtual environment
│
├── clearpoint-core/            # Node.js/TypeScript tools
│   ├── uploadVods.ts           # VOD upload to BunnyCDN
│   └── .env                    # Environment variables (token, API URLs)
│
├── clearpoint-scripts/         # Camera shell scripts
│   ├── camera-<uuid>.sh        # Per-camera recording script
│   └── ...
│
├── clearpoint-recordings/      # Local VOD storage
│   └── <user_id>/
│       └── footage/
│           └── <camera_id>/
│               └── YYYY-MM-DD_HH-MM-SS.mp4
│
├── clearpoint-logs/            # Log files
│   └── ai-detect.log          # AI engine log (⚠️ no rotation!)
│
├── clearpoint-snapshots/       # AI alert images (uploaded to Supabase Storage)
│
├── live-server.js              # Express HLS server (⚠️ in home root, not in core!)
│
└── /mnt/ram-ts/                # RAM disk for live HLS segments
    └── <user_id>/
        └── live/
            └── <camera_id>/
                ├── stream.m3u8
                └── stream-XXX.ts
```

---

## 3. Process Architecture

### 3.1 Process Management (Mixed: systemd + cron)

| Process | Manager | Restart Policy |
|---------|---------|----------------|
| **AI Detection** | systemd (`clearpoint-ai.service`) | `Restart=always`, CPUQuota=200%, MemoryMax=512M |
| **Cloudflared tunnel** | systemd | `Restart=always` |
| **Camera scripts** | cron `@reboot` → `start-clearpoint.sh` | Manual restart via status-check |
| **Express HLS server** | cron `@reboot` → `start-clearpoint.sh` | No watchdog (⚠️ gap) |
| **Status check** | cron `*/5` minutes | — |
| **Disk check** | cron daily 6 AM | — |
| **VOD upload** | cron `*/20` minutes | ts-node, transcodes HEVC→H.264 |
| **AI watchdog** | cron `*/2` minutes | Redundant (systemd manages) |

### 3.2 Boot Sequence

```
@reboot → start-clearpoint.sh
  │
  ├── Detect user_id from ~/clearpoint-recordings/
  ├── For each ~/clearpoint-scripts/camera-*.sh:
  │     └── Launch camera recording + HLS in background
  ├── Kill old Express servers
  ├── Start Express live-server.js (serves HLS via HTTP)
  ├── Wait 30s for camera stabilization
  └── Start AI detect.py (⚠️ dead code path — systemd handles this)
```

---

## 4. Camera Pipeline

### 4.1 Per-Camera Script (`camera-<uuid>.sh`)

Each camera runs **3 parallel FFmpeg processes**:

```
Camera (RTSP H.265/HEVC)
        │
        ├──► FFmpeg #1: VOD Recording
        │      -c:v copy -c:a aac -ar 44100
        │      -f segment -segment_time 900 (15 min segments)
        │      Output: ~/clearpoint-recordings/<user>/<camera>/YYYY-MM-DD_HH-MM-SS.mp4
        │
        ├──► FFmpeg #2: HLS Live Streaming
        │      -c copy -f hls -hls_time 1.5 -hls_list_size 8
        │      -hls_flags "program_date_time+delete_segments+append_list"
        │      Output: /mnt/ram-ts/<user>/live/<camera>/stream.m3u8
        │
        └──► Background: Cleanup old .ts segments (every 5 min, >5 min old)
```

### 4.2 RTSP URL Format

Standard camera stream URL (built by admin UI):

```
rtsp://<username>:<password>@<ip_address>:554/h264/ch1/main/av_stream
```

Stored in `cameras.stream_path`.

### 4.3 Video Codec

| Stage | Codec | Notes |
|-------|-------|-------|
| Camera output | H.265 (HEVC) | Native camera codec |
| Local recording | Copy (HEVC) | No transcoding, direct segment |
| HLS live | Copy (HEVC) | No transcoding |
| VOD upload | H.264 (transcode) | `uploadVods.ts` re-encodes for BunnyCDN compatibility |

### 4.4 Live Streaming Architecture

```
Camera (RTSP)
    │
    ▼
FFmpeg → /mnt/ram-ts/<user>/live/<camera>/stream.m3u8 (RAM disk)
    │
    ▼
Express live-server.js (port 8080, serves HLS over HTTP)
    │
    ▼
Cloudflared tunnel → minipc.clearpoint.co.il
    │
    ▼
User dashboard (video.js player reads .m3u8)
```

**RAM disk rationale**: HLS segments are written/deleted rapidly (~1.5s each). Using RAM disk (`/mnt/ram-ts`, 128MB tmpfs) prevents SSD wear.

---

## 5. AI Detection Engine

### 5.1 Architecture

**File**: `~/clearpoint-ai/detect.py`

```
Main Process
    │
    ├── FrameGrabber threads (1 per camera)
    │     └── Continuously drain RTSP buffer, keep only latest frame
    │
    └── CameraMonitor threads (1 per camera)
          ├── Grab latest frame from FrameGrabber
          ├── Run YOLOv8n inference (OpenVINO IR FP16)
          ├── Run fire_smoke model (every 10th frame)
          ├── If detection passes confidence threshold:
          │     ├── Save annotated snapshot to clearpoint-snapshots/
          │     └── POST /api/ingest/alert with snapshot + metadata
          └── Sleep, repeat (~30s cycle per camera)
```

### 5.2 Models

| Model | Format | Classes | Runs | Status |
|-------|--------|---------|------|--------|
| `yolov8n_fp16` | OpenVINO IR (FP16) | person, vehicle, dog, cat, animal, suspicious_object, weapon | Every frame | ✅ Active |
| `fire_smoke_fp16` | OpenVINO IR (FP16) | fire, smoke | Every 10 frames | ✅ Active |
| `weapons_fp16` | OpenVINO IR (FP16) | firearms | — | ❌ Disabled (CPU too heavy) |

### 5.3 Performance

| Metric | Value |
|--------|-------|
| Frames processed per 30s per camera | ~18-19 |
| Detection time per frame | ~2s |
| Confidence threshold | 0.45 |
| Cooldown (local) | 60s between same-type detections |
| Cooldown (server) | Per alert rule (configurable) |
| CPU usage (4 cameras + 2 models) | ~77% |
| RAM usage (AI + cameras + services) | ~3.6 / 7.5 GB |
| CPU temperature (steady state) | ~75°C |

### 5.4 Detection Types

| Type | Source | Objects |
|------|--------|---------|
| `person` | COCO model | People |
| `vehicle` | COCO model | Cars, trucks, buses, motorcycles |
| `dog`, `cat`, `animal` | COCO model | Animals |
| `suspicious_object` | COCO model | Backpack, suitcase, handbag |
| `weapon` | COCO model | Knife, scissors |
| `fire` | Custom model | Fire |
| `smoke` | Custom model | Smoke |

---

## 6. Health Reporting

### 6.1 Status Check Script

**File**: `scripts/utils/status-check.sh`  
**Schedule**: cron `*/5` (every 5 minutes)  
**Actions**:

1. **Collect system metrics**: CPU temp, CPU usage, RAM, disk, load avg, uptime, process count, network connectivity
2. **Report Mini PC health**: `POST /api/ingest/mini-pc-health`
3. **Report system events**: Reboot detection, disk warnings, internet down
4. **For each camera directory**:
   - Check stream.m3u8 freshness (>60s = stale)
   - If stale/missing: attempt restart (max 3 per 10-minute window, 5-min cooldown)
   - Report camera health: `POST /api/ingest/camera-health`
   - Only update `last_checked` if stream is healthy (prevents false recovery)

### 6.2 Auto-Restart Logic

```
Stream unhealthy (missing or >60s stale)
    │
    ├── Check retry count in /tmp/clearpoint-restarts/<camera>.log
    │     └── If >= 3 retries in 10 minutes → give up, log critical failure
    │
    ├── Check last restart time
    │     └── If < 5 minutes ago → skip (cooldown)
    │
    └── If restart allowed:
          ├── pkill -9 camera-<uuid>.sh + ffmpeg
          ├── Wait 5s
          ├── Restart: bash ~/clearpoint-scripts/camera-<uuid>.sh &
          └── Log camera_restart event
```

---

## 7. VOD Upload Pipeline

**File**: `~/clearpoint-core/uploadVods.ts`  
**Schedule**: cron `*/20` (every 20 minutes)

```
1. Scan ~/clearpoint-recordings/<user>/<camera>/*.mp4
2. For each file older than threshold:
   ├── Validate MP4 integrity (probe duration)
   │     └── If corrupt (0 duration) → delete, log "corrupt_file_deleted"
   ├── Transcode HEVC → H.264 (for BunnyCDN compatibility)
   ├── Upload to BunnyCDN via pull zone
   │     └── Retry up to 3 times on failure
   ├── On success: delete local file, log "upload_success"
   └── On failure: log "upload_failed"
```

**System log events**: `upload_success` (info), `corrupt_file_deleted` (warning), `upload_failed` (error)

---

## 8. Network & Connectivity

### 8.1 Tunnel Architecture

```
Mini PC (LAN, no public IP)
    │
    └── cloudflared (systemd service)
          │
          └── Tunnel: minipc.clearpoint.co.il → localhost:8080
                                                    │
                                                    └── Express live-server.js
                                                          serves HLS .m3u8 + .ts
```

### 8.2 Remote Access (RustDesk)

| Property | Value |
|----------|-------|
| Client | RustDesk (installed on each Mini PC) |
| Local port | 20241 (bound to localhost only) |
| Relay server | 172.236.221.235 (Linode, Frankfurt) |
| Relay ports | hbbs: 21115-21116, 21118 / hbbr: 21117, 21119 |

RustDesk provides remote desktop access to Mini PCs for admin troubleshooting. Each device has a unique RustDesk ID. The relay server (self-hosted on Linode) handles NAT traversal and connection brokering.

### 8.3 Outbound Connections (from Mini PC)

| Destination | Purpose | Protocol |
|-------------|---------|----------|
| `clearpoint.co.il/api/ingest/*` | Health + alerts | HTTPS POST |
| Cloudflare tunnel | Live streaming reverse tunnel | QUIC/HTTPS |
| Backblaze B2 API | VOD upload | HTTPS |
| 172.236.221.235:21116 | RustDesk signaling | TCP |
| Camera IP (LAN) | RTSP stream | TCP :554 |
| 8.8.8.8 | Internet connectivity check | ICMP ping |
| Gateway | LAN connectivity check | ICMP ping |

---

## 9. Device Provisioning

### 9.1 Admin Workflow (Cloud Side)

1. **Create Mini PC record**: Admin creates `mini_pcs` entry (hostname, user linkage)
2. **Generate device token**: `POST /api/admin/mini-pc-tokens/create` → random token + SHA-256 hash stored
3. **Create camera records**: Admin adds cameras via `/admin/cameras/new` (name, serial, RTSP URL)
4. **Download camera script**: Admin downloads generated `camera-<uuid>.sh` from UI

### 9.2 On-Device Setup

1. **Install Ubuntu 24.04** (HWE kernel for Intel N150 support)
2. **Mount RAM disk**: Add `/mnt/ram-ts tmpfs defaults,size=128m 0 0` to fstab
3. **Install dependencies**: FFmpeg, Node.js, Python3, OpenVINO
4. **Clone/copy scripts**: Camera scripts, status-check, start-clearpoint, live-server
5. **Configure .env**: Set `CLEARPOINT_DEVICE_TOKEN` in `~/clearpoint-core/.env`
6. **Setup cloudflared**: Install + configure tunnel to `minipc.clearpoint.co.il`
7. **Setup AI engine**: Copy models, create venv, create systemd service
8. **Setup cron jobs**: `@reboot start-clearpoint.sh`, `*/5 status-check.sh`, etc.
9. **Verify health**: Confirm health data appears in admin dashboard

### 9.3 Generated Camera Script (from Admin UI)

The admin UI generates per-camera shell scripts with embedded configuration:

```bash
#!/bin/bash
# ==== Camera Info ====
USER_ID="<uuid>"
CAMERA_ID="<uuid>"
RTSP_URL="rtsp://admin:password@192.168.x.x:554/h264/ch1/main/av_stream"

# ==== Folder Paths ====
FOOTAGE_DIR=~/clearpoint-recordings/${USER_ID}/footage/${CAMERA_ID}
LIVE_DIR=/mnt/ram-ts/${USER_ID}/live/${CAMERA_ID}

mkdir -p "${FOOTAGE_DIR}" "${LIVE_DIR}"

# ==== VOD Recording ====
ffmpeg -rtsp_transport tcp -i "${RTSP_URL}" \
  -c:v copy -c:a aac -ar 44100 \
  -f segment -segment_time 900 -reset_timestamps 1 -strftime 1 \
  "${FOOTAGE_DIR}/%Y-%m-%d_%H-%M-%S.mp4" > /dev/null 2>&1 &

# ==== Live Streaming ====
ffmpeg -rtsp_transport tcp -i "${RTSP_URL}" \
  -c copy -f hls -hls_time 1.5 -hls_list_size 8 \
  -hls_flags "program_date_time+delete_segments+append_list" \
  -hls_segment_filename "${LIVE_DIR}/stream-%03d.ts" \
  "${LIVE_DIR}/stream.m3u8" > /dev/null 2>&1 &

# ==== Cleanup Old Segments ====
while true; do
  find "${LIVE_DIR}" -name "stream-*.ts" -mmin +5 -delete
  sleep 300
done &
```

---

## 10. Known Issues (See TECHNICAL_DEBT.md)

| Issue | Severity | Reference |
|-------|----------|-----------|
| No log rotation (ai-detect.log growing unbounded) | High | TD-13 |
| .env world-readable (644 permissions) | Medium | TD-9 |
| Device token hardcoded in systemd unit | Medium | TD-9 |
| Express server has no watchdog | Medium | — |
| start-clearpoint.sh AI section is dead code (wrong path) | Low | — |
| AI watchdog cron is redundant with systemd | Low | — |
| Orphaned files (~90MB) on production device | Low | — |
| live-server.js in home root (not in clearpoint-core) | Low | — |

---

## 11. Supported Camera Models

Current production cameras: **4 cameras per installation** (H.265/HEVC codec)

| Camera | IP | Status |
|--------|-----|--------|
| כניסה (Entrance) | .101 | Stable |
| חצר (Yard) | .102 | Stable |
| מרפסת (Balcony) | .103 | Stable |
| חניה (Parking) | .104 | Intermittent RTSP drops (auto-recovered by status-check) |

Camera credentials stored in each `camera-<uuid>.sh` script and in `cameras.stream_path` column (RTSP URL includes username:password).

---

*Document verified against live production Mini PC inspection + repo scripts on 2026-07-17.*

# Clearpoint Security — System Architecture

<!--
purpose: Definitive architecture document covering physical, logical, runtime, deployment,
  data flow, security, and failure architecture — split into Current Reality and Target Architecture
audience: All engineers, AI assistants, system architects
when_to_read: Before making any architectural decision or working on system-level changes
prerequisites: MANIFESTO.md, PROJECT_BIBLE.md
related_docs:
  - MANIFESTO.md (engineering philosophy)
  - PROJECT_BIBLE.md (system overview)
  - DATABASE.md (schema reference)
  - API_REFERENCE.md (endpoint reference)
  - SECURITY.md (auth and threat model)
  - MINI_PC.md (on-premises hardware)
  - MONITORING.md (health and alerting)
  - docs/architecture/ (Architecture Decision Records)
source_of_truth_for: System architecture, component design, data flows, trust boundaries,
  deployment model, failure modes, and architectural evolution
confidence: Verified — architecture claims traced to source code; deployment-specific
  observations (hardware, performance) moved to CURRENT_DEPLOYMENT.md (see Evidence Sources)
last_verified: 2026-07-17 (coordinated update with deployment inspection)
owner: Engineering Lead
-->

> Every diagram and description in this document is labeled:
> - **[Current]** — Verified from the running implementation
> - **[Planned]** — Agreed upon but not yet implemented
> - **[Deprecated]** — Was once true but no longer applies

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Physical Architecture](#2-physical-architecture)
3. [Logical Architecture](#3-logical-architecture)
4. [Runtime Architecture](#4-runtime-architecture)
5. [Deployment Architecture](#5-deployment-architecture)
6. [Data Flow Architecture](#6-data-flow-architecture)
7. [Security Architecture](#7-security-architecture)
8. [Failure Architecture](#8-failure-architecture)
9. [Subsystem Deep Dives](#9-subsystem-deep-dives)
10. [Architectural Evolution](#10-architectural-evolution)

---

## 1. System Overview

Clearpoint Security is a distributed video surveillance system with three execution domains:

| Domain | Location | Responsibilities |
|--------|----------|-----------------|
| **Edge (Mini PC)** | Customer premises | Video recording, live streaming, AI detection, health reporting |
| **Cloud (Vercel + Supabase)** | Internet | Dashboard, APIs, billing, monitoring, user management |
| **CDN (Bunny + Backblaze B2)** | Internet | VOD storage, VOD delivery via signed URLs |

**[Current]** The system operates with a single cloud region (Vercel `iad1`) and per-customer edge nodes.

---

## 2. Physical Architecture

### 2.1 Current Implementation

**[Current]** Each customer site has:

```
┌─────────────────────────────────────── Customer Site ──────────────────────────────────────┐
│                                                                                            │
│  ┌──────────────┐    PoE     ┌───────────┐    Ethernet    ┌──────────────────────────────┐ │
│  │  IP Camera 1 │◄──────────►│           │◄──────────────►│  GMKtec Mini PC              │ │
│  │  (Dahua/HK)  │            │   PoE     │                │  ┌─────────────────────────┐ │ │
│  ├──────────────┤            │  Switch   │                │  │ Ubuntu 24.04 LTS        │ │ │
│  │  IP Camera 2 │◄──────────►│  (8-port) │                │  │ Intel N150, 4 cores     │ │ │
│  ├──────────────┤            │           │                │  │ 8 GB RAM                │ │ │
│  │  IP Camera 3 │◄──────────►│           │                │  │ 256 GB SSD              │ │ │
│  ├──────────────┤            └───────────┘                │  └─────────────────────────┘ │ │
│  │  IP Camera 4 │◄──────────►      │                      └──────────────────────────────┘ │
│  └──────────────┘                  │                                    │                   │
│                                    │                                   │                   │
│                          ┌─────────┴─────────┐                         │                   │
│                          │  SIM Router (A)    │◄────────────────────────┘                   │
│                          │  or Wi-Fi (B)      │                                             │
│                          │  or None (C)       │                                             │
│                          └─────────┬─────────┘                                              │
└────────────────────────────────────┼────────────────────────────────────────────────────────┘
                                     │ Internet
                                     ▼
```

**Hardware requirements** — minimum specs implied by code and installer scripts (not enforced at runtime):
- **Mini PC**: x86_64 architecture, minimum 4 CPU cores (AI CPUQuota=200%), minimum 8 GB RAM — *Inferred from `setup-ai.sh` resource limits and deployment observation. No code enforces a specific brand or model.*
- **Cameras**: IP cameras with RTSP support, H.265/HEVC output — *Inferred from camera scripts (`-c copy` implies codec passthrough). No code enforces resolution, fps, or bitrate settings.*
- **Networking**: SIM router (Plan A) or customer Wi-Fi (Plan B) or local-only NVR (Plan C) — *Source: `New-Clearpoint_Plans_Overview.md`. `user-cameras/route.ts` references `connection_type` from the `plans` table. Cloud features require internet connectivity.*
- **RAM disk**: 128 MB tmpfs at `/mnt/ram-ts` — `Verified` from `install-clearpoint.sh` line 60 and `clearpoint-linux-installer.sh` line 244

> **Deployment-specific hardware**: The current production Mini PC uses Intel N150 (4 cores), 8 GB RAM, 256 GB NVMe. See `CURRENT_DEPLOYMENT.md` for exact specifications. These are characteristics of the installed system, not architectural requirements.

### 2.2 Target Architecture

**[Planned]** No hardware changes currently in the repository or installer roadmap.

> **Rationale** (not a verified fact): The current hardware configuration has been observed as stable in field deployment. This is an operational judgment, not a code-verified property.

Potential future consideration: Multi-site customers with a centralized admin view. No timeline.

### 2.3 Gap Analysis

| Gap | Severity | Notes |
|-----|----------|-------|
| No hardware redundancy | Low | Single Mini PC per site. Acceptable for residential/small business. |
| No UPS integration | Low | Power loss stops recording until reboot. Cron `@reboot` auto-recovers. |

---

## 3. Logical Architecture

### 3.1 Current Implementation

**[Current]** The system consists of the following logical components:

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              CLOUD PLATFORM                                         │
│                                                                                     │
│  ┌─────────────────────┐    ┌──────────────────────┐    ┌──────────────────────┐   │
│  │   Next.js App        │    │   Supabase            │    │   External Services  │   │
│  │   (Vercel)           │    │                       │    │                      │   │
│  │                      │    │   ┌────────────────┐  │    │  PayPlus (billing)   │   │
│  │  ┌────────────────┐  │    │   │  PostgreSQL    │  │    │  Resend (email)      │   │
│  │  │ Dashboard UI   │  │    │   │  + RLS         │  │    │  Backblaze B2        │   │
│  │  │ (React/SSR)    │  │    │   └────────────────┘  │    │  (VOD storage)       │   │
│  │  ├────────────────┤  │    │   ┌────────────────┐  │    │  Bunny CDN           │   │
│  │  │ Admin Panel    │  │◄──►│   │  Storage       │  │    │  (VOD delivery)      │   │
│  │  │ (React/SSR)    │  │    │   │  (snapshots)   │  │    │  Cloudflare          │   │
│  │  ├────────────────┤  │    │   └────────────────┘  │    │  (DNS + Tunnel)      │   │
│  │  │ API Routes     │  │    │   ┌────────────────┐  │    │                      │   │
│  │  │ (Serverless)   │  │    │   │  Auth           │  │    └──────────────────────┘   │
│  │  ├────────────────┤  │    │   │  (Identity)    │  │                                │
│  │  │ Cron Jobs      │  │    │   └────────────────┘  │                                │
│  │  │ (Vercel Cron)  │  │    │                       │                                │
│  │  ├────────────────┤  │    └──────────────────────┘                                 │
│  │  │ Webhooks       │  │                                                             │
│  │  │ (PayPlus)      │  │                                                             │
│  │  └────────────────┘  │                                                             │
│  └─────────────────────┘                                                              │
└─────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              EDGE NODE (per customer)                                │
│                                                                                     │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐                   │
│  │  FFmpeg           │  │  Express Server   │  │  AI Engine        │                  │
│  │  (per camera)     │  │  (live-server.js) │  │  (detect.py)      │                  │
│  │                   │  │                   │  │                   │                   │
│  │  - RTSP → HLS     │  │  - Serves HLS     │  │  - YOLOv8n        │                  │
│  │  - RTSP → MP4     │  │    from RAM disk   │  │  - OpenVINO IR    │                  │
│  │  - RAM disk live   │  │  - Port 8080      │  │  - Fire/smoke     │                  │
│  │  - Disk recording  │  │  - CORS enabled    │  │  - Alert sender   │                  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘                   │
│                                                                                     │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐                   │
│  │  uploadVods.ts    │  │  status-check.sh  │  │  cloudflared       │                  │
│  │  (cron: */20 min) │  │  (cron: */5 min)  │  │  (tunnel daemon)  │                  │
│  │                   │  │                   │  │                   │                   │
│  │  - MP4 → B2       │  │  - System metrics  │  │  - Exposes 8080   │                  │
│  │  - Signed URLs    │  │  - Camera health   │  │  - HTTPS to       │                  │
│  │  - API metadata   │  │  - Auto-restart    │  │    *.clearpoint    │                  │
│  │  - Cleanup local  │  │  - Failure detect   │  │    .co.il         │                  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘                   │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Target Architecture

**[Planned]**:
- Structured logging from edge nodes (replace `console.log` with log shipping)
- Centralized error monitoring (Sentry or similar) for cloud APIs
- Rate limiting on public-facing ingest endpoints

### 3.3 Gap Analysis

| Gap | Severity | Notes |
|-----|----------|-------|
| No centralized logging from edge | Medium | Edge logs stay on Mini PC only, viewable via SSH |
| No APM/error monitoring for cloud | High | API errors visible only in Vercel function logs |
| No rate limiting on ingest APIs | Medium | Device token auth is the only protection |

---

## 4. Runtime Architecture

### 4.1 Current Implementation — Edge Node

**[Current]** The Mini PC runs the following process types. Process management varies by deployment — see note below.

| Process Type | Lifecycle | Schedule / Trigger | Purpose |
|-------------|-----------|-------------------|---------|
| `camera-{id}.sh` (×N cameras) | Continuous | See note below | Per camera: 3 processes (see below) |
| `live-server.js` | Continuous | See note below | Express server on port 8080, serves HLS from `/mnt/ram-ts` |
| `detect.py` | Continuous | systemd (`clearpoint-ai.service`) | AI detection engine with per-camera threads |
| `uploadVods.ts` | Periodic | cron `*/20 min` | Upload MP4 recordings to Backblaze B2 (with HEVC→H.264 transcode) |
| `status-check.sh` | Periodic | cron `*/5 min` | Report Mini PC + camera health to cloud API; restart failed cameras |
| `disk-check.sh` | Periodic | cron daily 6:00 AM | Local disk usage alert |
| `cloudflared` | Continuous | systemd | Cloudflare Tunnel exposing port 8080 |

**Per-camera process model**: Each `camera-{id}.sh` spawns 3 background processes:
1. **FFmpeg recording**: RTSP → MP4 segments (codec copy, `segment_time 900` = 15 min)
2. **FFmpeg HLS**: RTSP → HLS segments (codec copy, configurable `hls_time` and `hls_list_size`)
3. **Cleanup loop**: Bash loop deleting old `.ts` segments periodically

Total OS process count varies by camera count and is not a fixed number.

> **Process management — repository installer paths:**
>
> | Installer | Camera processes | AI engine | Express server | Periodic tasks |
> |-----------|-----------------|-----------|----------------|---------------|
> | `scripts/utils/install-clearpoint.sh` (older) | cron `@reboot` via `start-clearpoint.sh`; also installs `.service` files if present | Started by `start-clearpoint.sh` after 30s delay; cron `*/2 min` watchdog | Started by `start-clearpoint.sh`; cron `@reboot` as backup | `setup-cron.sh` installs all cron jobs |
> | `installer/clearpoint-linux-installer.sh` (newer, v1.0) | **systemd** services with `Restart=always` | Not configured (relies on separate `setup-ai.sh`) | Copied but no systemd service created | Runs `setup-cron.sh` if available |
> | `scripts/ai/setup-ai.sh` | N/A | **systemd** `clearpoint-ai.service` with `Restart=always`, `CPUQuota=200%` | N/A | N/A |
>
> **The current production Mini PC was manually assembled** through iterative SSH sessions, not cleanly produced by either repository installer. See `CURRENT_DEPLOYMENT.md` for the exact installed state.

**Process lifecycle**: `start-clearpoint.sh` is the main bootstrap:
1. Discovers camera scripts in `~/clearpoint-scripts/`
2. Starts each `camera-{id}.sh` in background
3. Starts Express live server
4. Waits 30 seconds for cameras to stabilize
5. Starts AI detection engine

**Self-healing**: `status-check.sh` (every 5 min):
- Checks each camera's `stream.m3u8` freshness (>60s = stale)
- Restarts failed camera processes (max 3 retries in 10-minute window)
- Reports permanent failures to cloud API as system logs
- Reports Mini PC health metrics (CPU, RAM, disk, temp, network)

### 4.2 Current Implementation — Cloud

**[Current]** Vercel serverless functions:

| Component | Runtime | Characteristics |
|-----------|---------|-----------------|
| API routes | Node.js (serverless) | Stateless, cold starts, 60s max duration for cron |
| Dashboard | React SSR + client | Session-based auth via NextAuth |
| Cron jobs | Vercel Cron | 2 registered in `vercel.json`, 3 others exist but are unregistered |

**Registered cron jobs** (`vercel.json`):
- `sync-payplus-recurring` — daily 4:00 AM UTC
- `cleanup-logs` — daily 3:00 AM UTC

**Unregistered cron jobs** (exist in code but not in `vercel.json`):
- `process-trials` — ⚠️ not scheduled
- `process-cancellations` — ⚠️ not scheduled
- `resume-paused` — ⚠️ not scheduled

### 4.3 Target Architecture

**[Planned]**:
- Register all 5 cron jobs in `vercel.json`
- Standardize all continuous edge processes on systemd (AI already uses systemd; cameras and Express still use cron `@reboot`)
- Add process supervision (systemd `Restart=always`) for cameras and Express
- Add log rotation for all edge logs (logrotate config, retention limits, compression)
- Consider edge-side log buffer that ships to cloud API

### 4.4 Gap Analysis

| Gap | Severity | Notes |
|-----|----------|-------|
| 3 cron jobs exist but unregistered | High | `process-trials`, `process-cancellations`, `resume-paused` never run |
| Camera + Express processes managed by cron, not systemd | Medium | AI uses systemd; cameras and Express still rely on cron `@reboot` via `start-clearpoint.sh`. Inconsistent. |
| No process supervision for `live-server.js` | Medium | If Express crashes, no automatic restart until next reboot |

---

## 5. Deployment Architecture

### 5.1 Current Implementation

**[Current]**

```
┌──────────────────────────────────────────────────────────────────┐
│                     DEPLOYMENT TOPOLOGY                          │
│                                                                  │
│  ┌──────────────────────────┐                                    │
│  │  GitHub Repository        │                                   │
│  │  clearpoint-security      │                                   │
│  └──────────┬───────────────┘                                    │
│             │ git push                                           │
│             ▼                                                    │
│  ┌──────────────────────────┐     ┌────────────────────────┐    │
│  │  Vercel                   │     │  Supabase               │   │
│  │  Region: iad1 (Virginia)  │────►│  (Managed PostgreSQL)   │   │
│  │                           │     │  (Managed Storage)      │   │
│  │  - Next.js build          │     │  (Managed Auth)         │   │
│  │  - Serverless functions   │     └────────────────────────┘    │
│  │  - Cron scheduler         │                                   │
│  │  - Edge network (CDN)     │     ┌────────────────────────┐    │
│  └──────────────────────────┘     │  Cloudflare              │   │
│                                    │  - DNS (clearpoint.co.il)│   │
│  ┌──────────────────────────┐     │  - Tunnel (per customer) │   │
│  │  Mini PC (per customer)   │     │  - SSL termination      │   │
│  │                           │────►│                          │   │
│  │  - USB installer          │     └────────────────────────┘    │
│  │  - Manual SSH setup       │                                   │
│  │  - No CI/CD pipeline      │     ┌────────────────────────┐    │
│  └──────────────────────────┘     │  Backblaze B2 + Bunny   │   │
│                                    │  - VOD object storage    │   │
│                                    │  - CDN with signed URLs  │   │
│                                    └────────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
```

**Cloud deployment**: Automatic via Vercel on `git push`. The target branch is configured in the Vercel dashboard (not in any repository file).

**Edge deployment**: Two installer paths exist in the repository:

1. **Newer installer** (`installer/clearpoint-linux-installer.sh` v1.0):
   - `prepare-usb.ps1` creates USB with installer + camera scripts + `.env`
   - Interactive GUI wizard on fresh Ubuntu 24.04
   - Installs camera processes as **systemd services**
   - Runs `setup-cron.sh` for periodic tasks
   - Does **not** install AI engine (requires separate `setup-ai.sh`)

2. **Older installer** (`scripts/utils/install-clearpoint.sh`):
   - Copies files, sets up RAM disk, configures all tasks via cron
   - Also installs camera `.service` files if present in the source directory
   - Runs `setup-cron.sh` and `setup-ai.sh` if available

3. Admin manually creates Cloudflare Tunnel and DNS records (both paths)

> **Current production state**: The inspected production Mini PC was **manually assembled** through iterative SSH sessions over multiple months. It does not exactly represent either installer path. See `CURRENT_DEPLOYMENT.md` for the actual installed state.

### 5.2 Target Architecture

**[Planned]** — from `installer-v2-design.md`:
- GUI installer wizard for Ubuntu
- Automatic Cloudflare Tunnel creation via API
- Automatic DNS record creation
- Device token provisioning during install
- Post-install validation suite

### 5.3 Gap Analysis

| Gap | Severity | Notes |
|-----|----------|-------|
| No remote update mechanism for edge nodes | High | Code changes require SSH access per Mini PC |
| No CI/CD for edge deployment | Medium | USB-based, manual process |
| Cloudflare Tunnel setup is manual | Medium | Requires admin to create tunnel + DNS records in Cloudflare dashboard |
| No edge version tracking | Medium | No way to know which code version each Mini PC runs |

---

## 6. Data Flow Architecture

### 6.1 Live Streaming — [Current]

```
Camera (RTSP)                    Mini PC                       Cloud                 Browser
     │                              │                            │                      │
     │  RTSP stream (H.265/HEVC)    │                            │                      │
     │─────────────────────────────►│                            │                      │
     │                              │                            │                      │
     │                    FFmpeg: codec copy                     │                      │
     │                    (H.265 passthrough, no transcode)      │                      │
     │                    → HLS segments on RAM disk             │                      │
     │                    /mnt/ram-ts/{userId}/                  │                      │
     │                      live/{cameraId}/                     │                      │
     │                      stream.m3u8 + *.ts                   │                      │
     │                              │                            │                      │
     │                    Express serves HLS                     │                      │
     │                    on port 8080                            │                      │
     │                              │                            │                      │
     │                    Cloudflare Tunnel                       │                      │
     │                    exposes port 8080 as                    │                      │
     │                    https://{tunnel}.                       │                      │
     │                    clearpoint.co.il                        │                      │
     │                              │──────────────────────────►│                      │
     │                              │                            │                      │
     │                              │                            │  HLS.js player       │
     │                              │                            │  loads stream.m3u8   │
     │                              │                            │◄─────────────────────│
     │                              │◄───────────────────────────┼──────────────────────│
     │                              │  .ts segments via tunnel   │                      │
     │                              │───────────────────────────►│─────────────────────►│
```

**URL format**: `https://{tunnel_name}.clearpoint.co.il/{camera_id}/stream.m3u8`
- `tunnel_name` is stored per-user in the `users` table — `Verified`
- `camera_id` is the UUID from the `cameras` table — `Verified`
- HLS.js client library handles playback in browser — `Verified`
- Express server uses CORS `*` and no-cache headers — `Verified`

**Codec pipeline** — `Verified` from camera scripts and deployment inspection:
- Input: RTSP H.265/HEVC from camera
- Live HLS: H.265 passthrough (`-c copy`, no transcoding)
- HLS parameters: configurable per camera script (e.g., `hls_time 1.5`, `hls_list_size 8`)
- Storage: RAM disk (tmpfs 128 MB), segments auto-evicted by FFmpeg `delete_segments` flag

> ⚠️ **Browser compatibility**: The live stream is H.265/HEVC. Playback requires browser HEVC support via MSE (Media Source Extensions) or native HLS handling. Not all browsers support HEVC — compatibility must be validated per target environment. This is NOT universally browser-compatible H.264.

### 6.2 VOD Recording & Upload — [Current]

```
Camera (RTSP)          Mini PC                Backblaze B2        Bunny CDN          Browser
     │                    │                       │                   │                  │
     │  RTSP stream       │                       │                   │                  │
     │───────────────────►│                       │                   │                  │
     │                    │                       │                   │                  │
     │            FFmpeg records to               │                   │                  │
     │            ~/clearpoint-recordings/        │                   │                  │
     │            {userId}/footage/{cameraId}/    │                   │                  │
     │            YYYY-MM-DD_HH-MM-SS.mp4        │                   │                  │
     │                    │                       │                   │                  │
     │         Every 20 min: uploadVods.ts        │                   │                  │
     │                    │                       │                   │                  │
     │            1. Check VOD context            │                   │                  │
     │               (subscription active?)       │                   │                  │
     │            2. Validate MP4 (ffprobe)       │                   │                  │
     │            3. Transcode H.265→H.264        │                   │                  │
     │               if needed                     │                   │                  │
     │            4. Upload to B2                  │                   │                  │
     │                    │───────────────────────►│                   │                  │
     │            5. Generate signed Bunny URL     │                   │                  │
     │            6. Log VOD file via API          │                   │                  │
     │                    │──────────────────────────────────────────►│                  │
     │            7. Delete local MP4              │                   │                  │
     │                    │                       │                   │                  │
     │                    │                       │    User requests   │                  │
     │                    │                       │    footage page    │                  │
     │                    │                       │                   │◄─────────────────│
     │                    │                       │◄──────────────────│  Fetch via CDN   │
     │                    │                       │──────────────────►│─────────────────►│
```

**B2 object key format**: `{user_id}/{camera_id}/{filename}.mp4` — `Verified`
**Signed URL**: HMAC-SHA256 with `BUNNY_TOKEN_KEY`, 14-day expiry — `Verified`
**Subscription check**: `vod-context` API verifies active subscription before allowing upload — `Verified`
**Transcoding**: H.265 → H.264 via FFmpeg (`libx264 -preset veryfast -crf 23`) — `Verified`
**Concurrency**: Configurable via `UPLOAD_CONCURRENCY` env var (default 1) — `Verified`
**File locking**: PID-based lock file at `/tmp/clearpoint-uploadVods.lock` — `Verified`

### 6.3 AI Detection & Alerting — [Current]

```
Camera (RTSP)          Mini PC (detect.py)               Cloud API              Dashboard
     │                    │                                  │                      │
     │  RTSP stream       │                                  │                      │
     │───────────────────►│                                  │                      │
     │                    │                                  │                      │
     │           FrameGrabber thread                         │                      │
     │           (drains RTSP buffer,                        │                      │
     │            keeps latest frame only)                   │                      │
     │                    │                                  │                      │
     │           CameraMonitor thread                        │                      │
     │           per camera                                  │                      │
     │                    │                                  │                      │
     │           YOLOv8n inference                           │                      │
     │           (OpenVINO IR FP16)                          │                      │
     │           Every frame (continuous)                    │                      │
     │                    │                                  │                      │
     │           If detection found:                         │                      │
     │           1. Check 60s local cooldown                 │                      │
     │           2. Draw bounding boxes                      │                      │
     │           3. Encode snapshot (JPEG 60%)               │                      │
     │           4. POST /api/ingest/alert                   │                      │
     │                    │─────────────────────────────────►│                      │
     │                    │                                  │                      │
     │                    │              Server-side:         │                      │
     │                    │              1. Validate token    │                      │
     │                    │              2. Resolve Mini PC   │                      │
     │                    │              3. Check alert rules │                      │
     │                    │              4. Enforce cooldown  │                      │
     │                    │              5. Upload snapshot   │                      │
     │                    │              6. Insert alert      │                      │
     │                    │                                  │─────────────────────►│
     │                    │                                  │    Alert visible      │
     │                    │                                  │    in dashboard       │
```

**Detection types** — `Verified`:
- `person`, `vehicle`, `dog`, `cat`, `animal`, `suspicious_object` (backpack/suitcase/handbag), `weapon` (knife/scissors), `fire`, `smoke`

**Model architecture** — `Verified`:
- Primary: YOLOv8n (nano) → OpenVINO IR FP16, 640×640 input
- Secondary: Fire/smoke model (custom ONNX), runs every 10 frames
- Confidence threshold: 0.45 (low — server-side alert rules control filtering)
- NMS IoU threshold: 0.45

**Performance architecture** — mechanism documented, throughput is deployment-specific:
- `analysis_fps` configured in `ai-config.json` (per-deployment setting) — controls target frame grab rate
- CPUQuota: 200% — `Verified` from `setup-ai.sh` (systemd service definition)
- MemoryMax: configurable in systemd service (default in `setup-ai.sh`: 1G)
- Actual throughput depends on: hardware (CPU model, core count), camera count, stream resolution/codec, model complexity, and system load
- Cooldown: 60s local per (camera_id, detection_type) — `Verified` from `detect.py`. Server enforces per-rule cooldown — `Verified` from `alert/route.ts`
- For measured performance on the current production deployment, see `CURRENT_DEPLOYMENT.md`

**Hourly summary**: `detect.py` sends a single system log per hour with frames analyzed, detections, and camera status — `Verified`

### 6.4 Health Monitoring — [Current]

```
Mini PC (status-check.sh)              Cloud API                    Admin Dashboard
     │                                    │                              │
     │  Every 5 min:                      │                              │
     │                                    │                              │
     │  1. Collect system metrics         │                              │
     │     CPU temp, usage, RAM,          │                              │
     │     disk, load, uptime,            │                              │
     │     network, video file count      │                              │
     │                                    │                              │
     │  2. POST /api/ingest/              │                              │
     │     mini-pc-health                 │                              │
     │  ─────────────────────────────────►│                              │
     │                                    │  Upsert mini_pc_health       │
     │                                    │                              │
     │  3. For each camera:               │                              │
     │     Check stream.m3u8 freshness    │                              │
     │                                    │                              │
     │  4. POST /api/ingest/              │                              │
     │     camera-health (per camera)     │                              │
     │  ─────────────────────────────────►│                              │
     │                                    │  Upsert camera_health        │
     │                                    │                              │
     │  5. If camera stale/missing:       │                              │
     │     Restart FFmpeg process          │                              │
     │     (max 3 retries / 10 min)       │                              │
     │                                    │                              │
     │  6. If noteworthy event:           │                              │
     │     POST /api/ingest/system-log    │                              │
     │     (reboot, disk critical,        │                              │
     │      internet down, camera fail)   │                              │
     │  ─────────────────────────────────►│                              │
     │                                    │  Insert system_logs          │
     │                                    │──────────────────────────────►│
     │                                    │  Admin sees real-time health │
```

**Health thresholds** — `Verified` from `status-check.sh` lines 121–131 and 182–190:

Overall Mini PC status determination:
- **Critical**: CPU > 100°C, OR disk > 90%, OR RAM > 90 (note: RAM comparison uses string `>` instead of integer `-gt` — likely a bug in `status-check.sh` line 125)
- **Warning**: internet down, OR CPU > 93°C, OR disk > 75%

System log thresholds (separate from status):
- **disk_critical**: disk > 90% → logs `error` severity
- **disk_warning**: disk > 85% → logs `warning` severity

Camera health:
- **Camera stale**: `stream.m3u8` not updated in 60 seconds (`status-check.sh` line 241)

### 6.5 Payment & Billing — [Current]

```
Admin creates customer          PayPlus                    Vercel Cron
     │                              │                          │
     │  POST /api/admin/            │                          │
     │  create-user-and-payment     │                          │
     │──────────────────────────►   │                          │
     │                              │                          │
     │  Create recurring payment    │                          │
     │  link via PayPlus API        │                          │
     │  ──────────────────────────►│                          │
     │                              │                          │
     │  Customer pays via link      │                          │
     │                              │                          │
     │  PayPlus webhook             │                          │
     │  POST /api/webhooks/payplus  │                          │
     │◄─────────────────────────────│                          │
     │                              │                          │
     │  Update subscription status  │                          │
     │                              │                          │
     │                              │  Daily 4 AM:             │
     │                              │  sync-payplus-recurring  │
     │                              │◄─────────────────────────│
     │                              │  Reconcile payment status│
```

---

## 7. Security Architecture

### 7.1 Trust Boundaries — [Current]

```
┌───────────────────────────────────────────────────────────────────────────────┐
│  UNTRUSTED                                                                    │
│                                                                               │
│  ┌─────────────┐     ┌─────────────────────────────────────────────────┐     │
│  │  Public      │     │  SEMI-TRUSTED (Device Token)                    │     │
│  │  Internet    │     │                                                 │     │
│  │              │     │  Mini PC communicates with cloud using           │     │
│  │  - Browsers  │     │  x-clearpoint-device-token header               │     │
│  │  - Bots      │     │                                                 │     │
│  │  - Attackers │     │  Can access:                                    │     │
│  │              │     │  - /api/ingest/* (health, alerts, VOD, logs)    │     │
│  │              │     │  - Only data belonging to its own Mini PC       │     │
│  │              │     │                                                 │     │
│  └─────────────┘     └─────────────────────────────────────────────────┘     │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐     │
│  │  TRUSTED (Session)                                                   │     │
│  │                                                                     │     │
│  │  ┌─────────────────────────┐    ┌───────────────────────────────┐  │     │
│  │  │  Customer (NextAuth)     │    │  Admin (NextAuth + role)      │  │     │
│  │  │                          │    │                               │  │     │
│  │  │  Can access:             │    │  Can access:                  │  │     │
│  │  │  - /dashboard/*          │    │  - /admin/*                   │  │     │
│  │  │  - Own cameras only      │    │  - All user data              │  │     │
│  │  │  - Own footage only      │    │  - System management          │  │     │
│  │  │  (RLS enforced)          │    │  (service role key)           │  │     │
│  │  └─────────────────────────┘    └───────────────────────────────┘  │     │
│  └─────────────────────────────────────────────────────────────────────┘     │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐     │
│  │  HIGHLY TRUSTED (Service Role)                                       │     │
│  │                                                                     │     │
│  │  Server-side only. Bypasses RLS.                                    │     │
│  │  Used by: Cron jobs, webhooks, admin API routes                     │     │
│  │  ⚠️ Some admin routes lack session checks — treated as service     │     │
│  │     role with no auth gate (see TECHNICAL_DEBT.md)                  │     │
│  └─────────────────────────────────────────────────────────────────────┘     │
└───────────────────────────────────────────────────────────────────────────────┘
```

### 7.2 Authentication Methods — [Current]

| Method | Used By | Mechanism | Verified |
|--------|---------|-----------|----------|
| NextAuth session | Dashboard users | `CredentialsProvider` → Supabase Auth REST API (no adapter) | ✅ |
| NextAuth session + admin role check | Admin panel (5 routes) | `getServerSession` + role = 'admin' | ✅ |
| Device token | Mini PC → ingest APIs | `x-clearpoint-device-token` header, SHA-256 hash lookup | ✅ |
| `CRON_SECRET` | Vercel cron jobs (4 routes) | `Authorization: Bearer` header check | ✅ (see cron detail below) |
| Service role key (no auth gate) | 39 admin API routes | Direct Supabase service role, no session check | ⚠️ |
| PayPlus webhook signature | Payment webhooks | `hash` header verification | ✅ |

**Cron route auth detail** — `Verified` per route:

| Route | File | Has `CRON_SECRET` check? | Evidence |
|-------|------|------------------------|----------|
| `sync-payplus-recurring` | `src/app/api/cron/sync-payplus-recurring/route.ts` | ✅ Yes | Line 53: `authHeader === \`Bearer ${process.env.CRON_SECRET}\`` |
| `process-trials` | `src/app/api/cron/process-trials/route.ts` | ✅ Yes | Line 22: `authHeader !== \`Bearer ${process.env.CRON_SECRET}\`` |
| `process-cancellations` | `src/app/api/cron/process-cancellations/route.ts` | ✅ Yes | Line 22: same pattern |
| `resume-paused` | `src/app/api/cron/resume-paused/route.ts` | ✅ Yes | Line 22: same pattern |
| `cleanup-logs` | `src/app/api/cron/cleanup-logs/route.ts` | ❌ **No** | No auth check at all — directly calls `supabase.from("system_logs").delete()` |

### 7.3 Network Boundaries — [Current]

```
                                    ┌────────────────────────┐
                                    │  Cloudflare DNS        │
                                    │  clearpoint.co.il      │
                                    │                        │
                                    │  *.clearpoint.co.il    │
                                    │  → Cloudflare Tunnel   │
                                    │  → Mini PC :8080       │
                                    │                        │
                                    │  www.clearpoint.co.il  │
                                    │  → Vercel              │
                                    └────────────────────────┘
                                              │
                    ┌─────────────────────────┼──────────────────────────┐
                    │                         │                          │
          ┌─────────▼──────────┐   ┌─────────▼──────────┐   ┌─────────▼──────────┐
          │  Customer site      │   │  Vercel (iad1)      │   │  Supabase          │
          │                     │   │                     │   │  (Managed)         │
          │  Mini PC (:8080)    │   │  API + Dashboard    │   │  PostgreSQL        │
          │  Cameras (RTSP      │   │  Serverless fns     │   │  Storage           │
          │   local only)       │   │                     │   │                    │
          │                     │   └─────────────────────┘   └────────────────────┘
          │  Outbound only:     │               │
          │  - HTTPS to API     │               │
          │  - HTTPS to B2      │   ┌───────────▼────────────┐
          │  - Tunnel to CF     │   │  External services      │
          │                     │   │  PayPlus, Resend,       │
          └─────────────────────┘   │  Backblaze B2, Bunny   │
                                    └────────────────────────┘
```

**Key security property**: Mini PCs have **no inbound ports open**. All connectivity is outbound via Cloudflare Tunnel (live stream) and HTTPS (API calls, B2 uploads). Cameras are on local network only, not internet-accessible.

### 7.4 Target Architecture

**[Planned]**:
- Add session checks to all 39 unprotected admin API routes
- Add `CRON_SECRET` validation to `cleanup-logs` (the only cron route missing it)
- Remove hardcoded `BUNNY_TOKEN_KEY` from `uploadVods.ts`
- Complete device token migration (remove any remaining service role key usage on edge)

### 7.5 Gap Analysis

| Gap | Severity | Notes |
|-----|----------|-------|
| 39 admin routes without auth | **Critical** | Publicly accessible admin operations. See `TECHNICAL_DEBT.md`. |
| 1 cron route (`cleanup-logs`) without `CRON_SECRET` | High | Can be invoked by anyone who knows the URL |
| `BUNNY_TOKEN_KEY` hardcoded | High | Token visible in source code |
| No HTTPS between cameras and Mini PC | Low | Acceptable — cameras are on isolated local network |
| No mutual TLS on Cloudflare Tunnel | Low | Cloudflare handles SSL termination; acceptable for current scale |

---

## 8. Failure Architecture

### 8.1 Failure Modes and Recovery — [Current]

| Failure | Detection | Recovery | Automatic? |
|---------|-----------|----------|------------|
| Camera stream stops | `status-check.sh` checks `m3u8` age > 60s | Kill + restart FFmpeg process | ✅ Yes (max 3 retries / 10 min) |
| Camera permanently fails | 3 restart failures in 10 minutes | Log `camera_failure` (critical) to cloud API | ✅ Detection only, manual fix |
| Mini PC reboots | `@reboot` cron triggers `start-clearpoint.sh` | All processes restart automatically | ✅ Yes |
| Mini PC reboot detected | `status-check.sh` detects uptime < 300s | Logs `minipc_reboot` warning to cloud API | ✅ Yes |
| Internet goes down | `status-check.sh` pings 8.8.8.8 | Logs `internet_down` error. Local recording continues. | ✅ Detection only |
| Disk critically full | `status-check.sh` checks `/` usage > 90% | Logs `disk_critical` error to cloud API | ✅ Detection only |
| AI engine crashes | systemd `Restart=always` (primary); optional cron `*/2 min` watchdog (backup) | systemd restarts within `RestartSec`; cron watchdog catches edge cases | ✅ Yes |
| Express live server crashes | No watchdog | No automatic restart until reboot | ❌ No |
| VOD upload fails | `uploadVods.ts` retries 3× with backoff | Files remain on disk, retried next 20-min cycle | ✅ Yes |
| Corrupt MP4 file | `ffprobe` validation before upload | Deleted automatically | ✅ Yes |
| Cloud API down | Ingest calls fail with timeout | Edge continues operating, retries on next cycle | ✅ Degraded mode |
| Vercel function cold start | First request after idle period | ~500ms delay, no data loss | ✅ Transparent |
| Supabase downtime | API calls return 500 | Dashboard unavailable, edge continues recording | Partial |
| PayPlus webhook missed | Daily reconciliation cron | `sync-payplus-recurring` catches missed payments | ✅ Yes |

### 8.2 Failure Flow — Camera Self-Healing — [Current]

```
status-check.sh runs (every 5 min)
     │
     ▼
Check stream.m3u8 for each camera
     │
     ├── m3u8 exists AND age < 60s ──► Report "ok" to cloud API
     │
     └── m3u8 missing OR age > 60s
          │
          ▼
     Check retry count (last 10 min)
          │
          ├── retries < 3 AND last restart > 5 min ago
          │     │
          │     ▼
          │   Kill old FFmpeg process (SIGKILL)
          │   Wait 5 seconds
          │   Start new camera-{id}.sh
          │   Log "camera_restart" (warning) to cloud API
          │
          └── retries >= 3
                │
                ▼
          Log "camera_failure" (critical) to cloud API
          (one-time notification, prevents spam)
          Manual intervention required
```

### 8.3 Target Architecture

**[Planned]**:
- Watchdog for Express `live-server.js` (cron or systemd)
- Email/push notification on critical failures (camera permanent failure, disk critical)
- Graceful degradation dashboard: show "camera offline" instead of loading spinner
- Automated disk cleanup when approaching capacity (delete oldest recordings)

### 8.4 Gap Analysis

| Gap | Severity | Notes |
|-----|----------|-------|
| No log rotation for edge logs | **High** | AI logs grow indefinitely (observed >600 MB); risk of disk exhaustion. Requires: logrotate config, retention limits, compression, and monitoring. |
| No watchdog for Express server | Medium | If it crashes, live streaming stops until reboot |
| No email notification on critical failure | Medium | Admin must check dashboard to discover problems |
| No automated disk cleanup | Medium | `disk-check.sh` only logs, doesn't clean up |
| No Supabase downtime detection/alerting | Low | Would only affect dashboard, not edge recording |

---

## 9. Subsystem Deep Dives

### 9.1 Edge Node File System Layout — [Current]

The intended directory structure for an edge node installation. Actual deployed paths may vary — see `CURRENT_DEPLOYMENT.md` for the inspected state of the current production system.

```
~/
├── start-clearpoint.sh              ← Main bootstrap script (placed by installer or manually)
├── live-server.js                    ← Express HLS server (location varies by installation)
│
├── clearpoint-ai/                   ← AI detection engine (created by setup-ai.sh)
│   ├── detect.py                    ← AI detection engine
│   ├── ai-config.json               ← Camera RTSP URLs + IDs (per-deployment config)
│   ├── models/
│   │   ├── yolov8n_fp16.xml/.bin    ← OpenVINO IR model (primary)
│   │   ├── fire_smoke_fp16.xml/.bin ← Fire/smoke model (optional)
│   │   └── *.onnx                   ← Source ONNX models
│   ├── venv/                        ← Python virtual environment
│   └── requirements.txt
│
├── clearpoint-core/                 ← Cloud integration scripts
│   ├── .env                         ← CLEARPOINT_DEVICE_TOKEN, B2 keys, API_BASE
│   ├── uploadVods.ts                ← VOD upload script
│   ├── tsconfig.json
│   ├── package.json
│   └── node_modules/
│
├── clearpoint-scripts/              ← Camera and monitoring scripts
│   ├── camera-{id}.sh              ← FFmpeg script per camera (one per camera)
│   ├── status-check.sh             ← Health monitor + camera self-healing
│   ├── disk-check.sh               ← Disk usage checker
│   └── setup-cron.sh               ← Cron configuration script
│
├── clearpoint-recordings/
│   └── {user_id}/
│       └── footage/
│           └── {camera_id}/
│               └── YYYY-MM-DD_HH-MM-SS.mp4   ← VOD recordings (deleted after upload)
│
├── clearpoint-snapshots/            ← AI detection snapshots
├── clearpoint-logs/
│   ├── ai-detect.log               ← AI engine log (⚠️ no rotation configured)
│   ├── ai-detect-error.log         ← AI engine error log
│   └── health.log                   ← Disk check log
│
└── /mnt/ram-ts/                     ← tmpfs 128 MB (configured in /etc/fstab)
    └── {user_id}/
        └── live/
            └── {camera_id}/
                ├── stream.m3u8      ← HLS manifest
                └── *.ts             ← HLS segments (auto-evicted)
```

> **Note**: The repository contains `scripts/ai/setup-ai.sh` which creates the `clearpoint-ai/` directory and systemd service. The older installer expected AI files in `clearpoint-core/`. The separation into `clearpoint-ai/` is the current intended standard.

### 9.2 Cloud API Route Organization — [Current]

| Category | Route Prefix | Auth Method | Count |
|----------|-------------|-------------|-------|
| Ingest (edge → cloud) | `/api/ingest/*` | Device token | 6 |
| Admin (panel operations) | `/api/admin/*` | Mixed (5 have session check, 39 don't) | 44 |
| Admin (legacy flat) | `/api/admin-*` | Mixed | ~12 |
| Customer dashboard | `/api/user-*`, `/api/current-user` | NextAuth session | ~6 |
| Cron jobs | `/api/cron/*` | Mixed (4 have CRON_SECRET, 1 doesn't) | 5 |
| Webhooks | `/api/webhooks/*` | PayPlus signature | 1 |
| Public | `/api/public/*`, `/api/plans` | None (intentional) | ~3 |
| Stream status | `/api/stream-status` | None (⚠️ no auth) | 1 |

### 9.3 Ingest API Contract — [Current]

All ingest endpoints follow the same pattern — `Verified`:

```
POST /api/ingest/{endpoint}
Headers:
  Content-Type: application/json
  x-clearpoint-device-token: {plaintext_token}

Server validation:
  1. Extract token from header
  2. SHA-256 hash the token
  3. Look up hash in mini_pc_tokens table
  4. Verify not revoked
  5. Update last_used_at
  6. Return mini_pc_id

Endpoints:
  /api/ingest/mini-pc-health    ← Mini PC system metrics
  /api/ingest/camera-health     ← Per-camera stream status
  /api/ingest/alert             ← AI detection alerts + snapshot
  /api/ingest/system-log        ← System events (reboot, failure, etc.)
  /api/ingest/vod-file          ← VOD file metadata after B2 upload
  /api/ingest/vod-context       ← Check if camera allowed to upload VOD
```

---

## 10. Architectural Evolution

### 10.1 Evolution Timeline — Verified from historical documents

| Era | Architecture | Evidence |
|-----|-------------|---------|
| **V1** (early) | Raspberry Pi + direct B2/Bunny HLS upload | `pi-setup-guide.md`, `Clearpoint_H265_Browser_Compatible.md` |
| **V1.5** | Raspberry Pi + Cloudflare Tunnel | `Clearpoint_Hebrew_Live_Stream_Explained.md` |
| **V2** (current) | Mini PC + Cloudflare Tunnel + device tokens | Current codebase, `pc-setup-guide.md` |
| **V2.5** (planned) | Mini PC + automated installer + systemd | `installer-v2-design.md` |

### 10.2 Summary of Current Gaps

| # | Gap | Severity | Subsystem | Target |
|---|-----|----------|-----------|--------|
| 1 | 39 admin routes without auth | Critical | Security | Add `getServerSession` to all |
| 2 | 3 cron jobs unregistered | High | Runtime | Register in `vercel.json` |
| 3 | `BUNNY_TOKEN_KEY` hardcoded | High | Security | Move to environment variable |
| 4 | No error monitoring (Sentry/etc.) | High | Operations | Add APM service |
| 5 | No remote edge update mechanism | High | Deployment | Design OTA or SSH-based update |
| 6 | 1 cron route (`cleanup-logs`) missing `CRON_SECRET` | High | Security | Add auth check |
| 7 | No log rotation for edge logs | High | Reliability | Logrotate config, retention limits, compression |
| 8 | No watchdog for Express server | Medium | Reliability | Add cron watchdog or systemd |
| 9 | No centralized logging from edge | Medium | Operations | Log shipping to cloud |
| 10 | No edge version tracking | Medium | Deployment | Report version in health payload |
| 11 | No automated disk cleanup | Medium | Reliability | Auto-delete oldest recordings |
| 12 | No email on critical failures | Medium | Operations | Notification pipeline |
| 13 | cron vs systemd inconsistency | Medium | Runtime | Standardize on systemd |
| 14 | No rate limiting on ingest | Medium | Security | Token-based rate limits |
| 15 | No hardware redundancy | Low | Physical | Acceptable for current scale |

### 10.3 Recommended Evolution (Priority Order)

1. **Security hardening** (gaps 1, 3, 6) — Before any feature work
2. **Edge reliability** (gaps 7, 8, 11, 13) — Log rotation, Express watchdog, disk cleanup, systemd standardization
3. **Operational visibility** (gaps 2, 4, 9, 10) — Prerequisite for scaling
4. **Deployment automation** (gap 5) — Prerequisite for scaling past ~10 customers
5. **Notification pipeline** (gap 12) — Proactive monitoring
6. **Rate limiting** (gap 14) — Defense in depth

---

## Evidence Sources

Every fact in this document comes from one of the following source types. Each claim should be evaluated against its source type:

| Source Type | Meaning | Trust Level | Examples in This Document |
|-------------|---------|-------------|--------------------------|
| **Code** | Verified by reading the current source file | High | API route auth checks, table names, detection types, cron expressions, ingest contract |
| **Installer scripts** | What the installer *would* configure on a fresh machine | High (for what it configures) | RAM disk size, systemd services, cron schedules, file layout |
| **Configuration files** | Repository config files (`vercel.json`, `package.json`) | High | Vercel region, registered cron jobs |
| **Legacy documentation** | Facts from `docs/*.md` files written during development | Medium | Hardware specs (GMKtec/N150/8GB), camera settings (720p/10fps), Plan A/B/C definitions, pricing |
| **Production observation** | Facts observed on the running deployed system but not logged in any repository file | Medium (documented in `CURRENT_DEPLOYMENT.md`) | AI detection throughput, Mini PC health metrics, actual file paths |
| **External configuration** | Settings configured in external dashboards (Vercel, Cloudflare, Supabase) not visible in repo | Cannot verify | Vercel deploy branch, Cloudflare Tunnel DNS records, Supabase RLS policies |
| **Judgment / Assumption** | Editorial assessment by the document author | Informational only | "Current hardware is stable", "acceptable for current scale" |

> **Rule**: If a claim is labeled `Verified`, it must be traceable to **Code** or **Installer scripts**. Claims from other sources must be labeled `Partially Verified`, `Needs Validation`, or `Assumption`.

---

## Related Documents

- [MANIFESTO.md](./MANIFESTO.md) — Engineering philosophy
- [PROJECT_BIBLE.md](./PROJECT_BIBLE.md) — System overview
- [DATABASE.md](./DATABASE.md) — Schema reference
- [API_REFERENCE.md](./API_REFERENCE.md) — Endpoint reference
- [SECURITY.md](./SECURITY.md) — Auth and threat model
- [MINI_PC.md](./MINI_PC.md) — Edge node hardware and software
- [MONITORING.md](./MONITORING.md) — Health and alerting systems
- [TECHNICAL_DEBT.md](./TECHNICAL_DEBT.md) — Gap tracking and priorities
- [CURRENT_DEPLOYMENT.md](./CURRENT_DEPLOYMENT.md) — Verified state of the production Mini PC (2026-07-17)
- [DEPLOYMENT_COMPARISON.md](./DEPLOYMENT_COMPARISON.md) — Repository vs installer vs deployment comparison
- [docs/architecture/](./architecture/) — Architecture Decision Records

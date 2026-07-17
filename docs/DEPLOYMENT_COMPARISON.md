# Deployment Comparison — Repository vs Installer vs Actual

<!--
purpose: Compare what the repository says, what the installers would create, and what is actually deployed
verified_date: 2026-07-17T20:13:00+03:00
-->

---

## A. Architecture Comparison Table

| Aspect | Repository (SYSTEM_ARCHITECTURE.md) | Older Installer (install-clearpoint.sh) | Newer Installer (clearpoint-linux-installer.sh) | **Actual Deployed** | Diff? |
|--------|--------------------------------------|----------------------------------------|------------------------------------------------|---------------------|-------|
| **OS** | Ubuntu 24.04 | Ubuntu 24.04 | Ubuntu 24.04 | Ubuntu 24.04.3 LTS | ✅ Match |
| **Kernel** | Not specified | Not specified | Not specified | 7.0.0-28-generic (HWE) | ℹ️ |
| **CPU** | Intel N150, 4 cores | Not checked | Not checked | Intel N150, 4 cores | ✅ Match |
| **RAM** | 8 GB | Not checked | Not checked | 7.5 GiB (8 GB physical) | ✅ Match |
| **Disk** | 256 GB SSD | Not checked | Not checked | 233 GB NVMe | ✅ Match |
| **RAM disk** | 128 MB tmpfs at `/mnt/ram-ts` | Yes, creates it | Yes, creates it | 128 MB tmpfs at `/mnt/ram-ts` (fstab) | ✅ Match |
| **Camera processes** | "cron @reboot via start-clearpoint.sh" | cron @reboot + systemd .service files | systemd services (Restart=always) | cron @reboot via start-clearpoint.sh (no systemd for cameras) | ⚠️ No systemd for cameras |
| **AI management** | "cron */2 min watchdog" OR systemd | cron watchdog | Not configured | **systemd** (`clearpoint-ai.service`) + redundant cron watchdog | ⚠️ Mixed |
| **AI location** | Not specified | `~/clearpoint-core/` | Not configured | `~/clearpoint-ai/` (separate directory) | ⚠️ Different path |
| **AI CPUQuota** | 200% | Not specified | Not specified | 200% | ✅ Match |
| **AI MemoryMax** | 1G (setup-ai.sh) | Not specified | Not specified | **512M** | ❌ Drift |
| **AI performance** | "~13 frames/30s" | N/A | N/A | **18-19 frames/30s** | ✅ Better than docs |
| **Express location** | Implied `~/clearpoint-core/` | `~/clearpoint-core/live-server.js` | `~/clearpoint-core/live-server.js` | `~/live-server.js` (home root) | ⚠️ Different path |
| **Express watchdog** | "No watchdog" | None | None | **None** | ✅ Match (gap acknowledged) |
| **Camera codec** | "H.265" mentioned in specs | Not specified | Not specified | H.265 (HEVC) confirmed | ✅ Match |
| **VOD transcoding** | Not documented | Not documented | Not documented | **HEVC → H.264 transcode before upload** | ❌ Missing from docs |
| **Camera count** | 4 | Variable | Variable | 4 (3 stable, 1 intermittent) | ⚠️ One camera unreliable |
| **Camera HLS params** | Not specified | Not specified | `hls_time 10, list_size 3` | `hls_time 1.5, list_size 8` | ❌ Installer differs from deployed |
| **Recording segment** | Not specified | `segment_time 900` | `segment_time 900` | `segment_time 900` (15 min) | ✅ Match |
| **Cloudflared** | systemd | systemd | systemd | systemd | ✅ Match |
| **Status check** | "every 5 min" | "every 5 min" | "every 5 min" (if setup-cron.sh runs) | `*/5` cron | ✅ Match |
| **Disk check** | "daily 6 AM" | "daily 6 AM" | "daily 6 AM" (if setup-cron.sh runs) | `0 6 * * *` cron | ✅ Match |
| **VOD upload** | "every 20 min" | "every 20 min" | "every 20 min" (if setup-cron.sh runs) | `*/20` cron | ✅ Match |
| **Log rotation** | Not mentioned | Not configured | Not configured | **None** (605 MB and growing) | ❌ Critical gap |
| **Tunnel hostname** | Not specified | Not specified | Not specified | `minipc.clearpoint.co.il` | ℹ️ Per-customer |
| **Device token storage** | "header + env var" | `.env` file | `.env` file | `.env` (644!) + hardcoded in systemd unit | ⚠️ Security |
| **Installation method** | "USB installer" or "manual SSH" | USB + cron | USB + systemd + cron | **Manual SSH over 8 months** | ❌ Neither installer used |

---

## B. Corrections Applied

> **Status**: All corrections from this section were applied to `SYSTEM_ARCHITECTURE.md` on 2026-07-17 in a coordinated documentation update. This section is retained for audit trail only.
>
> Key corrections applied:
> - HLS live codec: H.265 passthrough (not H.264 transcode)
> - Per-camera process model: 3 processes (recording + HLS + cleanup)
> - AI file layout: `clearpoint-ai/` directory (not `clearpoint-core/`)
> - AI performance: deployment-specific number moved to `CURRENT_DEPLOYMENT.md`
> - Process management: systemd documented as primary AI recovery mechanism
> - Log rotation: added as High-severity architectural gap
> - Hardware claims: downgraded to minimum requirements (no brand/model assertions)
> - Manual installation: documented as the production deployment reality

---

## C. Component Health Summary

### Verified Healthy

| Component | Evidence |
|-----------|----------|
| AI detection engine | Active, 18-19 fps/camera, detecting vehicles |
| Camera 1-3 (Entrance, Yard, Balcony) | Fresh HLS manifests, active recordings |
| Express HLS server | Port 8080 open, serving streams |
| Cloudflare Tunnel | Active, routing minipc.clearpoint.co.il |
| VOD upload | Successfully uploading with transcoding |
| Disk check | Running daily, disk at 15% |
| Status check | Running, recovered camera 4 after reboot |
| RAM disk | Mounted, 3-4% usage, functioning |
| Reboot recovery (core) | 3/4 cameras + Express + AI + Tunnel recovered in <2 min |

### Configuration Drift

| Item | Expected (repo) | Actual | Likely Cause |
|------|-----------------|--------|--------------|
| AI MemoryMax | 1G | 512M | Service file installed before repo was updated |
| AI script path in start-clearpoint.sh | `~/clearpoint-core/detect.py` | File is at `~/clearpoint-ai/detect.py` | AI was moved to separate dir, bootstrap not updated |
| live-server.js location | `~/clearpoint-core/` | `~/live-server.js` | Original manual setup predates directory reorganization |
| Cron AI watchdog | References `~/clearpoint-core` | AI runs from `~/clearpoint-ai` via systemd | Cron entry is stale/redundant |

### Reliability Risks

| Risk | Severity | Impact | Mitigation |
|------|----------|--------|------------|
| No log rotation | High | Disk will fill in ~6-12 months at current rate | Add logrotate config |
| Camera 4 RTSP drops | Medium | Intermittent recording gaps for parking camera | Network/hardware diagnosis |
| Express has no watchdog | Medium | If Express dies mid-session, live streams stop until reboot | Add cron watchdog or systemd |
| VOD transcode failures | Low | Occasional files uploaded as HEVC (may not play in browser) | Retry logic handles most cases |

### Security Risks

| Risk | Severity | Exploitability |
|------|----------|---------------|
| `.env` world-readable (644) | High | Any local user can read all secrets |
| Device token in systemd unit | Medium | Visible to any user who can read systemd files |
| Default RTSP passwords | Medium | Any device on local network can access camera feeds |
| RTSP URLs in process list | Low | Any local user can read full camera URLs via `ps aux` |
| CUPS running | Low | Unnecessary attack surface |

---

## D. Deployment Classification

**Final classification: Primarily manual installation**

This system was built through iterative SSH sessions over 8+ months (Jun 2025 → Feb 2026). It is internally functional but:
- Cannot be automatically reproduced
- Contains orphaned artifacts from earlier iterations
- Has path inconsistencies from organic growth
- Has no version tracking or deployment manifest

**Recommended next steps:**
1. Fix critical security issues (`.env` permissions, token storage)
2. Add log rotation (immediate disk risk)
3. Design reproducible installer based on documented actual state
4. Clean orphaned files
5. Standardize on systemd for all services (cameras + Express)
6. Remove dead code from `start-clearpoint.sh`

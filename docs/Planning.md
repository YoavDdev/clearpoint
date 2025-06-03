# 📌 PLANNING.md – Clearpoint Project

## 🧭 Project Vision

Clearpoint is a **cloud-based and hybrid security camera system** built for:
- Secure live view and VOD access via mobile or desktop
- Local + cloud storage depending on user plan
- Monthly subscription-based pricing
- Raspberry Pi or Mini PC acting as on-site NVR/stream server
- Clear, modern UI in Hebrew with mobile support
- Cloudflare Tunnel + Bunny CDN + Backblaze B2 architecture
- Simple install flow with USB setup

---

## 🔑 Core Features

### 🔒 Authentication & Roles
- Supabase Auth (no NextAuth)
- `admin` and `user` roles
- Row-level security (RLS) for access control
- Session-based middleware for protected routes

### 🎥 Cameras & Viewing
- Show all assigned cameras (up to 4 per user)
- Live stream pulled from Bunny CDN (via signed URL)
- HLS (.m3u8) for real-time streaming
- VOD browser by camera → date → time
- 15min segmented .mp4 playback
- Smart scrubber timeline with RTL layout and cut highlights

### 📁 VOD Footage

- Local VOD saved as `.mp4` segments (every 15 min)
- Uploaded to Backblaze B2
- Bunny CDN signs URLs for secure access (14-day expiration)
- Auto-cleanup based on plan retention (7 or 14 days)
- Local fallback (Plan C) shows footage via local LAN/HTTP

#### 📤 VOD Upload Logic (via `uploadVods.ts`)

- Runs every 5 min via CRON on the Mini PC
- For each user/camera:
  - Skips `.mp4` files that are still being written (under 60s old)
  - Skips users with Plan C (`local`) — no cloud upload
  - Deletes expired files based on `plan_duration_days`
  - Uploads valid `.mp4` to Backblaze B2 (with SHA1 verification)
  - Generates a signed Bunny CDN URL (valid for 14 days)
  - Logs file metadata into Supabase `vod_files`:
    - `user_email`, `camera_id`, `url`, `timestamp`, `duration`, `file_id`
  - Deletes the local `.mp4` file after successful upload
- Retries failed uploads up to 3 times per file

---

## 🧠 Plans

### 🟠 Plan A – SIM Cloud (Remote)
- Includes 4G SIM router (500GB/month)
- Smart upload strategy (nightly, filtered)
- Live access + VOD cloud backup (7 or 14 days)

### 🔵 Plan B – Wi-Fi Cloud
- Full cloud (live + VOD) using customer's internet
- No data cap
- Optimal performance and cheapest monthly cost

### 🟤 Plan C – Local Only (Offline)
- Local SSD storage only
- View footage via LAN / Clearpoint interface
- Can upgrade later to upload older files
- On-site HTTP API

### 🆙 Upgrade Path
- Plan C users can upgrade to Plan A/B
- Retroactive upload of old footage possible
- Plan affects UI logic + backend behavior

---

## 💽 Local Recording (NVR)

- VOD stored locally at `~/clearpoint-recordings`
- Folders: `footage/[cameraId]` and `live/[cameraId]`
- `camera-[id].sh` scripts per camera handle:
  - `ffmpeg` VOD recording (.mp4)
  - `ffmpeg` HLS live stream (.m3u8 + .ts)
- Local HTTP server (`serve`) exposes live streams on port 8080

---

## 🧰 Device Setup Flow (Mini PC / Pi)

- USB contains all scripts:
  - `install-clearpoint.sh`
  - `start-clearpoint.sh`
  - `camera-[id].sh`
  - `status-check.sh`
  - `uploadVods.ts` + `.env`
- `install-clearpoint.sh` sets up:
  - Required folders
  - Camera scripts
  - Upload logic
  - CRON job for VOD uploader
- CRON runs every 5 min: `ts-node uploadVods.ts`
- `.env` contains B2 keys, Supabase, Bunny token

---

## 💳 Payments

- Meshulam integration (iframe or redirect)
- Supabase stores plan and billing status
- Admin can manually mark active/inactive
- Plans include optional annual discounts

---

## 🛠 Admin Tools

- `/admin/customers`: show all users, plans, cameras
- `/admin/support`: open support tickets
- `/dashboard/footage`: user footage view with calendar UI
- `/dashboard`: live view
- Status check for system health (`status-check.sh`)
- Visual cues for:
  - Active cameras
  - VOD availability
  - Support-needed users

---

## ✅ Implemented

- Supabase roles and access
- Camera CRUD and stream display
- Bunny CDN integration
- Footage segment UI + download
- Cron-based uploader
- Local + cloud fallback logic
- Cloudflare tunnel per customer (e.g., p5.clearpoint.co.il)

---

## 🧱 Tech Stack

- **Next.js 14 (App Router)**
- **TailwindCSS + Framer Motion**
- **Supabase (Auth + RLS + Database)**
- **Backblaze B2 (private storage)**
- **Bunny.net (CDN with pull zone)**
- **Cloudflare Tunnel (remote live stream)**
- **FFmpeg (recording + HLS stream)**
- **Meshulam (payment gateway)**

---

## 🧪 On-device Software (Mini PC / Pi)

- `camera-[id].sh`: starts ffmpeg for recording + live
- `start-clearpoint.sh`: runs all scripts, server
- `uploadVods.ts`: handles .mp4 upload to B2
- `status-check.sh`: verifies recording, stream, tunnel, HTTP
- `install-clearpoint.sh`: automatic setup from USB

---

## 💡 Roadmap / Backlog

- Motion detection + tagging (future)
- Multi-camera grid playback
- Admin footage access + trimming
- Plan-aware restrictions for older footage
- Bunny link cleaner (remove expired files from DB)
- Local API for Plan C users to download via dashboard
- Disk space monitor for Mini PC
- Support alert if camera disconnected
- Public signup (if launched for mass users)

# 📌 PLANNING.md – Clearpoint Project

## 🗭 Project Vision

Clearpoint is a **cloud-based and hybrid security camera system** built for:

* Secure live view and VOD access via mobile or desktop
* Cloud storage with 1, 7, or 14-day retention plans
* Monthly subscription-based pricing
* Mini PC acting as on-site stream server
* Clear, modern UI in Hebrew with mobile support
* Cloudflare Tunnel + Bunny CDN + Backblaze B2 architecture
* Simple install flow with USB setup

---

## 🔑 Core Features

### 🔒 Authentication & Roles

* Supabase Auth (no NextAuth)
* `admin` and `user` roles
* Row-level security (RLS) for access control
* Session-based middleware for protected routes

### 🎥 Cameras & Viewing

* Show all assigned cameras (up to 4 per user)
* Live stream pulled from Bunny CDN (via signed URL)
* HLS (.m3u8) for real-time streaming
* VOD browser by camera → date → time
* 15min segmented .mp4 playback
* Smart scrubber timeline with RTL layout and cut highlights

### 📁 VOD Footage

* Local VOD saved as `.mp4` segments (every 15 min)
* Uploaded to Backblaze B2
* Bunny CDN signs URLs for secure access (14-day expiration)
* Auto-cleanup based on plan retention (1, 7, or 14 days)

📄 VOD Upload Logic (uploadVods.ts)
Triggered by CRON every 20 minutes

For each user → camera:

Skips .mp4 files that are less than 60 seconds old

Uploads valid .mp4 files to Backblaze B2

Computes SHA1 hash for B2 verification

Retries failed uploads up to 3 times, with exponential backoff if rate-limited

Generates a signed Bunny.net URL (default: 14-day expiration)

Logs metadata into Supabase vod\_files table:

user\_id, user\_email, camera\_id, url, timestamp, file\_id, duration

Deletes the local .mp4 file after successful upload

---

## 🧠 Plans

### 🟠 Plan A – SIM Cloud (Remote)

* Includes 4G SIM router (500GB/month)
* Smart upload strategy (nightly, filtered)
* Live access + VOD cloud backup (1, 7, or 14 days)

### 🔵 Plan B – Wi-Fi Cloud

* Full cloud (live + VOD) using customer's internet
* No data cap
* Optimal performance and cheapest monthly cost

### ⬆️ Upgrade Path

* Plans include upgrade to longer retention (1 → 7 → 14 days)
* Plan affects UI logic + backend behavior

---

## 📍 Local Recording (NVR)

VOD is stored on disk at \~/clearpoint-recordings/footage/\[cameraId]

Live HLS is written to RAM at /dev/shm/clearpoint-live/\[cameraId] ✅

camera-\[id].sh scripts per camera handle:

ffmpeg VOD recording as .mp4 (15min segments)

ffmpeg HLS live stream (.m3u8 + .ts) into RAM

live-server.js (Express-based server) serves HLS on port 8080 ✅

---

## 🛠️ Device Setup Flow (Mini PC / Pi)

USB contains all scripts:

install-clearpoint.sh

start-clearpoint.sh

camera-\[id].sh

status-check.sh

uploadVods.ts + .env

live-server.js ✅

install-clearpoint.sh sets up:

Required folders

Camera scripts

Upload logic

CRON job for VOD uploader

Local Express server for live HLS stream ✅

.env contains B2 keys, Supabase, Bunny token

---

## 💳 Payments

* Meshulam integration (iframe or redirect)
* Supabase stores plan and billing status
* Admin can manually mark active/inactive
* Plans include optional annual discounts

---

## 🛠 Admin Tools

* `/admin/customers`: show all users, plans, cameras
* `/admin/support`: open support tickets
* `/dashboard/footage`: user footage view with calendar UI
* `/dashboard`: live view
* Status check for system health (`status-check.sh`)
* Visual cues for:

  * Active cameras
  * VOD availability
  * Support-needed users

---

## ✅ Implemented

* Supabase roles and access
* Camera CRUD and stream display
* Bunny CDN integration
* Footage segment UI + download
* Cron-based uploader
* Cloudflare tunnel per customer (e.g., p5.clearpoint.co.il)

---

## 🧱 Tech Stack

* **Next.js 14 (App Router)**
* **TailwindCSS + Framer Motion**
* **Supabase (Auth + RLS + Database)**
* **Backblaze B2 (private storage)**
* **Bunny.net (CDN with pull zone)**
* **Cloudflare Tunnel (remote live stream)**
* **FFmpeg (recording + HLS stream)**
* **Meshulam (payment gateway)**

---

## 🧪 On-device Software (Mini PC / Pi)

camera-\[id].sh: starts FFmpeg for recording + live

start-clearpoint.sh: runs all scripts and starts live server ✅

live-server.js: Express-based HLS server on port 8080 ✅

uploadVods.ts: handles .mp4 upload to Backblaze B2

status-check.sh: verifies recording, stream, tunnel, HTTP

install-clearpoint.sh: automatic setup from USB

---

## 💡 Roadmap / Backlog

* Motion detection + tagging (future)
* Multi-camera grid playback
* Admin footage access + trimming
* Plan-aware restrictions for older footage
* Bunny link cleaner (remove expired files from DB)
* Disk space monitor for Mini PC
* Support alert if camera disconnected
* Public signup (if launched for mass users)

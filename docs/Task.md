# ✅ TASK.md – Clearpoint Tasks

## 🔧 Active Tasks

- [ ] **SummaryCard Role Separation**: Only clickable cards behave as buttons; status/info cards styled differently  
- [ ] **Create Plan Page**: Add `/dashboard/plan` to show user plan and upgrade options  
- [ ] **Create Support Page**: Add `/support` to provide help center or contact info  
- [ ] **MiniNavbar Navigation Pages**: Add placeholder pages for all actionable MiniNavbar buttons  
- [ ] **Secure Start/Stop UI**: Build optional UI to stop specific camera scripts via PID tracking  
- [ ] **Auto Upload Fail Retry**: Retry queue or log for B2 failures  
- [ ] **Bunny URL Expiry Cleaner**: Script to remove expired Bunny URLs nightly  
- [ ] **Disk Monitor**: Warn if Mini PC SSD reaches 90%  
- [ ] **Admin Alerts**: Notify on new user signup, camera offline  
- [ ] **User-Side Clip Trimming UI** (optional future)  
- [ ] **Multi-Camera Grid Playback UI** (future)
- [ ] **Auto RLS Supabase Checks** for VOD playback access
- [ ] **Retroactive Upload Option** if Plan C upgrades to cloud

---

## ✅ Completed Tasks

### 📸 System Setup & Recording
- Auto-generated `camera-[id].sh` script: VOD + HLS live stream + cleanup  
- `start-clearpoint.sh`: runs all cameras, starts HTTP server  
- `status-check.sh`: shows VOD/live status, .m3u8 + tunnel check  
- Cloudflare Tunnel per user (e.g. `p5.clearpoint.co.il`) with 4 paths `/camera1`…  
- Local `npx serve` on port 8080 for live stream HLS  
- Audio included in both `.mp4` and HLS  
- Auto-folder creation per camera on first run  
- Live/footage separated into `/live/[cameraId]` and `/footage/[cameraId]`  
- Default config: H.265, 720p, 10fps, 512kbps bitrate  
- `.ts` auto-delete every 5 min  
- `uploadVods.ts` logs to Supabase + uploads to B2  
- Bunny signed URLs via token, valid 14 days  
- `install-clearpoint.sh`: full auto-setup from USB  
- CRON: VOD upload every 5 minutes  
- Project structure:
  - `~/clearpoint-scripts/` – all camera scripts  
  - `~/clearpoint-recordings/` – footage/live per user  
  - `~/clearpoint-core/` – upload logic, `.env`, `uploadVods.ts`

### 💻 Dashboard & Player
- Full camera UI: thumbnails, stream view  
- Dynamic selection by user/camera/date  
- Cloud Bunny playback with signed URL  
- Timeline VOD scrubber across segments  
- Trim red markers and download logic  
- RTL support, Apple-style UI  
- B2/VOD viewer handles missing footage

### 🔐 Auth & Admin
- Supabase Auth (no NextAuth)  
- Admin/User roles via Supabase RLS  
- Camera access enforced by user ownership  
- Admin CRUD pages for users, plans, cameras  
- Admin camera page has download `.sh` button  
- Secure footage access via `vod_files`  
- Visual cue for existing customers  
- Plan selection auto-fills prices

### 📦 Upload & Storage
- Segmented `.mp4` recording every 15min  
- Upload uses Axios + SHA1 for B2  
- Supabase insert: camera_id, url, timestamp  
- Auto cleanup: retention enforced from plan  
- Plan C = local only, Plan A/B = cloud  
- Bunny CDN configured via pull zone  
- Secure HLS via signed URL (no public access)

---

## 📥 Backlog

- Add storage size tracker to Supabase for each file  
- Telegram or email alerts on failed uploads  
- Role assignment on public signups (if opened)  
- Storage cap enforcement per plan  
- Add Bunny file cleanup (expired URLs)  
- AI event tagging: motion/audio detection (future)  

---

## 📌 Notes Discovered

- Bunny CDN origin path fixed (double prefix bug)  
- Bunny stream.m3u8 must be signed – fixed  
- Supabase blocked `camera.insert` – fixed via admin policy  
- Plan C needs LAN UI fallback – working  
- CRON uploads crash if `.env` is missing – resolved  
- If cloudflared is down, live stream still works locally  
- Upload logs kept in `~/vod-upload-log.txt`  
- NodeJS must be installed before cron upload works


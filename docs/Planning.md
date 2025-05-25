# 📌 PLANNING.md – Clearpoint Project

## 🧭 Project Vision

Clearpoint is a **cloud-based and hybrid security camera system** designed for:
- Remote live access and secure VOD playback
- Plan-based features and retention
- Local fallback options (Plan C)
- Hebrew, mobile-friendly UI
- Optimized performance (720p, 10fps, H.265, 512kbps)
- Private storage via Backblaze B2 + Bunny CDN (signed URLs)

---

## 🔑 Core Features

### 🔒 Authentication & Roles
- Supabase Auth (no NextAuth anymore)
- `Admin` and `User` roles
- Middleware + RLS enforced per route/resource

### 🎥 Cameras & Viewing
- View all assigned cameras
- Live view via Bunny CDN (pull from HLS)
- Timeline-style VOD browsing per camera/date
- Red highlight for trim segments
- Multi-segment FFmpeg download

### 📁 VOD Footage
- Stored in Backblaze B2
- Bunny.net signed URL access (14-day exp)
- Segments in 15min `.mp4` chunks
- React timeline scrubber simulates full-day playback
- Local-only fallback for Plan C (via LAN API)

### 💽 Local Recording (Plan C)
- On-device SSD storage (~10 days)
- Custom Mini PC API for browsing/downloading
- Auto-delete script respects retention window
- LAN or secure tunnel access for dashboard
- Future: retroactive cloud upload if upgraded

### 🧠 Plans & Upgrades
- **Plan A**: SIM router (500GB), smart upload
- **Plan B**: Full Wi-Fi cloud
- **Plan C**: Local-only (offline, upgradable)
- Upgrade path from Plan C → A/B with retro upload
- Dynamic UI based on user’s plan

### 💳 Payments
- **Meshulam integration** (instead of Stripe)
- Handles recurring billing via iframe or redirect
- Supabase tracks plan type and payment status
- Plans determine cloud retention window (7/14 days)
- Annual discount options (₪1390)

### 🛠 Admin Features
- User/camera management UI
- Filter by camera/user status
- Subscription request management (status, notes)
- RLS-restricted camera access
- Visual cue for existing customers

---

## ✅ Implemented

- Supabase Auth and RLS
- Clean admin layout and CRUD
- Camera UI: thumbnails + main view
- MiniNavbar: scroll-aware behavior
- Cloud footage page with trim/download UI
- Timeline scrubber with RTL + cut markers
- B2 + Bunny integration with signed secure links

---

## 🔜 In Progress

- `/dashboard/plan` and `/support` pages
- Local-only support UI (Plan C)
- Mini PC API (footage list, stream, config)
- Plan upgrade logic for Plan C users
- Storage estimation logic (per user)
- SummaryCard role separation logic
- Meshulam billing iframe/integration + backend tracking

---

## 🧱 Tech Stack

- **Next.js 14 (App Router)**
- **TailwindCSS + Framer Motion**
- **Supabase (RLS, Auth, Storage)**
- **Backblaze B2 (private footage)**
- **Bunny.net (streaming via pull zone)**
- **FFmpeg (segment trimming)**
- **Mini PC (NVR role via LAN API)**
- **Meshulam (payment handling)**

---

## 💡 Roadmap / Backlog

- Plan C cleanup automation + disk alerts
- Monitor failed uploads + retry queue
- Bunny stale VOD checker
- Forgot/reset password flow
- CRON automation for footage processing
- Public signup support + role assignment
- Multi-camera view grid
- AI event tagging (motion, sound) – future


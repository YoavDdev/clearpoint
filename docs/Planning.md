# 📌 PLANNING.md – Clearpoint Project

## 🧭 Project Vision

Clearpoint is a **cloud-based security camera system** built to serve customers with:

- Live and past video viewing  
- Plan-based access and features  
- Clean, premium UI (Apple-like aesthetic)  
- Hebrew support and responsive layout  
- Secure access and storage management  
- Optimized data usage via local RTSP to HLS conversion (720p, 10fps, H.265, 512kbps)

---

## 🔑 Core Features

### 🔒 Authentication & Roles
- Supabase Auth with NextAuth integration
- `Admin` and `User` roles
- Secure admin-only camera creation
- Server-side protected routes
- Middleware to restrict dashboard/admin access by role

### 🎥 Cameras & Viewing
- View assigned cameras with live stream (via Bunny.net CDN)
- Finalized layout: One large live stream panel + small thumbnail cards
- Responsive grid on mobile, no animation switching
- `/dashboard/footage` for VOD access by camera/date/time
- Senior-friendly UI: Always start with camera selection → date → time
- Secure video delivery using private B2 storage + signed Bunny URLs

### 💳 Plans & Payments
- Stripe integration planned for monthly billing
- Plans define access to historical footage (e.g., 7 days back)
- PlanCard shows current plan, upgrade link, and retention info

### 💾 Storage & Downloads
- 24/7 recordings stored in **Backblaze B2** (private bucket)
- **Bunny.net** streams VOD securely via signed URL
- Storage logic supports: filter clips by date/time, fetch by timestamp
- Users can download footage clips from `/dashboard/footage`
- Upcoming: clip trimming feature before download

### 🛠 Admin Panel
- Admin can create/delete users and cameras
- Assign cameras to users using a dropdown selector
- View all users with roles, assigned cameras, and subscription info
- Protected by middleware (RLS + role check)

### 📋 User Dashboard
- Dashboard (`/dashboard`) includes:
  - Large live camera stream
  - Thumbnail camera cards
  - Mini-navbar: PlanCard, SupportCard, DownloadCard
  - `/dashboard/footage` with VOD browser & downloader

---

## 🧱 Upcoming Features

- Stripe plan payments & billing UI  
- Admin alerts (user signup, offline camera)  
- Video trimming UI for clips  
- Forgot/reset password via email  
- Multi-camera comparison view  
- AI motion/sound event detection (future phase)  
- Storage limit enforcement based on plan tier  
- Auto-expire old videos based on plan

---

## 📐 Tech Stack

- **Next.js 14 (App Router)**  
- **TailwindCSS**  
- **Supabase (Auth, RLS, Storage, DB)**  
- **NextAuth (Supabase adapter)**  
- **Stripe**  
- **Backblaze B2 (Cloud storage)**  
- **Bunny.net (CDN with private streaming)**  
- **Framer Motion (UI transitions)**  
- **react-player** (VOD playback)  
- **Raspberry Pi / FFmpeg** for RTSP→HLS conversion

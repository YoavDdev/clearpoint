# ✅ TASK.md – Clearpoint Tasks

## 🔧 Active Tasks

- [ ] **Stripe Integration**: Add Stripe to support plan upgrades and monthly billing
- [ ] **Implement PlanCard**: Show user’s subscription plan, time left, and upgrade button
- [ ] **Implement SupportCard**: Add help system (basic chatbot or FAQ link)
- [ ] **Implement DownloadCard**: Show available footage download options and current storage usage
- [ ] **Mini Navbar for Dashboard**: Display PlanCard, SupportCard, and DownloadCard only on `/dashboard` for logged-in users
- [ ] **User Dashboard Access Control**: Ensure only logged-in users can see `/dashboard` and relevant components
- [ ] **Mobile Layout Polish**: Improve responsiveness and spacing for small screens
- [ ] **Admin Overview Page**: Display users, cameras, subscription plan, and status (in a table)
- [ ] **Storage Usage Tracker**: Estimate or fetch each user’s cloud storage usage and display it
- [ ] **Storage Duration Enforcement**: Block access to old footage beyond user’s plan retention window
- [ ] **Build /dashboard/footage Page**: Dedicated page to view and browse past recordings
- [ ] **Footage Browsing UI**: User selects a camera (always available if assigned), then picks a date and time range. If no videos exist, a message is shown
- [ ] **Download Footage Logic**: After selecting camera/date/time, user can download clips shown on screen
- [ ] **Add Backblaze Upload Flow**: Enable server/API to push 24/7 recordings to Backblaze B2 (private) with metadata stored in Supabase `vod_files`
- [ ] **Timestamp-Based Clip Access**: Design logic to fetch part of a long video based on timestamp and serve the segment via Bunny
- [ ] **Setup Raspberry Pi Streaming Gateway**: Configure Pi to convert RTSP to HLS with 720p/10fps/H.265/512kbps settings for low bandwidth usage

## ✅ Completed Tasks

- [x] Supabase Auth + Storage setup
- [x] Configure RLS to restrict camera creation and visibility
- [x] Sync Supabase roles with NextAuth session JWT
- [x] Secure server-side access based on user role
- [x] Create user via admin form and assign role
- [x] Build customer creation UI
- [x] Add camera creation UI with user selector
- [x] Restrict cameras by assigned user (RLS enforced)
- [x] Display cameras in Admin Panel and filter by user
- [x] Implement camera delete feature
- [x] Create clean sidebar layout for Admin
- [x] Add tooltip buttons to CameraCard
- [x] Make camera layout responsive
- [x] Add fixed icon buttons to bottom of camera card (enlarge, etc.)
- [x] Connect B2 and Bunny.net with secure S3 Auth
- [x] Fix Bunny Pull Zone Origin path issue (remove double bucket prefix)
- [x] Finalize small camera UI (thumbnail + title)
- [x] Remove live status/controls for cleaner layout
- [x] Implement react-player VOD viewer
- [x] Secure Video Delivery (Backblaze B2 + Bunny.net)
- [x] Default camera config set (720p, 10fps, H.265, 512kbps)

## 📥 Backlog

- [ ] Add forgot password + email reset flow
- [ ] Role assignment for public signups (if opened in future)
- [ ] Storage limit enforcement (per plan)
- [ ] Admin alerts: new user signup, camera offline
- [ ] Clip trimming UI (if users want to cut and save segments)
- [ ] Multi-camera view (grid playback or comparison layout)
- [ ] AI-powered event tagging (motion, sound)

## 📌 Discovered During Work

- [x] Supabase RLS blocked camera insert – fixed via admin-only policy
- [x] Camera insert failed due to missing service role – fixed
- [x] Role propagation was missing – resolved with NextAuth callback
- [ ] Need smart logic to limit access to older footage (based on user’s plan duration)

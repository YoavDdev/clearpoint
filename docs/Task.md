# ✅ TASK.md – Clearpoint Tasks

## 🔧 Active Tasks

- [x] **Footage Page – Stage 2**: Connect footage page to camera list from Supabase, and enable camera/date-based clip display
- [ ] **Footage Download UI**: Display available clips with download button once camera/date selected
- [ ] **MiniNavbar Polish**: Hide on scroll, show on top; smooth layout on mobile + centered layout on desktop
- [ ] **SummaryCard Role Separation**: Only clickable cards behave as buttons; status/info cards styled differently
- [ ] **Create Plan Page**: Add `/dashboard/plan` to show user plan and upgrade options
- [ ] **Create Support Page**: Add `/support` to provide help center or contact info
- [ ] **MiniNavbar Navigation Pages**: Add placeholder pages for all actionable MiniNavbar buttons
- [ ] **Storage Estimation and Pricing**: Document per-customer storage usage (~86GB for 4 cams × 14 days) and calculate B2 cost (~$0.43/month)

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
- [x] Build /dashboard/footage base layout with camera/date selection
- [x] Clean up MiniNavbar card behavior and animation
- [x] Scroll-aware MiniNavbar (hide on scroll down)
- [x] Implement signed Bunny URLs in upload script (14-day expiration)
- [x] Build unified scrubber player with real-time jump across footage timeline

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

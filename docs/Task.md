# ✅ TASK.md – Clearpoint Tasks

## 🔧 Active Tasks

- [x] **Footage Page – Stage 2**: Connect footage page to camera list from Supabase, and enable camera/date-based clip display  
- [x] **Footage Download UI**: Display available clips with download button once camera/date selected, including multi-cut timeline trim and download with FFmpeg  
- [x] **MiniNavbar Polish**: Hide on scroll, show on top; smooth layout on mobile + centered layout on desktop  
- [ ] **SummaryCard Role Separation**: Only clickable cards behave as buttons; status/info cards styled differently  
- [ ] **Create Plan Page**: Add `/dashboard/plan` to show user plan and upgrade options  
- [ ] **Create Support Page**: Add `/support` to provide help center or contact info  
- [ ] **MiniNavbar Navigation Pages**: Add placeholder pages for all actionable MiniNavbar buttons  
- [ ] **Storage Estimation and Pricing**: Document per-customer storage usage (~86GB for 4 cams × 14 days) and calculate B2 cost (~₪0.43/month)  
- [ ] **Plan C Local Cleanup Script**: Deploy local cleanup via `autoVodCleaner.ts` that reads `vod_files` and enforces retention based on `user_id → plan_id`  
- [ ] **Plan C Footage UI Adaptation**: Refactor footage page UI to support local Mini PC playback for Plan C  
- [ ] **Mini PC Local API**: Build small HTTP server to expose endpoints: footage list, playback stream, health check, config  
- [ ] **Plan-aware UI Logic**: On dashboard, detect user plan and dynamically choose between cloud player or local LAN player  
- [ ] **Plan Upgrade Handling**: When Plan C user upgrades, allow retroactive cloud upload of `.mp4` footage  
- [ ] **Meshulam Integration**: Embed iframe or redirect for payment flow; write Supabase plan updates based on success  
- [ ] **Automate VOD Upload**: Set cron job on Mini PC to run `autoVodUploader.ts` every X minutes  
- [ ] **Deployable FFmpeg Scripts**: Create `.sh` scripts using `generateCameraScript.ts` and make them downloadable from admin camera table  
- [ ] **Serve Local Live Stream**: Improve live streaming on local Mini PC using HLS + `npx serve` on port 8080  
- [ ] **Secure Start/Stop**: Add instructions or UI to kill running FFmpeg processes per camera (using PID tracking)

## ✅ Completed Tasks

- Supabase Auth + Storage setup  
- Configure RLS to restrict camera creation and visibility  
- Sync Supabase roles with session JWT  
- Secure server-side access based on user role  
- Create user via admin form and assign role  
- Build customer creation UI  
- Add camera creation UI with user selector  
- Restrict cameras by assigned user (RLS enforced)  
- Display cameras in Admin Panel and filter by user  
- Implement camera delete feature  
- Create clean sidebar layout for Admin  
- Add tooltip buttons to CameraCard  
- Make camera layout responsive  
- Add fixed icon buttons to bottom of camera card (enlarge, etc.)  
- Connect B2 and Bunny.net with secure S3 Auth  
- Fix Bunny Pull Zone Origin path issue (remove double bucket prefix)  
- Finalize small camera UI (thumbnail + title)  
- Remove live status/controls for cleaner layout  
- Implement react-player VOD viewer  
- Secure Video Delivery (Backblaze B2 + Bunny.net)  
- Default camera config set (720p, 10fps, H.265, 512kbps)  
- Build /dashboard/footage base layout with camera/date selection  
- Clean up MiniNavbar card behavior and animation  
- Scroll-aware MiniNavbar (hide on scroll down)  
- Implement signed Bunny URLs in upload script (14-day expiration)  
- Build unified scrubber player with real-time jump across footage timeline  
- Build custom timeline component with Apple-style design, RTL support, and red highlight for multi-cut segments  
- Add visual feedback for trim start/end and support downloading multi-cut segments via FFmpeg  
- Add processing loader and reset cuts button during trimming  
- Implement invite email flow with Supabase + Resend  
- Build `/setup-password` flow with PKCE-compatible session, strong password rules, and password visibility toggle  
- Build `/reset-password` recovery flow using Supabase PKCE with session validation + password rules  
- Improve `/forgot-password` UX to avoid email enumeration  
- Update `vod_files` table to use `user_id` as foreign key (replacing email)  
- Update VOD cleanup script (`autoVodCleaner.ts`) to use `user_id → plan_id` logic  
- Build admin-side `.sh` script generator and download button (per camera)  
- Add live-folder HTTP serving via `npx serve` in script  
- Add auto-cleanup of old `.ts` files inside camera startup script  
- Add "📄 הורד סקריפט .sh" button to admin camera table UI

## 📥 Backlog

- Add retry logging for failed B2 uploads (`upload_failures` table or local retry queue)  
- Monitor disk usage and alert if local SSD exceeds 90% (Plan C safeguard)  
- Schedule auto-upload and auto-cleanup scripts via CRON on Mini PC  
- Add Supabase RLS checks and enforce footage access by user + camera ownership  
- Implement Bunny URL checker – remove stale/expired VOD entries nightly  
- Allow retroactive upload of local `.mp4` files when Plan C user upgrades to Plan A/B  
- Track file sizes in `vod_files` for usage tracking and cost estimation  
- Add optional failure alerts to Telegram or Slack (on upload or cleanup errors)  
- Role assignment for public signups (if opened in future)  
- Storage limit enforcement (per plan)  
- Admin alerts: new user signup, camera offline  
- Clip trimming UI (if users want to cut and save segments)  
- Multi-camera view (grid playback or comparison layout)  
- AI-powered event tagging (motion, sound)

## 📌 Discovered During Work

- Supabase RLS blocked camera insert – fixed via admin-only policy  
- Camera insert failed due to missing service role – fixed  
- Role propagation was missing – resolved with Supabase callback  
- Need smart logic to limit access to older footage (based on user’s plan duration)  
- Stream path may be missing on fake cameras – added downloadScript guard to handle `undefined` RTSPs
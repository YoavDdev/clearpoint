# Documentation Audit & Migration Plan

> Reviewed: July 2026
> Scope: All 17 files in `docs/`, `installer/README.md`
> Goal: Design a long-term engineering knowledge base with zero duplication

---

## Part 1: Individual Document Audit

---

### 1. `PROJECT_BIBLE.md`

- **Current purpose**: New engineering knowledge base root document
- **Quality**: 9/10
- **Status**: `Current`
- **Reason**: Just created from verified codebase analysis. Accurate, well-structured, confidence-tagged.
- **Recommended action**: Keep as-is. This becomes the entry point for the new documentation system.

---

### 2. `Planning.md`

- **Current purpose**: Original project planning document — vision, features, tech stack, roadmap
- **Quality**: 4/10
- **Status**: `Deprecated`
- **Reason**: Contains multiple outdated claims:
  - Says "Supabase Auth (no NextAuth)" — but NextAuth is now the auth system
  - Says "Meshulam (payment gateway)" — but PayPlus is the actual gateway
  - Says "Next.js 14" — now Next.js 15
  - Lists "Raspberry Pi" references — system now runs on Mini PC (Intel N150)
  - Roadmap items like "Motion detection + tagging (future)" are now implemented (YOLOv8n)
  - VOD is listed as ".mp4 segments" — but implementation uses `.ts` segments
- **Valuable content to preserve**:
  - Original project vision and philosophy (lines 1-14)
  - VOD upload logic description (lines 42-62) — captures the *intent* even if details changed
  - Device setup flow USB structure (lines 104-131) — historical reference for installer evolution
- **Recommended action**: Archive. Extract any remaining unique business rationale into `DECISIONS.md`.

---

### 3. `Task.md`

- **Current purpose**: Task tracker with active/completed/backlog items
- **Quality**: 3/10
- **Status**: `Deprecated`
- **Reason**: Most "Active Tasks" are either implemented or abandoned:
  - "Disk Monitor" — implemented (Mini PC health reporting)
  - "Admin Alerts" — implemented (system_alerts + email notifications)
  - "Auto Upload Fail Retry" — implemented (uploadVods.ts has retry logic)
  - Several items reference "Supabase Auth (no NextAuth)" which is wrong
- **Valuable content to preserve**:
  - "Notes Discovered" section (lines 86-94) captures real bugs found during development — these are operational knowledge
- **Recommended action**: Archive. Move "Notes Discovered" into `OPERATIONS.md` as historical troubleshooting notes.

---

### 4. `SUPABASE_SCHEMA_AUDIT.md`

- **Current purpose**: Database schema documentation and API endpoint inventory
- **Quality**: 5/10
- **Status**: `Needs Update`
- **Reason**: 
  - Tables documented: `users`, `cameras`, `support_requests`, `subscription_requests`, `vod_files` — these are partially correct but incomplete
  - Missing tables: `mini_pcs`, `mini_pc_tokens`, `mini_pc_health`, `camera_health`, `alerts`, `alert_rules`, `system_logs`, `system_alerts`, `system_settings`, `invoices`, `invoice_items`, `recurring_payments`, `subscriptions`, `plans`, `document_number_counters`
  - API inventory is ~40% complete (lists ~20 endpoints; actual count is 90+)
  - Schema columns are partially correct for documented tables
  - "Database Issues" section (lines 135-147) captures real design problems (`user_email` redundancy) that are still relevant
  - SQL cleanup queries are risky to keep — someone might run them without context
- **Valuable content to preserve**:
  - Column definitions for `users`, `cameras`, `support_requests`, `subscription_requests` — verified against code, useful as baseline for `DATABASE.md`
  - Data inconsistency observations (lines 144-147) — still valid findings
- **Recommended action**: **Supersede with new `DATABASE.md`**. Archive this file. Use verified columns as starting point for new schema documentation.

---

### 5. `New-Clearpoint_Plans_Overview.md`

- **Current purpose**: Customer-facing plan descriptions (Plan A/B/C)
- **Quality**: 6/10
- **Status**: `Needs Update`
- **Reason**:
  - Plan structure (SIM/WiFi/Local) matches current code (`connection_type` field in `plans` table)
  - Says "GMKtec Mini PC" — matches current hardware
  - Plan C (Local NVR Only) — unclear if this is actually implemented in code. Code only checks for `sim` vs non-sim connection types. No "local only" mode found.
  - No pricing information (that's in other docs)
  - Clean and well-structured
- **Valuable content to preserve**:
  - Plan philosophy and feature matrix — this is business strategy documentation
  - The upgrade path concept
- **Recommended action**: Merge into `BUSINESS_RULES.md` as the "Subscription Plans" section. Verify Plan C against actual code.

---

### 6. `Plan_Master.md`

- **Current purpose**: Internal pricing reference with costs, margins, and break-even analysis
- **Quality**: 5/10
- **Status**: `Needs Update`
- **Reason**:
  - Hardware mentions both "Raspberry Pi 5" (old) and "GMKtec Mini PC" — mixed
  - **Pricing data is unique and valuable**: ₪99-₪159/month range, hardware costs ₪392-₪900, monthly cloud costs, profit margins
  - Plan structure matches current implementation
  - Annual discount details exist nowhere else
- **Valuable content to preserve**:
  - **ALL pricing and margin data** — this is core business information
  - Hardware cost breakdown
  - Monthly cloud cost estimates
  - Annual discount structure
- **Recommended action**: Merge pricing/cost data into `BUSINESS_RULES.md`. Update hardware references to current Mini PC. Archive original.

---

### 7. `Pricing_full.md`

- **Current purpose**: Detailed installation cost estimates and break-even analysis
- **Quality**: 4/10
- **Status**: `Deprecated`
- **Reason**:
  - Based entirely on Raspberry Pi 5 hardware — no longer used
  - Cost estimates are from AliExpress sourcing — may be outdated
  - Break-even calculations assume ₪69/month profit — pricing has likely changed
  - **However**: the methodology (hardware cost / monthly profit = break-even months) is valuable business logic
- **Valuable content to preserve**:
  - Break-even calculation methodology
  - Cloud cost estimates (B2 + Bunny)
  - Profitability tips
- **Recommended action**: Merge methodology and cloud cost estimates into `BUSINESS_RULES.md`. Archive original. Flag hardware costs for update.

---

### 8. `Plan_B_Cloud_VOD.md`

- **Current purpose**: Deep technical explanation of Plan B (WiFi) VOD pipeline
- **Quality**: 6/10
- **Status**: `Needs Update`
- **Reason**:
  - VOD pipeline description is largely accurate: FFmpeg → local → upload to B2 → metadata to Supabase → CDN playback
  - Says "every 15 minutes" — uploadVods.ts runs via cron (actual frequency may differ)
  - B2 folder structure `vod/{user_id}/{camera_id}/{date}/{time}.ts` — matches code
  - Storage calculations (5.5 GB/day/camera) appear reasonable
  - Says "GMKtec Mini PC with 256GB NVMe SSD" — matches current hardware
  - References "Node.js script" for upload — accurate (uploadVods.ts)
- **Valuable content to preserve**:
  - VOD pipeline architecture and data flow
  - Storage capacity planning numbers
  - Cost projections per customer at scale (100 customers = 15.4-30.8 TB)
- **Recommended action**: Merge VOD pipeline technical details into `SYSTEM_ARCHITECTURE.md`. Merge storage/cost projections into `BUSINESS_RULES.md`. Archive original.

---

### 9. `Clearpoint_Default_Camera_Config.md`

- **Current purpose**: Standard camera hardware settings for all installations
- **Quality**: 8/10
- **Status**: `Current`
- **Reason**:
  - Camera settings (720p, 10fps, H.265, 512kbps variable) are concrete operational specifications
  - AI detection requirements (Smart Codec OFF, 10+ FPS) are directly relevant to current YOLOv8n setup
  - Hikvision/Dahua specific instructions are field-tested knowledge
  - Nothing in this document is factually wrong for current operations
- **Valuable content to preserve**: **Everything** — this is field operations knowledge that cannot be reconstructed from code
- **Recommended action**: Move into new `MINI_PC.md` (or a dedicated `FIELD_OPERATIONS.md`) as the camera configuration section. Keep verbatim.

---

### 10. `Clearpoint_H265_Browser_Compatible.md`

- **Current purpose**: Despite the filename, this is actually a Raspberry Pi system overview
- **Quality**: 3/10
- **Status**: `Deprecated`
- **Reason**:
  - Title says "H265 Browser Compatible" but content is a Raspberry Pi setup summary
  - Based entirely on Raspberry Pi 5 (4GB) — no longer the production hardware
  - Architecture described (Pi → B2 → Bunny CDN) has been superseded by Mini PC architecture
  - Network/SIM estimates (500GB/month, ~320GB usage) are valuable but need recalculation for current hardware
  - Dashboard capabilities section is generic and duplicated by `PROJECT_BIBLE.md`
- **Valuable content to preserve**:
  - SIM bandwidth usage estimates (300GB VOD + 20GB live = 320GB for 4 cameras)
  - Storage breakdown concept (local = buffer, cloud = retention)
- **Recommended action**: Archive. Extract bandwidth estimates into `BUSINESS_RULES.md`.

---

### 11. `Clearpoint_Hebrew_Live_Stream_Explained.md`

- **Current purpose**: Hebrew-language explanation of live streaming architecture for non-technical audience
- **Quality**: 5/10
- **Status**: `Deprecated`
- **Reason**:
  - Written for Raspberry Pi architecture
  - Says streams are uploaded to Backblaze B2 then served via Bunny CDN — this describes VOD, not live streaming. Current live streaming uses **Cloudflare Tunnel directly**, not B2/Bunny
  - The "advantages" comparison table (RTSP direct vs Pi+cloud) is still conceptually valid
  - Written in Hebrew — useful as customer-facing or sales documentation
- **Valuable content to preserve**:
  - The security comparison table (line 53-56) — direct RTSP (unsafe) vs tunnel (safe)
  - The concept of explaining the architecture to non-technical users
- **Recommended action**: Archive. If customer-facing documentation is needed in the future, use this as a template but rewrite for current Cloudflare Tunnel architecture.

---

### 12. `Install_checklist.md`

- **Current purpose**: Physical hardware installation checklist for field technicians
- **Quality**: 4/10
- **Status**: `Needs Update`
- **Reason**:
  - Lists "Raspberry Pi 5 (4GB)" — wrong hardware
  - But the physical items checklist concept (PoE switch, cables, enclosure, tools, SIM router) is **valuable operational knowledge** regardless of compute hardware
  - Pre-installation checklist (bench test cameras, label ports, etc.) is field-proven
  - "Tailscale" mentioned — current system uses RustDesk for remote access
- **Valuable content to preserve**:
  - Physical installation items list (cables, tools, enclosure specs)
  - Pre-installation testing checklist
- **Recommended action**: Update hardware references. Move into `OPERATIONS.md` as "Field Installation Checklist". Archive original.

---

### 13. `camera-setup.md`

- **Current purpose**: Step-by-step camera setup guide (RTSP configuration, Supabase registration, FFmpeg streaming)
- **Quality**: 5/10
- **Status**: `Needs Update`
- **Reason**:
  - Step 1 (camera RTSP config) is largely accurate and useful
  - Step 2 (Supabase registration) says to set `user_email` — this matches current schema but is a known design issue
  - Step 3 (remote access via port forwarding/DDNS) is **obsolete** — current system uses Cloudflare Tunnel, no port forwarding needed
  - Step 4 (FFmpeg command) shows transcoding with `-c:v libx264` — current system uses `-c copy` (no transcoding)
  - Resolution says `1920x1080` but default config doc says `1280x720`
  - Contradicts `Clearpoint_Default_Camera_Config.md` on resolution and bitrate
- **Valuable content to preserve**:
  - RTSP testing with VLC workflow (lines 20-24)
  - Camera web UI access instructions (Step 1)
- **Recommended action**: Supersede with updated content in `MINI_PC.md`. Archive original.

---

### 14. `pc-setup-guide.md`

- **Current purpose**: Complete Mini PC installation guide — office prep and field installation
- **Quality**: 7/10
- **Status**: `Needs Update`
- **Reason**:
  - Most accurate of the setup guides — uses Mini PC (not Pi), Ubuntu 22.04, correct toolchain
  - Two-phase structure (Office Prep → On-Site) is excellent operational design
  - USB file layout matches actual `scripts/` directory
  - Cloudflare tunnel setup instructions are correct and detailed
  - `.env` content shows `SUPABASE_SERVICE_KEY` on Mini PC — this is the known security concern (service role on client device), now mitigated by device tokens
  - RustDesk remote access section is current
  - Final checklist is comprehensive
  - Says Ubuntu 22.04 but `installer/README.md` says Ubuntu 24.04 — version discrepancy
- **Valuable content to preserve**:
  - **Phase 1/Phase 2 structure** — this is the correct operational workflow
  - Cloudflare tunnel creation steps
  - DNS record instructions
  - Final verification checklist
- **Recommended action**: Update for current OS version and device token workflow. Move into `OPERATIONS.md` as primary installation guide. Archive original.

---

### 15. `pi-setup-guide.md`

- **Current purpose**: Raspberry Pi specific setup guide
- **Quality**: 3/10
- **Status**: `Deprecated`
- **Reason**:
  - Entirely Raspberry Pi focused — not current hardware
  - Uses `crontab -e` with `@reboot` — current system uses systemd services
  - USB layout shows old file structure
  - Cloudflare tunnel instructions duplicate `pc-setup-guide.md`
- **Valuable content to preserve**: None unique — all content is duplicated in `pc-setup-guide.md` (which is more current)
- **Recommended action**: Archive.

---

### 16. `installer-v2-design.md`

- **Current purpose**: Design specification for an automated GUI installer (Wizard) for Ubuntu 22.04
- **Quality**: 8/10
- **Status**: `Current` (as a design document — not yet implemented)
- **Reason**:
  - Clearly scoped (V2 in-scope, V3 future)
  - UX flow (Welcome → Customer Details → Camera Files → Cloudflare → Install → Verify → Finish) is well-designed
  - Explicitly notes "does not change existing code" — it's a forward-looking spec
  - Security section (lines 167-178) documents the known service-role-on-device issue and proposes device tokens as V3 — which has since been implemented!
  - `config.yml` schema proposal (lines 115-134) is a clean design that hasn't been adopted yet
  - Systemd services plan (lines 137-148) aligns with current implementation
- **Valuable content to preserve**:
  - **UX flow design** — valuable for when the GUI installer is actually built
  - **Security evolution documentation** (service role → device token) — captures the *why* behind architectural decisions
  - **Acceptance tests** (lines 181-191) — these are real verification criteria
- **Recommended action**: Keep as a design document. Move to `docs/design/installer-v2.md`. Reference from `DECISIONS.md` for the security evolution.

---

### 17. `installer-v2-design.pdf`

- **Current purpose**: PDF version of the installer design
- **Quality**: N/A (binary file, likely same content as the .md)
- **Status**: `Archive`
- **Reason**: Duplicate of the `.md` file. PDFs are not searchable by tooling or AI.
- **Recommended action**: Archive. Keep `.md` as source of truth.

---

### 18. `installer/README.md`

- **Current purpose**: Documentation for the Ubuntu 24.04 automated installer scripts
- **Quality**: 7/10
- **Status**: `Current`
- **Reason**:
  - Documents the actual installer scripts in `installer/` directory
  - Ubuntu 24.04 focus (more recent than `pc-setup-guide.md` which says 22.04)
  - USB preparation workflow with `prepare-usb.ps1` is unique and practical
  - Troubleshooting section is field-tested
  - System requirements are clearly stated
  - File structure is documented
- **Valuable content to preserve**:
  - **All of it** — this documents the actual installer code in `installer/`
  - Troubleshooting table is operational knowledge
- **Recommended action**: Keep in place (it lives with its code). Reference from `OPERATIONS.md` and `MINI_PC.md`.

---

## Part 2: Duplication Map

Content that exists in multiple documents:

| Topic | Documents | Recommendation |
|-------|-----------|----------------|
| Plan descriptions (A/B/C) | `New-Clearpoint_Plans_Overview.md`, `Plan_Master.md`, `Plan_B_Cloud_VOD.md`, `Planning.md` | Consolidate into `BUSINESS_RULES.md` |
| Pricing & costs | `Plan_Master.md`, `Pricing_full.md`, `Plan_B_Cloud_VOD.md` | Consolidate into `BUSINESS_RULES.md` |
| Hardware setup (Pi) | `pi-setup-guide.md`, `Clearpoint_H265_Browser_Compatible.md`, `Install_checklist.md` | Archive all. `pc-setup-guide.md` is canonical |
| Hardware setup (Mini PC) | `pc-setup-guide.md`, `installer/README.md` | `installer/README.md` stays with code. `pc-setup-guide.md` → `OPERATIONS.md` |
| Camera RTSP setup | `camera-setup.md`, `Clearpoint_Default_Camera_Config.md`, `pc-setup-guide.md` | `Default_Camera_Config` is canonical for settings. Merge setup steps into `OPERATIONS.md` |
| Cloudflare tunnel | `pi-setup-guide.md`, `pc-setup-guide.md`, `installer/README.md`, `installer-v2-design.md` | `installer/README.md` for automated. Manual steps in `OPERATIONS.md` |
| VOD pipeline | `Plan_B_Cloud_VOD.md`, `Planning.md`, `Task.md` | Consolidate into `SYSTEM_ARCHITECTURE.md` |
| Tech stack | `Planning.md`, `PROJECT_BIBLE.md` | `PROJECT_BIBLE.md` is canonical |
| Database schema | `SUPABASE_SCHEMA_AUDIT.md`, `Plan_B_Cloud_VOD.md` | New `DATABASE.md` is canonical |
| API endpoints | `SUPABASE_SCHEMA_AUDIT.md` | New `API_REFERENCE.md` is canonical |
| Live streaming architecture | `Clearpoint_Hebrew_Live_Stream_Explained.md`, `Planning.md`, `PROJECT_BIBLE.md` | `PROJECT_BIBLE.md` is canonical |

---

## Part 3: Contradiction Register

| Item | Doc A says | Doc B says | Truth (from code) |
|------|-----------|-----------|-------------------|
| Auth system | `Planning.md`: "Supabase Auth (no NextAuth)" | `PROJECT_BIBLE.md`: "NextAuth CredentialsProvider" | **NextAuth** — verified from `[...nextauth]/route.ts` |
| Payment gateway | `Planning.md`: "Meshulam" | Code: PayPlus | **PayPlus** — verified from webhooks and cron |
| Next.js version | `Planning.md`: "Next.js 14" | `package.json`: Next.js 15 | **Next.js 15** |
| Hardware | `pi-setup-guide.md`: Raspberry Pi 5 | `pc-setup-guide.md`: Mini PC | **Mini PC (Intel N150)** — verified from health reporting |
| Camera resolution | `camera-setup.md`: 1920×1080 | `Default_Camera_Config.md`: 1280×720 | **1280×720** — matches default config and AI detection requirements |
| Live stream delivery | `Hebrew_Live_Stream.md`: via B2 + Bunny CDN | `SurveillanceCameraView.tsx`: via Cloudflare Tunnel | **Cloudflare Tunnel** — verified from component code |
| Upload frequency | `Planning.md`: "every 20 minutes" | `Plan_B_Cloud_VOD.md`: "every 15 minutes" | **Cron-based, frequency configured on device** — not determined by docs |
| Ubuntu version | `pc-setup-guide.md`: 22.04 | `installer/README.md`: 24.04 | **Both supported**; installer targets 24.04 |
| FFmpeg transcoding | `camera-setup.md`: `-c:v libx264` (transcode) | `Clearpoint_H265_Browser_Compatible.md`: `-c copy` (passthrough) | **`-c copy`** for recording; transcode only for HLS live |

---

## Part 4: Recommended Documentation Structure

```
docs/
├── PROJECT_BIBLE.md              ← Entry point (exists, keep)
├── SYSTEM_ARCHITECTURE.md        ← To create
├── DATABASE.md                   ← To create
├── API_REFERENCE.md              ← To create
├── SECURITY.md                   ← To create
├── MINI_PC.md                    ← To create
├── MONITORING.md                 ← To create
├── BUSINESS_RULES.md             ← To create
├── OPERATIONS.md                 ← To create
├── ENGINEERING_GUIDELINES.md     ← To create
├── TECHNICAL_DEBT.md             ← To create
├── DECISIONS.md                  ← To create
│
├── design/                       ← Forward-looking design specs
│   └── installer-v2.md           ← Move from docs root
│
├── archive/                      ← Historical documents (read-only reference)
│   ├── Planning.md
│   ├── Task.md
│   ├── SUPABASE_SCHEMA_AUDIT.md
│   ├── Pricing_full.md
│   ├── Plan_B_Cloud_VOD.md
│   ├── Clearpoint_H265_Browser_Compatible.md
│   ├── Clearpoint_Hebrew_Live_Stream_Explained.md
│   ├── Install_checklist.md
│   ├── camera-setup.md
│   ├── pi-setup-guide.md
│   ├── pc-setup-guide.md
│   ├── installer-v2-design.pdf
│   └── ARCHIVE_INDEX.md          ← What's here and why
│
└── DOCUMENTATION_AUDIT.md        ← This file (migration plan, then archive)

installer/
└── README.md                     ← Stays with code (no change)
```

---

## Part 5: Migration Plan

### Step 1: Create archive structure
- Create `docs/archive/`
- Create `docs/design/`
- Create `docs/archive/ARCHIVE_INDEX.md` listing every archived doc with reason

### Step 2: Move documents

| Document | Action | Destination |
|----------|--------|-------------|
| `PROJECT_BIBLE.md` | **Keep** | `docs/PROJECT_BIBLE.md` |
| `installer-v2-design.md` | **Move** | `docs/design/installer-v2.md` |
| `installer-v2-design.pdf` | **Move** | `docs/archive/installer-v2-design.pdf` |
| `Clearpoint_Default_Camera_Config.md` | **Move** | `docs/archive/` (content absorbed into `MINI_PC.md`) |
| `New-Clearpoint_Plans_Overview.md` | **Move** | `docs/archive/` (content absorbed into `BUSINESS_RULES.md`) |
| `Plan_Master.md` | **Move** | `docs/archive/` (content absorbed into `BUSINESS_RULES.md`) |
| `Planning.md` | **Move** | `docs/archive/` |
| `Task.md` | **Move** | `docs/archive/` |
| `SUPABASE_SCHEMA_AUDIT.md` | **Move** | `docs/archive/` (superseded by `DATABASE.md`) |
| `Pricing_full.md` | **Move** | `docs/archive/` |
| `Plan_B_Cloud_VOD.md` | **Move** | `docs/archive/` |
| `Clearpoint_H265_Browser_Compatible.md` | **Move** | `docs/archive/` |
| `Clearpoint_Hebrew_Live_Stream_Explained.md` | **Move** | `docs/archive/` |
| `Install_checklist.md` | **Move** | `docs/archive/` |
| `camera-setup.md` | **Move** | `docs/archive/` |
| `pi-setup-guide.md` | **Move** | `docs/archive/` |
| `pc-setup-guide.md` | **Move** | `docs/archive/` |
| `installer/README.md` | **Keep in place** | `installer/README.md` |
| `DOCUMENTATION_AUDIT.md` | **Archive after migration** | `docs/archive/` |

### Step 3: Create new documents (in order)

Each document absorbs content from archived sources as specified:

| New Document | Primary Sources | Key Content Absorbed |
|-------------|----------------|---------------------|
| `SYSTEM_ARCHITECTURE.md` | `Plan_B_Cloud_VOD.md`, `Planning.md`, code | VOD pipeline details, data flows |
| `DATABASE.md` | `SUPABASE_SCHEMA_AUDIT.md`, migrations, code | Column definitions, verified + expanded |
| `API_REFERENCE.md` | `SUPABASE_SCHEMA_AUDIT.md`, code | Endpoint list, verified + expanded to 90+ routes |
| `SECURITY.md` | `installer-v2-design.md` (security section), code | Service role evolution, device token rationale |
| `MINI_PC.md` | `Clearpoint_Default_Camera_Config.md`, `pc-setup-guide.md`, `camera-setup.md` | Camera settings, FFmpeg config, installation steps |
| `MONITORING.md` | Code only | Health model, alert lifecycle |
| `BUSINESS_RULES.md` | `New-Clearpoint_Plans_Overview.md`, `Plan_Master.md`, `Pricing_full.md`, `Clearpoint_H265_Browser_Compatible.md` | Plans, pricing, bandwidth estimates, costs |
| `OPERATIONS.md` | `pc-setup-guide.md`, `Install_checklist.md`, `Task.md` (notes), `camera-setup.md` | Installation flow, checklists, troubleshooting |
| `ENGINEERING_GUIDELINES.md` | Code patterns | Conventions discovered in codebase |
| `TECHNICAL_DEBT.md` | Previous architecture/production reviews | All issues catalogued |
| `DECISIONS.md` | `installer-v2-design.md` (security evolution), `Planning.md` (original vision) | Why decisions were made |

### Step 4: Verify no information loss
- Cross-reference every archived document against new docs
- Confirm all pricing data, hardware specs, bandwidth estimates, and field procedures are preserved
- Confirm all historical decisions and bug notes are captured

### Step 5: Archive this audit
- Move `DOCUMENTATION_AUDIT.md` to `docs/archive/`
- It served its purpose as the migration plan

---

## Part 6: Summary Statistics

| Metric | Count |
|--------|-------|
| Total documents audited | 18 |
| Keep as-is | 2 (`PROJECT_BIBLE.md`, `installer/README.md`) |
| Move to design/ | 1 (`installer-v2-design.md`) |
| Archive | 14 (all legacy docs) |
| Delete | 0 |
| New documents to create | 11 |
| Documents with contradictions | 9 |
| Documents with outdated hardware refs | 7 |

**Zero documents deleted. All knowledge preserved via archive or absorption into new docs.**

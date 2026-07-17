# Clearpoint Security — Project Bible

<!--
purpose: Complete system overview — business model, architecture, workflows, technology stack
audience: All engineers, AI assistants, new team members
when_to_read: First technical document after MANIFESTO.md — required reading before any work
prerequisites: MANIFESTO.md
related_docs:
  - MANIFESTO.md (engineering philosophy — read first)
  - SYSTEM_ARCHITECTURE.md (detailed component design)
  - DATABASE.md (schema reference)
  - API_REFERENCE.md (endpoint reference)
  - SECURITY.md (auth and threat model)
  - MINI_PC.md (on-premises hardware)
source_of_truth_for: Business overview, product vision, core concepts, high-level architecture, main workflows, technology stack
confidence: Verified
last_verified: 2026-07-17
owner: Engineering Lead
-->

> Single source of truth for the Clearpoint Security platform.
> Last verified against codebase: July 2026.

---

## Business Overview

Clearpoint Security is a cloud-managed video surveillance platform for small businesses and residential customers in Israel. The system combines physical hardware (Mini PCs + IP cameras) installed at customer premises with a cloud dashboard for live viewing, recorded footage playback, and AI-powered security alerts.

**Business model**: Monthly subscription with hardware installation. Revenue comes from recurring payments processed via PayPlus (Israeli payment gateway).

**Market**: Israeli small businesses and residential properties requiring 1–4 camera setups per site.

**Confidence**: `Verified` — confirmed from billing routes, Hebrew UI strings, PayPlus integration, `.co.il` domain usage, and customer-facing pages.

---

## Product Vision

A complete, managed security solution where:
1. Customers see live camera feeds from anywhere (phone/desktop)
2. AI detects security events (people, vehicles, fire, weapons) in real-time
3. Recorded footage is stored in the cloud with configurable retention
4. The system monitors its own health and alerts support staff proactively
5. Billing is fully automated with recurring payments

**Confidence**: `Verified` — all five capabilities have working code paths in the repository.

---

## Core Concepts

### Customer
A paying user with a login. Owns one or more Mini PCs and cameras. Manages alert rules and views footage.
- **Table**: `users`
- **Auth**: Supabase Auth + NextAuth session
- **Confidence**: `Verified`

### Mini PC
A small form-factor computer (Intel N150, 4 cores, 8GB RAM) installed at customer premises. Runs AI detection, manages camera streams, records VOD, and reports health.
- **Table**: `mini_pcs`
- **Relationship**: Belongs to one user. Has one device token.
- **Confidence**: `Verified` — from health reporting routes, AI detection script, and admin pages.

### Camera
An IP camera connected to a Mini PC via RTSP. Each camera has a live stream and optional VOD recording.
- **Table**: `cameras`
- **Relationship**: Belongs to one user AND one Mini PC. Has fields `user_id`, `user_email`, and `mini_pc_id`.
- **Confidence**: `Verified` — from multiple API routes querying cameras.

### Device Token
A per-Mini PC authentication credential used by ingest endpoints. SHA-256 hashed, stored in `mini_pc_tokens`. Revocable. One active token per device at a time.
- **Confidence**: `Verified` — from 6 ingest routes and the token creation admin route.

### Subscription
Determines customer access level. Linked to a plan which defines connection type (SIM vs WiFi).
- **Tables**: `subscriptions`, `recurring_payments`, `plans`
- **Confidence**: `Partially Verified` — queried extensively in code but no CREATE TABLE migrations found in repo.

### Alert Rule
Customer-defined rules for when to trigger security alerts. Includes detection type, schedule, confidence threshold, cooldown period, and notification preferences.
- **Table**: `alert_rules`
- **Confidence**: `Verified` — from migration and `/api/ingest/alert` route.

### Alert
A security event generated when AI detection matches an active rule. Includes snapshot, confidence score, and acknowledgement state.
- **Table**: `alerts`
- **Confidence**: `Verified` — from migration and alert ingest/cleanup routes.

### VOD (Video on Demand)
Recorded footage segments uploaded from Mini PC to Bunny CDN (B2 storage). Playback via signed URLs with retention-based cleanup.
- **Table**: `vod_files` (assumed name — referenced in routes but no migration seen)
- **Confidence**: `Partially Verified` — upload and playback routes exist, table name inferred.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CUSTOMER SITE                             │
│                                                                  │
│  ┌──────────┐    RTSP     ┌──────────────────────────────────┐  │
│  │ IP Camera├────────────►│         Mini PC (Intel N150)      │  │
│  │ (×1-4)   │             │                                   │  │
│  └──────────┘             │  • AI Detection (YOLOv8n/OpenVINO)│  │
│                           │  • VOD Recording (FFmpeg)          │  │
│                           │  • Health Reporting                │  │
│                           │  • Live Stream (Cloudflare Tunnel) │  │
│                           └───────────────┬───────────────────┘  │
│                                           │                      │
└───────────────────────────────────────────┼──────────────────────┘
                                            │ HTTPS
                                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                         CLOUD (Vercel + Supabase)                │
│                                                                  │
│  ┌─────────────────┐   ┌──────────────────┐   ┌─────────────┐  │
│  │ Next.js App     │   │ Supabase         │   │ Bunny CDN   │  │
│  │ (Vercel, iad1)  │   │ (PostgreSQL+Auth)│   │ (B2 Storage)│  │
│  │                 │   │                  │   │             │  │
│  │ • Admin Panel   │   │ • All tables     │   │ • VOD files │  │
│  │ • Customer UI   │   │ • RLS policies   │   │ • Signed URL│  │
│  │ • API Routes    │   │ • Auth users     │   │             │  │
│  │ • Ingest API    │   │                  │   └─────────────┘  │
│  │ • Cron Jobs     │   │                  │                     │
│  └─────────────────┘   └──────────────────┘                     │
│                                                                  │
│  ┌─────────────────┐   ┌──────────────────┐                     │
│  │ Resend          │   │ PayPlus          │                     │
│  │ (Email)         │   │ (Payments)       │                     │
│  └─────────────────┘   └──────────────────┘                     │
│                                                                  │
│  ┌─────────────────┐                                             │
│  │ Supabase Storage│                                             │
│  │ (alert-snapshots│                                             │
│  └─────────────────┘                                             │
└─────────────────────────────────────────────────────────────────┘
                                            ▲
                                            │ HTTPS
                                            │
┌───────────────────────────────────────────┼──────────────────────┐
│                      CUSTOMER BROWSER                             │
│                                                                   │
│  • Live stream via HLS: https://{tunnel}.clearpoint.co.il/       │
│  • Dashboard: https://www.clearpoint.co.il/dashboard             │
│  • VOD playback via Bunny CDN signed URLs                        │
└───────────────────────────────────────────────────────────────────┘
```

**Confidence**: `Verified` — all components confirmed from code, config, and API routes.

---

## Main Workflows

### 1. Live Viewing

```
Customer Browser → Cloudflare Tunnel → Mini PC → RTSP Camera
                   (HLS stream via {tunnel_name}.clearpoint.co.il)
```

The Next.js server is NOT in the live stream path. The browser connects directly to the Mini PC via a Cloudflare tunnel. The server only provides the stream URL.

- **Stream URL pattern**: `https://${tunnelName}.clearpoint.co.il/${cameraId}/stream.m3u8`
- **Source**: `SurveillanceCameraView.tsx`
- **Confidence**: `Verified`

### 2. VOD Recording & Playback

```
Mini PC (FFmpeg) → uploadVods.ts → Bunny CDN (B2)
                                         ↓
Customer Browser ← Signed URL ← /api/vod/signed-url ← /api/user-footage
```

- Mini PC records RTSP to local files
- `uploadVods.ts` script uploads to Bunny CDN with `BUNNY_TOKEN_KEY`
- Metadata is registered via `/api/ingest/vod-file`
- Playback uses signed URLs generated server-side
- Cleanup via `cleanupOldVods.ts` based on retention period
- **Confidence**: `Verified`

### 3. AI Detection & Alerts

```
Mini PC (detect.py/YOLOv8n) → /api/ingest/alert → DB insert
                                                      ↓
                               Rule matching (schedule, confidence, cooldown)
                                                      ↓
                               alerts table (with optional snapshot upload to Supabase Storage)
```

- Detection runs on Mini PC with OpenVINO FP16 optimization
- Categories: person, vehicle, animal, suspicious_object, weapon, fire, smoke
- Server evaluates against user's active `alert_rules`
- Cooldown prevents duplicate alerts
- Snapshots uploaded as base64 in request, stored in `alert-snapshots` bucket
- **Customer notifications (email/push) are NOT YET IMPLEMENTED** — only DB insert happens
- **Confidence**: `Verified`

### 4. Health Monitoring

```
Mini PC → /api/ingest/mini-pc-health (every ~60s)
Mini PC → /api/ingest/camera-health  (per camera, every ~60s)
                        ↓
               camera_health / mini_pc_health tables (UPSERT, 1 row per device)
                        ↓
               /api/admin/diagnostics/monitor (cron/manual trigger)
                        ↓
               system_alerts table + email to SUPPORT_TEAM_EMAILS
```

- Health tables use unique indexes: one row per device, always current
- Monitor evaluates thresholds (offline timeout, disk usage, temperature)
- Alert suppression: camera alerts suppressed when parent Mini PC is offline
- Notifications go to admin/support team only, never to end customers
- **Confidence**: `Verified`

### 5. Billing & Subscriptions

```
Admin creates customer → Sets up recurring payment via PayPlus
                                    ↓
PayPlus charges monthly → Webhook /api/webhooks/payplus → Creates invoice
                                    ↓
Cron /api/cron/sync-payplus-recurring → Syncs payment status daily at 04:00
```

- PayPlus webhook validates signature via `verifyWebhookSignature`
- Invoices sent to customers via email (Resend)
- Subscription status checked from both `subscriptions` and `recurring_payments` tables
- **Confidence**: `Verified` — webhook, cron, and sync routes all confirmed.

### 6. Customer Onboarding

```
Admin creates user (Supabase Auth) → Assigns plan → Installs Mini PC → Generates device token
                                                                              ↓
                                                     Mini PC configured with token in .env
                                                                              ↓
                                                     Mini PC starts reporting health + uploading VOD
```

- Users MUST be pre-created by admin (confirmed from auth route comment)
- Token generated via `/api/admin/mini-pc-tokens/create`
- **Confidence**: `Verified`

---

## Engineering Philosophy

Based on patterns observed across the codebase:

### Hebrew-First UI
All customer-facing text, error messages, and notifications are in Hebrew. API internals and code comments mix Hebrew and English. Variable names and keys are English.

### Admin-Operated System
Customers do not self-serve. No self-registration. No self-service plan changes. Admin creates users, assigns plans, generates tokens, installs hardware.

### Service Role for Admin, RLS for Customers
Admin API routes use `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS). Customer-facing routes use anon/authenticated Supabase clients where RLS enforces data isolation.

### Edge-Heavy Architecture
AI processing, video recording, and live streaming run on-premises (Mini PC). The cloud server is primarily CRUD + billing + monitoring. This reduces cloud costs and latency for real-time features.

### Single-Tenant Mini PCs
Each Mini PC belongs to exactly one customer. There is no shared hardware.

### Fail-Open for Customer Access
Middleware subscription check (line 63): if the server-side check fails, access is allowed rather than blocked. This prevents system outages from locking customers out.

**Confidence for all above**: `Verified` — derived directly from code patterns, not inferred.

---

## Technology Stack

| Layer | Technology | Confidence |
|-------|-----------|------------|
| Frontend | Next.js 15 (App Router), React, TailwindCSS, Radix UI | `Verified` |
| Backend | Next.js API Routes (Vercel serverless) | `Verified` |
| Database | Supabase (PostgreSQL) with RLS | `Verified` |
| Auth | Supabase Auth + NextAuth (CredentialsProvider) | `Verified` |
| Payments | PayPlus (Israeli gateway) | `Verified` |
| Email | Resend | `Verified` |
| VOD Storage | Backblaze B2 via Bunny CDN | `Verified` |
| Alert Snapshots | Supabase Storage (`alert-snapshots` bucket) | `Verified` |
| Live Streaming | Cloudflare Tunnel → HLS | `Verified` |
| AI Inference | YOLOv8n + OpenVINO (FP16, on Mini PC) | `Verified` |
| Deployment | Vercel (region: `iad1`) | `Verified` |
| Cron | Vercel Cron Jobs | `Verified` |

---

## Related Documents

- [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md) — detailed component breakdown
- [DATABASE.md](./DATABASE.md) — full schema documentation
- [API_REFERENCE.md](./API_REFERENCE.md) — every endpoint documented
- [SECURITY.md](./SECURITY.md) — auth, threats, and risks
- [MINI_PC.md](./MINI_PC.md) — on-premises hardware documentation
- [MONITORING.md](./MONITORING.md) — health and alert systems
- [BUSINESS_RULES.md](./BUSINESS_RULES.md) — all business logic
- [OPERATIONS.md](./OPERATIONS.md) — operational procedures
- [ENGINEERING_GUIDELINES.md](./ENGINEERING_GUIDELINES.md) — conventions
- [TECHNICAL_DEBT.md](./TECHNICAL_DEBT.md) — known issues
- [DECISIONS.md](./DECISIONS.md) — architectural decisions

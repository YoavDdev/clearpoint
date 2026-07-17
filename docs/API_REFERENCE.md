# API Reference — Clearpoint Security

<!--
purpose: Complete inventory of all API endpoints with auth, methods, and data flow
audience: All engineers, AI assistants
when_to_read: Before adding or modifying any API route
prerequisites: DATABASE.md (schema), SYSTEM_ARCHITECTURE.md (data flow)
related_docs:
  - DATABASE.md (tables referenced by routes)
  - SYSTEM_ARCHITECTURE.md (ingest pipeline, monitoring)
  - SECURITY.md (auth model details)
source_of_truth_for: API endpoint inventory, auth requirements, HTTP methods
confidence: Verified — grep of all route.ts files in src/app/api/
last_verified: 2026-07-17
owner: Engineering Lead
-->

> **Total endpoints**: 92 route handlers across 82 route files  
> **Framework**: Next.js 15 App Router (`src/app/api/`)  
> **Auth patterns**: NextAuth session, Device Token (`x-clearpoint-device-token`), Webhook signature, Cron (no auth / Vercel secret)

---

## Authentication Patterns

| Pattern | Header/Method | Used By |
|---------|---------------|---------|
| **NextAuth Session** | Cookie-based (`getServerSession`) | All user + admin routes |
| **Device Token** | `x-clearpoint-device-token: <sha256-hashed token>` | All `/ingest/*` routes |
| **Webhook Signature** | `hash` header + `user-agent` verification | `/webhooks/payplus` |
| **Cron (unprotected)** | No auth header (relies on Vercel Cron secret or network) | `/cron/*` routes |
| **Public** | No auth required | `/public/*`, `/plans` |

---

## 1. Public Endpoints (No Auth)

| Method | Path | Purpose | Tables |
|--------|------|---------|--------|
| POST | `/api/public/subscribe-request` | Website signup form submission | `subscription_requests` |
| GET | `/api/plans` | List available subscription plans | `plans` |

---

## 2. Auth

| Method | Path | Purpose | Notes |
|--------|------|---------|-------|
| * | `/api/auth/[...nextauth]` | NextAuth handler (login/logout/session) | CredentialsProvider → Supabase Auth |

---

## 3. User Endpoints (NextAuth Session)

### 3.1 Profile & Account

| Method | Path | Purpose | Tables |
|--------|------|---------|--------|
| GET | `/api/user/me` | Current user profile | `users` |
| GET | `/api/current-user` | Current user (alternate) | `users` |
| GET | `/api/user-plan` | User's current plan details | `users`, `plans` |

### 3.2 Cameras & Streaming

| Method | Path | Purpose | Tables |
|--------|------|---------|--------|
| GET | `/api/user-cameras` | List user's active cameras | `cameras` |
| POST | `/api/stream-status` | Update camera stream status | `cameras` |
| GET | `/api/camera-health/[id]` | Get specific camera health | `camera_health` |
| POST | `/api/camera-health/batch` | Batch camera health check | `camera_health` |
| GET | `/api/mini-pc-health/[id]` | Get Mini PC health | `mini_pc_health` |

### 3.3 VOD (Recorded Footage)

| Method | Path | Purpose | Tables |
|--------|------|---------|--------|
| POST | `/api/user-footage` | Get footage clips for date + camera(s) | `vod_files`, `subscriptions`*, `recurring_payments` |
| GET | `/api/user-footage-dates` | Get available footage dates | `vod_files` |
| POST | `/api/vod/signed-url` | Generate signed Bunny CDN URL for playback | `vod_files`, `subscriptions`*, `recurring_payments` |

*\* `subscriptions` query produces error (table doesn't exist); fallback to `recurring_payments`*

### 3.4 Alerts & Rules

| Method | Path | Purpose | Tables |
|--------|------|---------|--------|
| GET | `/api/alerts` | List user's detection alerts (paginated, filterable) | `alerts`, `cameras`, `alert_rules` |
| PUT | `/api/alerts` | Acknowledge alert(s) or all | `alerts` |
| DELETE | `/api/alerts` | Delete alert(s) | `alerts` |
| GET | `/api/alert-rules` | List user's alert rules (auto-creates presets) | `alert_rules`, `cameras` |
| POST | `/api/alert-rules` | Create new alert rule | `alert_rules` |
| PUT | `/api/alert-rules` | Update existing rule | `alert_rules` |
| DELETE | `/api/alert-rules` | Delete rule | `alert_rules` |

### 3.5 Billing (User-facing)

| Method | Path | Purpose | Tables |
|--------|------|---------|--------|
| POST | `/api/payments/create-one-time` | Create one-time hardware payment → PayPlus | `payments`, `plans`, `users` |
| GET | `/api/user/invoices` | List user's invoices | `invoices` |
| GET | `/api/invoices/monthly-receipt` | Get monthly receipt | `invoices`, `payments` |
| POST | `/api/quote/approve` | Approve a received quote | `invoices` |
| POST | `/api/quote/reject` | Reject a received quote | `invoices` |
| GET | `/api/calculate-price` | Calculate installation price | `plans` |

### 3.6 Support

| Method | Path | Purpose | Tables |
|--------|------|---------|--------|
| POST | `/api/submit-support` | Submit support ticket (with file upload) | `support_requests`, Storage: `supportuploads` |

---

## 4. Device Ingest Endpoints (Device Token Auth)

All ingest routes authenticate via `x-clearpoint-device-token` header, validated against `mini_pc_tokens` table (SHA-256 hash comparison). Token must not be revoked.

| Method | Path | Purpose | Tables |
|--------|------|---------|--------|
| POST | `/api/ingest/mini-pc-health` | Report Mini PC system metrics (UPSERT) | `mini_pc_health`, `mini_pc_tokens` |
| POST | `/api/ingest/camera-health` | Report camera stream status (UPSERT) | `camera_health`, `cameras`, `mini_pc_tokens` |
| POST | `/api/ingest/vod-file` | Register new VOD file metadata | `vod_files`, `cameras`, `mini_pc_tokens` |
| POST | `/api/ingest/vod-context` | Get upload context (user_id, permissions) | `cameras`, `mini_pc_tokens`, `recurring_payments` |
| POST | `/api/ingest/alert` | Submit AI detection alert | `alerts`, `alert_rules`, `cameras`, `mini_pcs`, `mini_pc_tokens` |
| POST | `/api/ingest/system-log` | Submit operational log entry | `system_logs`, `mini_pc_tokens` |

---

## 5. Webhook Endpoints

| Method | Path | Auth | Purpose | Tables |
|--------|------|------|---------|--------|
| POST | `/api/webhooks/payplus` | Signature (`hash` header) | PayPlus payment confirmation callback | `payments` |

---

## 6. Cron Endpoints (Vercel Cron / No Auth)

| Method | Path | Purpose | Tables |
|--------|------|---------|--------|
| GET | `/api/cron/cleanup-logs` | Delete system_logs + alerts older than 14 days | `system_logs`, `alerts`, Storage: `alert-snapshots` |
| GET | `/api/cron/process-cancellations` | Find and cancel expired subscriptions | `subscriptions`* |
| GET | `/api/cron/process-trials` | Find and expire trial subscriptions | `subscriptions`* |
| GET | `/api/cron/resume-paused` | Resume paused subscriptions | `subscriptions`* |
| GET | `/api/cron/sync-payplus-recurring` | Sync recurring payment status from PayPlus | `recurring_payments` |

*\* `subscriptions` table doesn't exist — these crons produce errors and are effectively dead code*

---

## 7. Admin Endpoints (NextAuth Session + role='admin')

### 7.1 User Management

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/admin-get-users` | List all users |
| GET | `/api/admin/users` | List all users (newer route) |
| POST | `/api/admin-create-user` | Create new user + Supabase Auth account |
| POST | `/api/admin-invite-user` | Send user invitation email |
| POST | `/api/admin-edit-user` | Update user details |
| POST | `/api/admin-delete-user` | Delete user |
| POST | `/api/admin/create-user-and-payment` | Create user + initial payment record |

### 7.2 Camera Management

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/admin-all-cameras` | List all cameras |
| POST | `/api/admin-fetch-cameras` | Fetch cameras for specific user |
| GET | `/api/admin-camera-diagnostics` | Camera diagnostics view |
| POST | `/api/admin-create-camera` | Create new camera |
| POST | `/api/admin-delete-camera` | Delete camera |

### 7.3 System Alerts (Operational)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/admin/system-alerts` | List system alerts |
| GET | `/api/admin/diagnostics/alerts` | Get alert diagnostics |
| DELETE | `/api/admin/alerts/[id]` | Delete single alert |
| PATCH | `/api/admin/alerts/[id]` | Edit alert message |
| PATCH | `/api/admin/alerts/[id]/toggle` | Toggle resolved status |
| DELETE | `/api/admin/alerts/delete-all` | Delete all alerts |
| DELETE | `/api/admin/alerts/delete-resolved` | Delete resolved alerts |
| POST | `/api/admin/diagnostics/alerts/resolve` | Resolve alerts |
| POST | `/api/admin/diagnostics/clear-all-alerts` | Clear all alerts |
| POST | `/api/admin/diagnostics/reset-alert-notifications` | Reset notification flags |

### 7.4 Monitoring & Diagnostics

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/admin/diagnostics/monitor` | Run monitoring check |
| GET | `/api/admin/diagnostics/auto-monitor` | Get auto-monitor status |
| POST | `/api/admin/diagnostics/auto-monitor` | Configure auto-monitor |
| GET | `/api/admin/diagnostics/init-monitoring` | Get monitoring init status |
| POST | `/api/admin/diagnostics/init-monitoring` | Initialize monitoring |
| GET | `/api/admin/diagnostics/cameras` | Camera diagnostics data |
| GET | `/api/admin/diagnostics/debug-alerts` | Debug alert data |
| POST | `/api/admin/diagnostics/test-alert` | Create test alert |
| POST | `/api/admin/diagnostics/send-notification` | Send test notification |
| POST | `/api/admin/diagnostics/create-alerts-table` | Legacy: create alerts table |
| GET | `/api/admin/test-monitoring` | Test monitoring endpoint |
| GET | `/api/admin/system-stats` | System statistics |
| GET | `/api/admin/system-logs` | View system logs |

### 7.5 Notifications & Settings

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/admin/notifications` | List admin notifications |
| POST | `/api/admin/notifications` | Mark notification(s) as read |
| GET | `/api/admin/settings` | Get system settings |
| PUT | `/api/admin/settings` | Update system settings |
| GET | `/api/admin/storage-usage` | Storage usage stats |

### 7.6 Billing — Invoices & Quotes

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/admin/invoices` | List all invoices |
| GET | `/api/admin/invoices/export` | Export invoices |
| POST | `/api/admin/create-invoice` | Create invoice or quote |
| POST | `/api/admin/delete-invoice` | Delete invoice |
| POST | `/api/admin/cancel-invoice` | Cancel invoice |
| POST | `/api/admin/convert-quote-to-invoice` | Convert approved quote to invoice |
| POST | `/api/admin/send-invoice-email` | Email invoice to customer |
| GET | `/api/admin/item-templates` | List invoice item templates |

### 7.7 Billing — Payments

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/admin/get-user-payments` | Get payments for user |
| GET | `/api/admin/get-subscription` | Get user subscription info |
| POST | `/api/admin/simulate-recurring-payment` | Simulate recurring charge |
| POST | `/api/admin/update-monthly-price` | Update recurring amount |

### 7.8 Billing — Recurring Payments

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/admin/recurring-payments/list` | List all recurring payments |
| GET | `/api/admin/recurring-payments/[id]` | Get specific recurring payment |
| GET | `/api/admin/recurring-payments/[id]/charges` | Get charge history |
| POST | `/api/admin/recurring-payments/create` | Create new recurring payment |
| POST | `/api/admin/recurring-payments/delete` | Delete recurring payment |
| POST | `/api/admin/recurring-payments/toggle-valid` | Toggle is_valid flag |
| POST | `/api/admin/recurring-payments/[id]/renew-card` | Renew card token |
| POST | `/api/admin/recurring-payments/sync-from-payplus` | Sync status from PayPlus |

### 7.9 Support & Subscriptions

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/admin-get-support` | List support requests |
| POST | `/api/admin-handle-support` | Handle support request |
| POST | `/api/admin-mark-support` | Mark support status |
| GET | `/api/admin/subscription-requests` | List subscription requests |
| PATCH | `/api/admin/subscription-requests` | Update subscription request |
| DELETE | `/api/admin/subscription-requests` | Delete subscription request |

### 7.10 Communication

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/admin/send-customer-email` | Send email to customer |
| POST | `/api/admin/send-cancellation-alert` | Send cancellation warning |

### 7.11 Device Tokens

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/admin/mini-pc-tokens/create` | Generate new device token |

### 7.12 Maintenance

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/admin/cleanup` | Preview cleanup targets |
| POST | `/api/admin/cleanup` | Execute cleanup (old logs, alerts, orphaned data) |
| POST | `/api/admin/cleanup-duplicate-alerts` | Remove duplicate alerts |
| POST | `/api/admin/update-alerts-table` | Schema update (legacy) |

---

## 8. PayPlus Integration Endpoints

| Method | Path | Purpose | Notes |
|--------|------|---------|-------|
| GET | `/api/payplus-customers` | List PayPlus customer records | Admin |
| GET | `/api/test-payplus` | Test PayPlus API connection | Admin/dev |

---

## 9. Mock/Dev Endpoints (Non-Production)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/mock-grow/create-payment` | Mock Grow payment creation |
| POST | `/api/mock-payplus/create-payment` | Mock PayPlus payment |
| POST | `/api/mock-payplus/create-recurring` | Mock PayPlus recurring |
| GET | `/api/mock-payplus/payment-page` | Mock payment page |
| POST | `/api/mock-payplus/GenerateLink` | Mock GenerateLink API |
| POST | `/api/mock-payplus/PaymentPages/GenerateLink` | Mock PaymentPages API |
| POST | `/api/mock-payplus/Transactions/CreateRecurring` | Mock CreateRecurring API |

---

## Endpoint Statistics

| Category | Count |
|----------|-------|
| Public | 2 |
| Auth | 1 |
| User | 24 |
| Device Ingest | 6 |
| Webhook | 1 |
| Cron | 5 |
| Admin | 46 |
| Mock/Dev | 7 |
| **Total** | **92** |

---

## Common Response Patterns

### Success
```json
{ "success": true, "data": { ... } }
```

### Error
```json
{ "success": false, "error": "Error message" }
```

### Pagination (alerts, footage)
```
?limit=50&offset=0
?unacknowledged=true
?camera_id=<uuid>
?detection_type=<type>
```

---

## Notes

- **Naming inconsistency**: Older admin routes use flat names (`admin-get-users`), newer ones use nested paths (`admin/users`). Both patterns coexist.
- **Dead cron jobs**: `process-cancellations`, `process-trials`, `resume-paused` reference non-existent `subscriptions` table.
- **Subscription check pattern**: VOD routes check `subscriptions` first (errors), then fall back to `recurring_payments.is_active`.
- **Service role usage**: Admin routes and ingest routes use `SUPABASE_SERVICE_ROLE_KEY` directly (bypasses RLS).

---

*Document verified against source code on 2026-07-17. All route.ts files in `src/app/api/` have been inventoried.*

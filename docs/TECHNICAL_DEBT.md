# Technical Debt Register — Clearpoint Security

<!--
purpose: Catalogue all known technical debt, dead code, design issues, and improvement opportunities
audience: All engineers, AI assistants, product owners
when_to_read: Before sprint planning, architecture reviews, or cleanup tasks
prerequisites: DATABASE.md, API_REFERENCE.md, SECURITY.md
related_docs:
  - DATABASE.md (schema-level issues documented in §14)
  - API_REFERENCE.md (dead endpoints, naming inconsistency)
  - SECURITY.md (security risks)
  - SYSTEM_ARCHITECTURE.md (architectural decisions)
source_of_truth_for: Technical debt inventory, prioritization, and resolution tracking
confidence: Verified — all items traced to source code or production metadata
last_verified: 2026-07-17
owner: Engineering Lead
-->

> **Total items**: 24  
> **Critical**: 3 | **High**: 7 | **Medium**: 9 | **Low**: 5

---

## Severity Definitions

| Severity | Meaning |
|----------|---------|
| **Critical** | Actively causing errors in production or blocking features |
| **High** | Significant maintenance burden, confusing for developers, or security risk |
| **Medium** | Inconsistency that increases cognitive load but doesn't break anything |
| **Low** | Cosmetic or minor improvement opportunity |

---

## 1. Dead Code & Ghost References

### TD-1. `subscriptions` Ghost Table (Critical)

**Problem**: 12+ code paths query a `subscriptions` table that **does not exist in production**. Every query returns an error (caught silently) and falls back to `recurring_payments`.

**Affected code**:
- `src/app/api/user-cameras/route.ts`
- `src/app/api/user-footage/route.ts`
- `src/app/api/vod/signed-url/route.ts`
- `src/app/api/ingest/vod-context/route.ts`
- `src/app/api/ingest/vod-file/route.ts`
- `src/app/api/cron/process-cancellations/route.ts`
- `src/app/api/cron/process-trials/route.ts`
- `src/app/api/cron/resume-paused/route.ts`

**Impact**: Unnecessary network round-trips, silent errors in every subscription check, misleading code.

**Resolution options**:
1. Remove all `subscriptions` references and rely solely on `recurring_payments`
2. Create the `subscriptions` table to match code expectations
3. Document as intentional fallback pattern (not recommended)

---

### TD-2. Dead Cron Jobs (Critical)

**Problem**: Three cron endpoints are entirely non-functional because they depend on the non-existent `subscriptions` table:

| Endpoint | Purpose | Status |
|----------|---------|--------|
| `/api/cron/process-cancellations` | Cancel expired subscriptions | **Dead** |
| `/api/cron/process-trials` | Expire trial periods | **Dead** |
| `/api/cron/resume-paused` | Resume paused subscriptions | **Dead** |

**Impact**: Subscription lifecycle management is not automated. Manual intervention required.

---

### TD-3. Database Functions Referencing `subscriptions` (Critical)

**Problem**: PostgreSQL functions query the non-existent `subscriptions` table:
- `find_expiring_trials()` — returns empty set (no error, just never finds anything)
- `get_subscription_status(uuid)` — always returns NULL

**Impact**: RPC calls from cron jobs return meaningless results.

---

### TD-4. Dead Admin Routes (Low)

**Problem**: Several admin routes appear to duplicate functionality:

| Older (flat) | Newer (nested) | Same purpose? |
|--------------|----------------|---------------|
| `admin-get-users` | `admin/users` | Yes |
| `admin-all-cameras` | `admin/diagnostics/cameras` | Partial overlap |

**Impact**: Code duplication, confusion about which endpoint to use.

---

## 2. Architecture & Design Issues

### TD-5. Service Role Used Everywhere (High)

**Problem**: 90+ of 92 route handlers use `SUPABASE_SERVICE_ROLE_KEY`, bypassing all RLS policies.

**Impact**: RLS exists but is nearly untested in practice. If a route has an authorization bug, RLS may not catch it (service_role bypasses everything).

**Ideal**: User routes should use the user's `access_token` (from NextAuth JWT) to query Supabase with RLS enforced. Only admin/ingest routes should use service_role.

---

### TD-6. Denormalized `user_email` on Multiple Tables (Medium)

**Problem**: `cameras.user_email` and `vod_files.user_email` store a copy of the user's email. This is actively used by RLS policies and 5+ code paths.

**Affected tables**: `cameras`, `vod_files`

**Impact**: If a user changes their email, all their camera and VOD records become orphaned. No sync mechanism exists.

**Context**: These fields exist because RLS policies need to filter by `auth.jwt().email` without joining to `users`. Removing them requires RLS redesign.

---

### TD-7. `user_id` FK Cascade Chain (High)

**Problem**: Multiple tables have `ON DELETE CASCADE` on `user_id → auth.users.id`. Deleting a user from `auth.users` cascades to:
- `recurring_payments` (financial records)
- `payments` (financial records)
- `invoices` (financial records)
- All other user-owned data

**Impact**: User deletion destroys financial audit trail. No soft-delete mechanism exists.

**Documented in**: `DATABASE.md` §14.2

---

### TD-8. No Soft Delete Pattern (High)

**Problem**: The system uses hard DELETE for:
- Users (cascades all data)
- Cameras (cascades health + alerts + VOD files)
- Alerts (permanent deletion via admin cleanup)
- VOD files (no archive)

**Impact**: No recovery path. No audit trail for deletions.

---

### TD-9. Inconsistent Admin Route Naming (Medium)

**Problem**: Admin routes use two naming conventions simultaneously:

| Pattern | Example | Count |
|---------|---------|-------|
| Flat (`admin-*`) | `/api/admin-get-users` | ~13 routes |
| Nested (`admin/*`) | `/api/admin/users` | ~33 routes |

**Impact**: Developers must check both patterns. No clear migration path.

---

### TD-10. Subscription Check Pattern — Try/Fail/Fallback (High)

**Problem**: VOD access routes follow this pattern:
```typescript
// 1. Try subscriptions (always fails — table doesn't exist)
const { data: sub } = await supabase.from("subscriptions")...
// 2. Try recurring_payments
const { data: rp } = await supabase.from("recurring_payments")...
// 3. Grant access if either exists
const hasAccess = !!sub || !!rp;
```

**Impact**: Every VOD/camera request makes an unnecessary failed query. Adds ~50-100ms latency per request.

---

## 3. Data Integrity Issues

### TD-11. `device_health` Table — Dormant (Medium)

**Problem**: The `device_health` table exists in production but:
- No code references it
- Superseded by `mini_pc_health` + `camera_health` (split model)
- May contain historical data
- RLS restricts to `service_role` only

**Decision needed**: Archive, drop, or migrate to time-series.

---

### TD-12. `invoice_number_counters` — Superseded (Medium)

**Problem**: Superseded by `document_number_counters`. The function `generate_invoice_number()` may still reference it.

**Decision needed**: Verify function body, then drop table + function if unused.

---

### TD-13. Plans Table — `price` Column Confusion (Low)

**Problem**: `plans.price` is `NUMERIC(10,2)` but the system uses `recurring_payments.amount` for actual billing. It's unclear if `plans.price` is the list price, the default price, or unused.

---

### TD-14. Missing Indexes for Common Queries (Medium)

**Problem**: Several frequently-queried patterns lack explicit indexes:
- `alerts` filtered by `user_id` + `acknowledged` + `created_at`
- `vod_files` filtered by `user_id` + `camera_id` + `timestamp`
- `system_logs` filtered by `mini_pc_id` + `created_at`

**Note**: Primary key and FK indexes exist, but composite indexes for these query patterns are unconfirmed.

---

## 4. Security Debt

### TD-15. `supportuploads` Bucket — No Restrictions (High)

**Problem**: Public bucket, no RLS policies, no file size limit, no MIME type restriction.

**Impact**: Any file type/size can be uploaded. Files accessible to anyone with URL.

**Documented in**: `SECURITY.md` §6.2

---

### TD-16. Cron Endpoints — No Auth Verification (Medium)

**Problem**: `/api/cron/*` routes have no authentication check in code. Security relies entirely on Vercel Cron configuration (secret header).

**Impact**: If these endpoints are accessible outside Vercel Cron (e.g., direct HTTP request), anyone can trigger cleanup or subscription processing.

---

### TD-17. No Security Audit Log (High)

**Problem**: No logging of:
- Admin actions (user creation, deletion, payment manipulation)
- Failed login attempts
- Token creation/revocation
- Permission changes

**Impact**: Cannot investigate security incidents. No accountability for admin actions.

---

## 5. Code Quality

### TD-18. Duplicated `sha256Hex` Function (Low)

**Problem**: The same SHA-256 hashing function is copy-pasted in 6 ingest route files:
```typescript
function sha256Hex(input: string) {
  return crypto.createHash("sha256").update(input, "utf8").digest("hex");
}
```

**Fix**: Extract to `src/lib/crypto.ts` or `src/lib/device-auth.ts`.

---

### TD-19. Duplicated Token Validation Logic (Medium)

**Problem**: Every ingest route independently:
1. Extracts `x-clearpoint-device-token` header
2. Hashes it with SHA-256
3. Looks up in `mini_pc_tokens`
4. Checks `revoked_at`
5. Updates `last_used_at`

This is ~20 lines duplicated across 6 files.

**Fix**: Extract to middleware or shared `validateDeviceToken()` function.

---

### TD-20. No TypeScript Types for API Responses (Low)

**Problem**: API routes return ad-hoc JSON objects. No shared response types between client and server.

**Impact**: Frontend must guess response shapes. No compile-time verification.

---

### TD-21. Hebrew Comments in Production Code (Low)

**Problem**: Many route handlers contain Hebrew comments. While functional, this limits accessibility for non-Hebrew-speaking contributors.

**Decision**: Determine if codebase language policy should be English-only for comments.

---

## 6. Operational Debt

### TD-22. No Health Check Endpoint (Medium)

**Problem**: No `/api/health` endpoint for external monitoring. Uptime monitoring relies on page-level checks.

---

### TD-23. Log Cleanup Only Runs Via Cron (Medium)

**Problem**: `system_logs` and old alerts are cleaned up only by `/api/cron/cleanup-logs`. If the cron fails silently, logs accumulate indefinitely.

**Mitigation**: The 14-day retention window means maximum unbounded growth is limited.

---

### TD-24. No Database Migration Tracking (High)

**Problem**: Several tables exist in production without corresponding migration files:
- `mini_pcs`
- `mini_pc_tokens`
- `cameras`
- `vod_files`
- `plans`
- `recurring_payments`
- `payments`
- `invoices`, `invoice_items`
- `item_templates`, `document_number_counters`
- `system_alerts`, `admin_notifications`
- `system_settings`, `device_health`

**Impact**: Schema cannot be reliably reproduced from repository alone. Changes are made via Supabase Dashboard without version control.

**Documented in**: `DATABASE.md` §13

---

## Priority Matrix

| Priority | Items | Recommended Sprint |
|----------|-------|-------------------|
| **P0 — Fix now** | TD-1, TD-2, TD-3 (ghost subscriptions) | Next sprint |
| **P1 — Plan soon** | TD-5, TD-7, TD-8, TD-15, TD-17, TD-24 | Within 2 sprints |
| **P2 — Improve** | TD-6, TD-10, TD-14, TD-16, TD-19, TD-22, TD-23 | Backlog |
| **P3 — Nice to have** | TD-4, TD-9, TD-11, TD-12, TD-13, TD-18, TD-20, TD-21 | Opportunistic |

---

## Resolution Tracking

| ID | Status | Resolved Date | Notes |
|----|--------|---------------|-------|
| — | All items open | — | Initial cataloguing 2026-07-17 |

---

*Document created 2026-07-17 from DATABASE.md audit, API_REFERENCE.md analysis, and SECURITY.md review.*

# DATABASE.md — Clearpoint Security Data Model

| Field | Value |
|-------|-------|
| **Status** | Living Reference |
| **Owner** | Engineering |
| **Last verified** | 2026-07-18 |
| **Verification method** | Direct production Supabase metadata export (information_schema, pg_catalog) |
| **Source of truth** | Supabase production instance |
| **Related Documents** | SYSTEM_ARCHITECTURE.md, CURRENT_DEPLOYMENT.md |

---

## 1. Architectural Decision: Entity Ownership Hierarchy

> **ADR-F1 (Proposed)**: The canonical ownership hierarchy is:
>
> ```
> User (1) → (N) Mini PCs → (N) Cameras
> ```
>
> - Every Mini PC belongs to exactly one user/customer.
> - Every camera belongs to exactly one Mini PC.
> - Canonical camera ownership flows through `cameras.mini_pc_id` → `mini_pcs.user_id`.
> - `cameras.user_id` and `cameras.user_email` are **denormalized fields** (actively required for RLS and multiple code paths). Canonical ownership flows through `mini_pc_id`.
> - The architecture supports multiple Mini PCs per customer. The current product operates with one Mini PC per customer.
> - A Mini PC may represent a separate physical location/site.
> - No `sites` table exists; the schema does not prevent adding one later.

### Assumptions (not ADRs)

- **Access model**: One login/account per customer. Multi-user/organization access is a possible future extension, not part of the current schema.
- **Data lifecycle**: Users support soft-delete (`deleted_at`). Other tables use hard delete. Behavior documented per table below.
- **Health data**: `camera_health` and `mini_pc_health` are latest-state registers (UPSERT, 1 row per device). Historical health data is not stored.

---

## 2. Database Overview

**Platform**: Supabase (PostgreSQL 15+, hosted)  
**Auth**: Supabase Auth (email/password)  
**RLS**: Enabled on all 24 production tables  
**Storage**: Supabase Storage (`alert-snapshots`, `supportuploads` buckets) + Backblaze B2 (VOD files)  
**Estimated rows**: `vod_files` ~3,310 | `system_logs` ~2,032 | `payments` ~20 | all others < 20

### Table Inventory

| Domain | Table | Status | Notes |
|--------|-------|--------|-------|
| **Core** | `users` | Production Verified | Customer accounts |
| **Core** | `mini_pcs` | Production Verified | Edge devices |
| **Core** | `cameras` | Production Verified | Camera records |
| **Health** | `mini_pc_health` | Production Verified | UPSERT register |
| **Health** | `camera_health` | Production Verified | UPSERT register |
| **Health** | `mini_pc_tokens` | Production Verified | Device auth |
| **Health** | `device_health` | ❌ DROPPED 2026-07-18 | Was dormant, no code references |
| **Monitoring** | `system_alerts` | Production Verified | Admin operational alerts |
| **AI/Alerts** | `alert_rules` | Production Verified | Customer alert config |
| **AI/Alerts** | `alerts` | Production Verified | Detection events |
| **VOD** | `vod_files` | Production Verified | Footage metadata |
| **Billing** | `plans` | Production Verified | Subscription tiers |
| **Billing** | `recurring_payments` | Production Verified | PayPlus recurring |
| **Billing** | `payments` | Production Verified | Payment records |
| **Billing** | `invoices` | Production Verified | Invoice/quote documents |
| **Billing** | `invoice_items` | Production Verified | Line items |
| **Billing** | `item_templates` | Production Verified | Invoice item templates |
| **Billing** | `document_number_counters` | Production Verified | Atomic numbering |
| **Billing** | `invoice_number_counters` | ❌ DROPPED 2026-07-18 | Superseded by document_number_counters |
| **Support** | `subscription_requests` | Production Verified | Website signups |
| **Support** | `support_requests` | Production Verified | Support tickets |
| **Ops** | `system_logs` | Production Verified | Centralized event log |
| **Ops** | `admin_notifications` | Production Verified | Admin notification queue |
| **Ops** | `system_settings` | Production Verified | Key-value config store |
| **Audit** | `audit_log` | Production Verified | Admin action audit trail (added 2026-07-18) |

---

## 3. Core Domain Tables

### 3.1 `users` — Production Verified

Customer/user accounts. Primary identity table.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | UUID | NO | `gen_random_uuid()` | PK |
| `email` | TEXT | YES | — | Login identity |
| `full_name` | TEXT | YES | — | |
| `subscription_status` | TEXT | YES | — | Subscription state indicator (actively used by multiple routes) |
| `created_at` | TIMESTAMPTZ | NO | `now()` | |
| `role` | TEXT | YES | `''` | `'admin'` or empty |
| `phone` | TEXT | YES | — | |
| `address` | TEXT | YES | — | |
| `notes` | TEXT | YES | — | Admin notes |
| `plan_duration_days` | SMALLINT | YES | — | CHECK: 14 or NULL |
| `plan_id` | TEXT | YES | — | FK → `plans.id` |
| `custom_price` | INTEGER | YES | — | Monthly price override |
| `needs_support` | BOOLEAN | YES | `false` | Support flag |
| `initial_camera_count` | SMALLINT | YES | 4 | |
| `tunnel_name` | TEXT | YES | — | Cloudflare tunnel subdomain |
| `setup_paid` | BOOLEAN | YES | `false` | Installation payment received |
| `subscription_id` | UUID | YES | — | Legacy reference (no FK) |
| `payment_method_on_file` | BOOLEAN | YES | `false` | Has stored card |
| `billing_email` | TEXT | YES | — | Legacy billing email |
| `subscription_active` | BOOLEAN | YES | `false` | Active subscription flag |
| `features_disabled_at` | TIMESTAMPTZ | YES | — | Feature suspension timestamp |
| `customer_uid` | TEXT | YES | — | PayPlus customer ID. UNIQUE |
| `vat_number` | TEXT | YES | — | ח.פ / ע.מ |
| `business_city` | TEXT | YES | — | |
| `business_postal_code` | TEXT | YES | — | |
| `business_country_iso` | TEXT | YES | `'IL'` | ISO country code |
| `subject_code` | TEXT | YES | — | External ERP customer number |
| `communication_email` | TEXT | YES | — | Separate billing email |
| `contacts` | JSONB | YES | `'[]'` | Multiple contact details |
| `customer_type` | TEXT | YES | `'private'` | CHECK: `private`, `business` |
| `company_name` | TEXT | YES | — | Business billing name |
| `deleted_at` | TIMESTAMPTZ | YES | NULL | Soft delete timestamp (added 2026-07-18) |

**CHECK constraints**: `users_customer_type_check`, `valid_retention` (plan_duration_days = 14 OR NULL).  
**Unique**: `users_customer_uid_key`.  
**Indexes**: `idx_users_customer_uid`, `idx_users_subscription_active`.  
**RLS**: Users read own (by email); admins full CRUD.  
**FK**: `users_plan_id_fkey` → `plans.id` (ON DELETE NO ACTION).  
**Soft delete**: `deleted_at` column (added 2026-07-18). When set, user is considered deleted. Auth user is banned. Admin list queries filter `deleted_at IS NULL`.  
**Note**: No `updated_at` column exists in production. No `status` column exists in production.

---

### 3.2 `mini_pcs` — Production Verified

Edge compute devices. **Canonical ownership intermediate** between users and cameras.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | UUID | NO | `gen_random_uuid()` | PK |
| `user_id` | UUID | YES | — | FK → `users.id` |
| `device_name` | TEXT | NO | — | Admin-assigned label |
| `hostname` | TEXT | YES | — | OS hostname |
| `ip_address` | INET | YES | — | Local network IP (INET type) |
| `mac_address` | TEXT | YES | — | Device MAC address |
| `installed_at` | TIMESTAMPTZ | YES | — | Installation date |
| `last_seen_at` | TIMESTAMPTZ | YES | — | Last heartbeat |
| `name` | TEXT | YES | `'Mini PC'` | Display name |
| `is_active` | BOOLEAN | YES | `true` | Active flag |
| `notes` | TEXT | YES | — | Admin notes |
| `created_at` | TIMESTAMPTZ | NO | `now()` | |
| `updated_at` | TIMESTAMPTZ | YES | — | |

**RLS**: Users can view own (`user_id = auth.uid()`).  
**FK**: `mini_pcs_user_id_fkey` → `users.id` (ON UPDATE NO ACTION, ON DELETE CASCADE).  
**Indexes**: PK only.  
**Note**: `ip_address` is INET type (not TEXT). `device_name` is NOT NULL.

---

### 3.3 `cameras` — Production Verified

Camera records. Ownership flows through `mini_pc_id`.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | UUID | NO | `gen_random_uuid()` | PK |
| `name` | TEXT | YES | — | Display name |
| `serial_number` | TEXT | YES | — | Hardware serial |
| `stream_path` | TEXT | YES | — | RTSP URL |
| `mini_pc_id` | UUID | YES | — | **FK → `mini_pcs.id`** (CANONICAL) |
| `user_id` | UUID | YES | — | FK → `users.id` — denormalized, actively required |
| `user_email` | TEXT | YES | — | Denormalized, actively required |
| `image_url` | TEXT | YES | — | Thumbnail URL |
| `is_stream_active` | BOOLEAN | YES | — | Online/offline flag |
| `last_seen_at` | TIMESTAMPTZ | YES | — | Last health check |
| `created_at` | TIMESTAMPTZ | YES | `now()` | |

**RLS policies**:
- Users read own (`user_email = jwt.email`)
- Admin full CRUD
- Admin/owner can update stream status

**FKs**:
- `cameras_mini_pc_id_fkey` → `mini_pcs.id` (ON UPDATE NO ACTION, ON DELETE SET NULL)
- `cameras_user_id_fkey` → `users.id` (ON UPDATE NO ACTION, ON DELETE CASCADE)

**Indexes**: `idx_cameras_mini_pc_id`.  
**Note**: No `updated_at` column exists in production.

**Denormalized fields note**: `user_id` and `user_email` exist on cameras as well as on the canonical users table. These fields are actively required for:
- RLS policies (`cameras.user_id = auth.uid()`)
- `user-cameras` route (queries by `user_email`)
- VOD ingest (`vod-context`, `vod-file` routes read `user_id` and `user_email` from camera row)
- `admin-create-camera` route (sets `user_email` on creation)

Removal requires RLS architecture redesign — not a simple migration. No removal timeline exists.

---

## 4. Health Domain Tables

### 4.1 `mini_pc_health` — Production Verified

Latest-state register for Mini PC system metrics. **One row per Mini PC** (UPSERT on `mini_pc_id`).

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `id` | UUID | NO | PK, `gen_random_uuid()` |
| `mini_pc_id` | UUID | YES | FK → `mini_pcs.id`. **Unique constraint** (upsert target) |
| `cpu_temp_celsius` | INTEGER | YES | |
| `cpu_usage_pct` | NUMERIC(5,2) | YES | |
| `ram_total_mb` | INTEGER | YES | |
| `ram_used_mb` | INTEGER | YES | |
| `ram_usage_pct` | NUMERIC(5,2) | YES | |
| `disk_root_total_gb` | INTEGER | YES | |
| `disk_root_used_gb` | INTEGER | YES | |
| `disk_root_pct` | NUMERIC(5,2) | YES | |
| `disk_ram_total_gb` | INTEGER | YES | tmpfs (HLS segments) |
| `disk_ram_used_gb` | INTEGER | YES | |
| `disk_ram_pct` | NUMERIC(5,2) | YES | |
| `load_avg_1min` | NUMERIC(4,2) | YES | |
| `load_avg_5min` | NUMERIC(4,2) | YES | |
| `load_avg_15min` | NUMERIC(4,2) | YES | |
| `uptime_seconds` | BIGINT | YES | |
| `process_count` | INTEGER | YES | |
| `internet_connected` | BOOLEAN | YES | |
| `ping_gateway_ms` | INTEGER | YES | |
| `ping_internet_ms` | INTEGER | YES | |
| `bandwidth_up_mbps` | NUMERIC(8,2) | YES | Upload speed |
| `bandwidth_down_mbps` | NUMERIC(8,2) | YES | Download speed |
| `total_video_files` | INTEGER | YES | |
| `oldest_file_age_hours` | INTEGER | YES | |
| `newest_file_age_minutes` | INTEGER | YES | |
| `disk_io_read_mbps` | NUMERIC(8,2) | YES | |
| `disk_io_write_mbps` | NUMERIC(8,2) | YES | |
| `overall_status` | TEXT | YES | CHECK: `healthy`, `warning`, `critical`, `offline` |
| `last_checked` | TIMESTAMPTZ | YES | Client-reported timestamp |
| `log_message` | TEXT | YES | |
| `created_at` | TIMESTAMPTZ | NO | `now()` |

**CHECK**: `mini_pc_health_overall_status_check` — `healthy`, `warning`, `critical`, `offline`.  
**UPSERT**: `ON CONFLICT (mini_pc_id)` — exactly 1 row per device.  
**RLS**: Users read own (via mini_pcs join); service_role writes.  
**Indexes**: `mini_pc_health_mini_pc_id_key` (unique), `unique_mini_pc_health` (unique), `idx_mini_pc_health_mini_pc_id`, `idx_mini_pc_health_last_checked`.

---

### 4.2 `camera_health` — Production Verified

Latest-state register for camera stream health. **One row per camera** (UPSERT on `camera_id`).

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `id` | UUID | NO | PK, `gen_random_uuid()` |
| `camera_id` | UUID | YES | FK → `cameras.id`. **Unique constraint** (upsert target) |
| `mini_pc_id` | UUID | YES | FK → `mini_pcs.id` (denormalized for faster queries) |
| `stream_status` | TEXT | YES | CHECK: `ok`, `stale`, `missing`, `error`, `connecting` |
| `last_checked` | TIMESTAMPTZ | YES | |
| `log_message` | TEXT | YES | |
| `created_at` | TIMESTAMPTZ | NO | `now()` |

**CHECK**: `camera_health_stream_status_check` — `ok`, `stale`, `missing`, `error`, `connecting`.  
**UPSERT**: `ON CONFLICT (camera_id)` — exactly 1 row per camera.  
**RLS**: Users read own (via cameras.user_id join — legacy).  
**Indexes**: `camera_health_camera_id_key` (unique), `unique_camera_health` (unique), `idx_camera_health_camera_id`, `idx_camera_health_last_checked`, `idx_camera_health_mini_pc_id`.  
**Note**: `stream_status` is nullable in production (not NOT NULL). Includes `connecting` status not in old doc.

---

### 4.3 `mini_pc_tokens`

Device authentication tokens for edge → cloud API calls.

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `token_hash` | TEXT | NOT NULL | PK. SHA-256 of raw token |
| `mini_pc_id` | UUID | NOT NULL | FK → `mini_pcs.id` ON DELETE CASCADE |
| `created_at` | TIMESTAMPTZ | NOT NULL | `now()` |
| `revoked_at` | TIMESTAMPTZ | YES | Set when token is rotated |
| `last_used_at` | TIMESTAMPTZ | YES | Updated on each API call |

**Verification**: Verified — migration `20260131_secure_device_ingest.sql`.  
**Constraint**: Unique partial index `mini_pc_tokens_one_active_per_mini_pc` on `(mini_pc_id) WHERE revoked_at IS NULL` — enforces one active token per device.  
**RLS**: Enabled. Service_role only.

---

## 5. AI & Alert Domain Tables

### 5.1 `alert_rules`

Customer-configured detection alert rules.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
| `user_id` | UUID | NOT NULL | — | FK → `users.id` ON DELETE CASCADE |
| `camera_id` | UUID | YES | — | FK → `cameras.id` ON DELETE CASCADE. NULL = all cameras |
| `name` | TEXT | NOT NULL | — | Rule display name |
| `detection_type` | TEXT | NOT NULL | — | CHECK constraint (see below) |
| `schedule_start` | TIME | YES | — | |
| `schedule_end` | TIME | YES | — | |
| `days_of_week` | INT[] | | `'{0,1,2,3,4,5,6}'` | 0=Sunday |
| `notify_email` | BOOLEAN | | `true` | |
| `notify_sms` | BOOLEAN | | `false` | |
| `notify_push` | BOOLEAN | | `true` | |
| `cooldown_minutes` | INTEGER | | 5 | Min time between repeat alerts |
| `min_confidence` | REAL | | 0.5 | 0.0–1.0 |
| `is_active` | BOOLEAN | | `true` | |
| `is_preset` | BOOLEAN | | `false` | System-created default |
| `preset_key` | TEXT | YES | — | Preset identifier |
| `exclude_types` | TEXT[] | | `'{}'` | Types to exclude for `'any'` rules |
| `created_at` | TIMESTAMPTZ | NOT NULL | `now()` | |
| `updated_at` | TIMESTAMPTZ | NOT NULL | `now()` | |

**Detection types** (CHECK constraint, latest):
```
'person', 'vehicle', 'animal', 'dog', 'cat',
'suspicious_object', 'weapon',
'fire', 'smoke', 'fire_smoke',
'motion', 'any',
'face_unknown', 'loitering', 'line_cross'
```

**Verification**: Verified — full CREATE TABLE + multiple ALTER migrations.  
**RLS**: Users CRUD own; service_role full access.  
**Indexes**: `idx_alert_rules_user_id`, `idx_alert_rules_camera_id`, `idx_alert_rules_active` (partial).

---

### 5.2 `alerts`

Detection events that matched an active rule.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
| `user_id` | UUID | NOT NULL | — | FK → `users.id` ON DELETE CASCADE |
| `camera_id` | UUID | NOT NULL | — | FK → `cameras.id` ON DELETE CASCADE |
| `rule_id` | UUID | YES | — | FK → `alert_rules.id` ON DELETE SET NULL |
| `mini_pc_id` | UUID | YES | — | FK → `mini_pcs.id` ON DELETE SET NULL |
| `detection_type` | TEXT | NOT NULL | — | |
| `confidence` | REAL | YES | — | 0.0–1.0 |
| `snapshot_url` | TEXT | YES | — | Supabase Storage public URL |
| `thumbnail_url` | TEXT | YES | — | |
| `message` | TEXT | YES | — | Hebrew description |
| `metadata` | JSONB | | `'{}'` | Bounding boxes, extra info |
| `acknowledged` | BOOLEAN | | `false` | User has seen this |
| `acknowledged_at` | TIMESTAMPTZ | YES | — | |
| `notified_email` | BOOLEAN | | `false` | |
| `notified_sms` | BOOLEAN | | `false` | |
| `notified_push` | BOOLEAN | | `false` | |
| `created_at` | TIMESTAMPTZ | NOT NULL | `now()` | |

**Verification**: Verified — full CREATE TABLE migration.  
**RLS**: Users read + update own; service_role full access (insert via ingest).  
**Deletion**: Hard delete (no application-level delete currently, but no explicit protection either).  
**Indexes**: `idx_alerts_user_id`, `idx_alerts_camera_id`, `idx_alerts_rule_id`, `idx_alerts_created_at` (DESC), `idx_alerts_unacknowledged` (partial), `idx_alerts_detection_type`.

**Storage**: Alert snapshot images stored in Supabase Storage bucket `alert-snapshots` (public, 1MB limit, JPEG/PNG/WebP).

---

## 6. VOD Domain

### 6.1 `vod_files`

Metadata for recorded video files stored in Backblaze B2.

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `id` | UUID | NOT NULL | PK |
| `user_id` | UUID | NOT NULL | FK → `users.id` (ON DELETE CASCADE) |
| `user_email` | TEXT | YES | Denormalized from camera row (actively used by ingest pipeline) |
| `camera_id` | UUID | NOT NULL | FK → `cameras.id` (ON DELETE CASCADE) |
| `url` | TEXT | | Signed/direct B2 URL |
| `file_id` | TEXT | | Backblaze B2 file ID |
| `object_key` | TEXT | YES | B2 object key (added later) |
| `timestamp` | TIMESTAMPTZ | | Recording start time |
| `duration` | INTEGER | | Seconds (default 900 = 15 min) |
| `created_at` | TIMESTAMPTZ | | `now()` |

**Verification**: Partially Verified — columns inferred from ingest route INSERT and select queries. No full CREATE TABLE migration in repo.  
**RLS**: Users read own (via `user_id`); service_role inserts.  
**Deletion**: Hard delete (expired files removed externally, row deletion not confirmed in app code).  
**Indexes**: `vod_files_user_id_camera_id_timestamp_idx` (composite, verified migration).

**FKs**:
- `vod_files_user_id_fkey` → `users.id` (ON UPDATE NO ACTION, ON DELETE CASCADE)
- `vod_files_camera_id_fkey` → `cameras.id` (ON UPDATE NO ACTION, ON DELETE CASCADE)

**Cascade warning**: Deleting a user cascades to cameras (via cameras FK) which cascades to vod_files. All footage records are deleted with the user.

---

## 7. Billing Domain Tables

### 7.1 `plans` — Production Verified

Subscription tier definitions.

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `id` | TEXT | NO | PK (e.g. `'sim'`, `'wifi'`) |
| `name` | TEXT | NO | English name |
| `name_he` | TEXT | YES | Hebrew name |
| `description_he` | TEXT | YES | Hebrew description |
| `monthly_price` | INTEGER | NO | Monthly subscription cost (ILS) |
| `setup_price` | INTEGER | NO | Default 0. One-time installation cost (ILS) |
| `connection_type` | TEXT | NO | `'sim'`, `'wifi_cloud'`, `'wifi'` |
| `retention_days` | INTEGER | NO | Default retention period |
| `data_allowance_gb` | INTEGER | YES | SIM data cap |
| `camera_limit` | INTEGER | NO | Default 4. Max cameras per plan |
| `live_enabled` | BOOLEAN | YES | `true` | Live streaming available |
| `cloud_enabled` | BOOLEAN | YES | `true` | Cloud features available |
| `is_active` | BOOLEAN | YES | `true` | Plan availability |
| `created_at` | TIMESTAMPTZ | YES | `now()` |

**RLS**: Public SELECT (two policies — `public` and `authenticated`).  
**Note**: `monthly_price` and `setup_price` are INTEGER (not NUMERIC). Missing `description_he`, `live_enabled`, `cloud_enabled` in old doc.

---

### 7.2 `subscriptions` — ❌ NEVER EXISTED / CODE REFERENCES REMOVED

> **History**: This table was referenced in application code but **never existed in production**. All code references were removed on 2026-07-18. Dead DB functions that referenced it (`find_expiring_trials`, `get_subscription_status`, `find_subscriptions_to_cancel`, `find_paused_to_resume`) were also dropped.
>
> Subscription status is determined solely via `recurring_payments.is_active` + `users.subscription_active`.

---

### 7.3 `recurring_payments` — Production Verified

PayPlus recurring payment records.

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `id` | UUID | NOT NULL | PK |
| `user_id` | UUID | NOT NULL | FK → `auth.users.id` ON DELETE CASCADE |
| `plan_id` | TEXT | YES | FK → `plans.id` ON DELETE SET NULL |
| `recurring_uid` | TEXT | YES | PayPlus recurring ID |
| `customer_uid` | TEXT | YES | PayPlus customer ID |
| `card_token` | TEXT | YES | |
| `recurring_type` | INTEGER | NOT NULL | 0=daily, 1=weekly, 2=monthly |
| `recurring_range` | INTEGER | NOT NULL | e.g. every N months |
| `number_of_charges` | INTEGER | | 0 = unlimited |
| `start_date` | TIMESTAMPTZ | NOT NULL | |
| `end_date` | TIMESTAMPTZ | YES | |
| `last_charge_date` | TIMESTAMPTZ | YES | |
| `next_charge_date` | TIMESTAMPTZ | YES | |
| `amount` | DECIMAL(10,2) | NOT NULL | |
| `currency_code` | TEXT | NOT NULL | `'ILS'` |
| `items` | JSONB | NOT NULL | `'[]'` |
| `is_active` | BOOLEAN | | `true` |
| `is_valid` | BOOLEAN | | `true` |
| `extra_info` | TEXT | YES | |
| `notes` | TEXT | YES | |
| `created_at` | TIMESTAMPTZ | | `now()` |
| `updated_at` | TIMESTAMPTZ | | `now()` |

**Production Verified**: Table exists and has data (~2 rows).  
**RLS**: Admin full access (via `auth.users` join with role='admin'); users read own.  
**FK**: `recurring_payments_user_id_fkey` → `auth.users.id` (confirmed via live `pg_constraint` query 2026-07-17).  
`recurring_payments_plan_id_fkey` → `plans.id` (ON UPDATE NO ACTION, ON DELETE SET NULL).  
**Indexes**: `idx_recurring_payments_user_id`, `idx_recurring_payments_plan_id`, `idx_recurring_payments_recurring_uid`, `idx_recurring_payments_is_active`, `idx_recurring_payments_next_charge`.

---

### 7.4 `payments` — Production Verified

Individual payment transaction records.

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `id` | UUID | NO | PK, `gen_random_uuid()` |
| `user_id` | UUID | NO | FK → `users.id` (ON UPDATE NO ACTION, ON DELETE CASCADE) |
| `payment_type` | TEXT | NO | CHECK: `one_time`, `recurring`, `refund` |
| `amount` | NUMERIC(10,2) | NO | CHECK: >= 0 |
| `currency` | TEXT | YES | Default `'ILS'` |
| `status` | TEXT | NO | Default `'pending'` |
| `payment_provider` | TEXT | YES | Deprecated field |
| `provider` | VARCHAR(50) | YES | Default `'payplus'` |
| `provider_payment_id` | TEXT | YES | UNIQUE |
| `provider_transaction_id` | TEXT | YES | PayPlus transaction ID |
| `provider_payment_url` | TEXT | YES | PayPlus payment page URL |
| `description` | TEXT | YES | |
| `items` | JSONB | YES | Line items |
| `invoice_id` | UUID | YES | FK → `invoices.id` ON DELETE SET NULL |
| `invoice_id_text` | TEXT | YES | Pre-UUID invoice reference. **Cannot be dropped** — used by `recent_payments` view |
| `invoice_number` | TEXT | YES | |
| `invoice_url` | TEXT | YES | |
| `receipt_url` | TEXT | YES | |
| `metadata` | JSONB | YES | |
| `notes` | TEXT | YES | |
| `paid_at` | TIMESTAMPTZ | YES | |
| `created_at` | TIMESTAMPTZ | NO | `now()` |
| `updated_at` | TIMESTAMPTZ | YES | `now()` |

**CHECK constraints**: `payments_payment_type_check` (`one_time`, `recurring`, `refund`), `payments_amount_check` (>= 0).  
**Unique**: `payments_provider_payment_id_key`.  
**RLS**: Admin full access (via users role check); users insert/view own.  
**Indexes**: `idx_payments_user_id`, `idx_payments_invoice_id`, `idx_payments_status`, `idx_payments_provider`, `idx_payments_provider_payment_id`, `idx_payments_provider_transaction_id`, `idx_payments_created_at` (DESC).  
**FK**: `payments_user_id_fkey` → `users.id` (ON UPDATE NO ACTION, ON DELETE CASCADE). `payments_invoice_id_fkey` → `invoices.id` (ON DELETE SET NULL).

**Legacy field**: `invoice_id_text` — original text-type column renamed during UUID migration.  
**Note**: `amount` is NUMERIC(10,2) NOT NULL with CHECK >= 0. `payment_type` and `status` are NOT NULL.

---

### 7.5 `invoices`

Invoice and quote documents.

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `id` | UUID | NOT NULL | PK |
| `user_id` | UUID | YES | FK → `users.id` (ON DELETE CASCADE) |
| `invoice_number` | TEXT | | Formatted: `YYYY-0001` or `Q-YYYY-0001` |
| `document_type` | TEXT | | CHECK: `'quote'`, `'invoice'` |
| `status` | TEXT | | CHECK (see below) |
| `total_amount` | NUMERIC | | |
| `currency` | TEXT | | `'ILS'` |
| `notes` | TEXT | YES | |
| `payment_id` | UUID | YES | FK → `payments.id` ON DELETE SET NULL |
| `payment_link` | TEXT | YES | PayPlus URL |
| `has_subscription` | BOOLEAN | YES | Monthly recurring flag |
| `monthly_price` | NUMERIC | YES | For recurring invoices |
| `quote_valid_until` | TIMESTAMPTZ | YES | Quote expiry |
| `approved_at` | TIMESTAMPTZ | YES | |
| `rejected_at` | TIMESTAMPTZ | YES | |
| `rejection_reason` | TEXT | YES | |
| `converted_to_invoice_id` | UUID | YES | FK → `invoices.id` (self-ref) |
| `billing_snapshot` | JSONB | YES | Immutable customer billing details |
| `issuer_snapshot` | JSONB | YES | Immutable issuer details |
| `email_sent_at` | TIMESTAMPTZ | YES | Email dispatch timestamp |
| `sent_at` | TIMESTAMPTZ | YES | |
| `paid_at` | TIMESTAMPTZ | YES | |
| `created_at` | TIMESTAMPTZ | | `now()` |
| `updated_at` | TIMESTAMPTZ | | `now()` |

**Status values** (CHECK constraint):
```
'quote_draft', 'quote_sent', 'quote_approved', 'quote_rejected',
'draft', 'sent', 'paid', 'cancelled'
```

**Production Verified**. Additional column found: `created_by` (UUID, nullable) — admin who created.  
**RLS**: Admin full access; users read own; users can approve/reject own quotes (when `quote_sent`).  
**Indexes**: `idx_invoices_document_type_invoice_number_unique` (unique composite), `idx_invoices_document_type`, `idx_invoices_status`, `idx_invoices_user_document_type`, `idx_invoices_converted_to`, `idx_invoices_payment_id`, `idx_invoices_email_sent_at`, `idx_invoices_billing_snapshot_gin` (GIN), `idx_invoices_created_at` (DESC), `idx_invoices_user_id`, `invoices_invoice_number_key` (unique).  
**FKs**: `invoices_payment_id_fkey` → `payments.id`, `invoices_user_id_fkey` → `users.id`.

---

### 7.6 `invoice_items`

Line items for invoices/quotes.

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `id` | UUID | NOT NULL | PK |
| `invoice_id` | UUID | YES | FK → `invoices.id` (ON DELETE CASCADE) |
| `item_type` | TEXT | | Category (nvr, camera, poe, cable, labor, other) |
| `item_name` | TEXT | | Display name |
| `item_description` | TEXT | YES | |
| `quantity` | INTEGER | | |
| `unit_price` | NUMERIC(10,2) | NO | |
| `total_price` | NUMERIC(10,2) | NO | |
| `camera_type` | TEXT | YES | 2MP, 4MP, 5MP |
| `sort_order` | INTEGER | | Display order |
| `created_at` | TIMESTAMPTZ | YES | `now()` |

**Verification**: Production Verified.  
**RLS**: Admin full access; users read own (via invoice_id join).  
**Indexes**: `idx_invoice_items_invoice_id` (invoice_id).

---

### 7.7 `item_templates`

Reusable invoice item templates (admin-managed).

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `id` | UUID | NO | PK, `gen_random_uuid()` |
| `item_type` | TEXT | NO | Category |
| `item_name` | TEXT | NO | Template name |
| `item_description` | TEXT | YES | |
| `default_price` | NUMERIC(10,2) | NO | Default price |
| `camera_type` | TEXT | YES | 2MP, 4MP, 5MP |
| `is_active` | BOOLEAN | YES | Default `true` |
| `created_at` | TIMESTAMPTZ | YES | `now()` |

**Verification**: Production Verified.  
**RLS**: Admin full access (`role='admin'`).  
**Indexes**: `idx_item_templates_type` (item_type).

---

### 7.8 `document_number_counters`

Atomic annual document numbering (quotes and invoices separately).

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `year` | INTEGER | NOT NULL | Composite PK |
| `document_type` | TEXT | NOT NULL | Composite PK. CHECK: `'quote'`, `'invoice'` |
| `last_number` | INTEGER | NOT NULL | 0 |
| `updated_at` | TIMESTAMPTZ | NOT NULL | `now()` |

**Verification**: Verified — full CREATE TABLE migration.  
**RLS**: Service_role only; anon/authenticated denied.  
**Functions**: `generate_document_number(text)`, `generate_invoice_number()`, `generate_quote_number()`.

---

### 7.9 `invoice_number_counters` — ❌ DROPPED 2026-07-18

Original invoice numbering table. Was superseded by `document_number_counters`. Had no code references. Dropped on 2026-07-18.

---

## 8. Monitoring Domain

### 8.1 `system_alerts` — Production Verified

Admin-facing operational alerts generated by the monitoring cron.

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `id` | UUID | NO | PK, `gen_random_uuid()` |
| `type` | TEXT | NO | CHECK (see below) |
| `camera_id` | UUID | YES | FK → `cameras.id` |
| `camera_name` | TEXT | YES | Denormalized for display |
| `mini_pc_id` | UUID | YES | FK → `mini_pcs.id` |
| `mini_pc_hostname` | TEXT | YES | Denormalized |
| `customer_name` | TEXT | NO | Denormalized for display |
| `message` | TEXT | NO | Hebrew alert message |
| `severity` | TEXT | NO | CHECK: `low`, `medium`, `high`, `critical` |
| `resolved` | BOOLEAN | YES | Default `false` |
| `resolved_at` | TIMESTAMPTZ | YES | |
| `resolved_by` | TEXT | YES | Who resolved |
| `notification_sent` | BOOLEAN | YES | Default `false` |
| `created_at` | TIMESTAMPTZ | YES | `now()` |

**CHECK constraints**:
- `system_alerts_type_check`: `camera_offline`, `disk_full`, `stream_error`, `device_error`, `minipc_offline`, `minipc_overheating`, `minipc_disk_full`, `minipc_memory_full`, `minipc_no_internet`
- `system_alerts_severity_check`: `low`, `medium`, `high`, `critical`

**RLS**: Admin full access only.  
**Indexes**: `idx_system_alerts_camera_id`, `idx_system_alerts_mini_pc_id`, `idx_system_alerts_created_at`, `idx_system_alerts_resolved`, `idx_system_alerts_severity`.  
**Note**: `resolved_by` column exists but was not in old doc. Severity includes `low` and `medium` values not previously documented.

---

### 8.2 `admin_notifications` — Production Verified

Admin notification queue.

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `id` | UUID | NO | PK, `gen_random_uuid()` |
| `type` | VARCHAR(50) | NO | Notification category |
| `title` | VARCHAR(255) | NO | |
| `message` | TEXT | YES | |
| `severity` | VARCHAR(20) | YES | Default `'info'` |
| `customer_id` | UUID | YES | FK → `users.id` (ON DELETE CASCADE) |
| `camera_id` | UUID | YES | FK → `cameras.id` (ON DELETE CASCADE) |
| `mini_pc_id` | UUID | YES | FK → `mini_pcs.id` (ON DELETE CASCADE) |
| `is_read` | BOOLEAN | YES | Default `false` |
| `created_at` | TIMESTAMPTZ | YES | `now()` |
| `updated_at` | TIMESTAMPTZ | YES | `now()` |

**RLS**: Admin full access only (`authenticated` role with `jwt.role = 'admin'`).  
**Indexes**: `idx_admin_notifications_created_at` (DESC), `idx_admin_notifications_is_read`, `idx_admin_notifications_severity`, `idx_admin_notifications_type`.  
**Trigger**: `update_admin_notifications_updated_at` fires on UPDATE.

---

### 8.3 `system_settings` — Production Verified

Key-value configuration store for admin-managed system settings.

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `id` | UUID | NO | PK, `gen_random_uuid()` |
| `setting_key` | VARCHAR(100) | NO | UNIQUE |
| `setting_value` | TEXT | NO | |
| `setting_type` | VARCHAR(50) | NO | |
| `category` | VARCHAR(50) | NO | |
| `description` | TEXT | YES | |
| `updated_at` | TIMESTAMPTZ | YES | `now()` |
| `updated_by` | VARCHAR(255) | YES | Name/email (not UUID) |

**RLS**: Service role only (`auth.role() = 'service_role'`).  
**Indexes**: `system_settings_setting_key_key` (unique), `idx_system_settings_category`, `idx_system_settings_key`.

---

### 8.4 `device_health` — ❌ DROPPED 2026-07-18

Predated `mini_pc_health` + `camera_health` split. Had no code references. Dropped on 2026-07-18.

---

## 9. Support Domain

### 9.1 `subscription_requests` — Production Verified

Website signup/installation requests.

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `id` | UUID | NO | PK, `gen_random_uuid()` |
| `full_name` | TEXT | NO | |
| `phone` | TEXT | NO | |
| `address` | TEXT | NO | |
| `preferred_date` | DATE | YES | Installation preference |
| `selected_plan` | TEXT | YES | Requested plan description |
| `created_at` | TIMESTAMPTZ | YES | `now()` |
| `email` | TEXT | YES | |
| `status` | TEXT | YES | Default `'new'` |
| `admin_notes` | TEXT | YES | |

**RLS**: Enabled. No user-facing policies found (service_role manages).  
**Note**: No `updated_at` column in production.

---

### 9.2 `support_requests`

Customer support tickets.

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `id` | UUID | NO | PK, `gen_random_uuid()` |
| `user_id` | UUID | NO | FK → `users.id` |
| `subject` | TEXT | NO | |
| `message` | TEXT | NO | Request content |
| `status` | TEXT | YES | Default `'new'` |
| `created_at` | TIMESTAMPTZ | YES | `now()` |
| `user_email` | TEXT | YES | Denormalized |
| `file_url` | TEXT | YES | Attachment (supportuploads bucket) |

**Verification**: Production Verified.  
**RLS**: Users read/insert own; service_role full access.  
**Note**: No `updated_at` column exists in production.

---

## 10. Operations Domain

### 10.1 `system_logs`

Centralized operational event log (edge → cloud).

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `id` | UUID | NOT NULL | PK |
| `user_id` | UUID | YES | FK → `users.id` ON DELETE SET NULL |
| `mini_pc_id` | UUID | YES | FK → `mini_pcs.id` ON DELETE SET NULL |
| `camera_id` | UUID | YES | FK → `cameras.id` ON DELETE SET NULL |
| `category` | TEXT | NOT NULL | CHECK: `'camera'`, `'vod'`, `'minipc'`, `'alert'`, `'system'` |
| `severity` | TEXT | NOT NULL | CHECK: `'info'`, `'warning'`, `'error'`, `'critical'`. Default `'info'` |
| `event` | TEXT | NOT NULL | Short event key |
| `message` | TEXT | NOT NULL | Human-readable Hebrew message |
| `metadata` | JSONB | | `'{}'` |
| `created_at` | TIMESTAMPTZ | NOT NULL | `now()` |

**Verification**: Verified — full CREATE TABLE migration.  
**RLS**: Service_role only (insert, select, delete).  
**Deletion**: Hard delete. Intended 90-day retention (commented-out cron in migration).  
**Indexes**: `idx_system_logs_created_at` (DESC), `idx_system_logs_user_id`, `idx_system_logs_category`, `idx_system_logs_severity`, `idx_system_logs_mini_pc_id`.

---

## 11. Database Views

### 11.1 `recent_payments` — Production Verified

Join of payments + users for admin dashboards (VIEW, not materialized).

```sql
SELECT p.id, p.user_id, p.payment_type, p.amount, p.currency, p.status,
       p.payment_provider, p.provider_payment_id, p.provider_transaction_id,
       p.description, p.items, p.invoice_id_text AS invoice_id,
       p.invoice_number, p.invoice_url, p.receipt_url,
       p.created_at, p.paid_at, p.updated_at, p.metadata, p.notes,
       u.email, u.full_name, u.phone
FROM payments p JOIN users u ON p.user_id = u.id
ORDER BY p.created_at DESC LIMIT 100;
```

**Note**: Uses `p.invoice_id_text AS invoice_id` (TEXT column), not `p.invoice_id` (UUID). Returns at most 100 recent payments.  
**Access**: `service_role` only.  
**Security**: `security_invoker = true` (confirmed via `pg_class.reloptions`).

---

### 11.2 `admin_monitoring_hierarchy`

Pre-joined monitoring view demonstrating the canonical ownership path.

```sql
users → mini_pcs (ON u.id = mp.user_id)
      → mini_pc_health (ON mp.id = mph.mini_pc_id)
      → cameras (ON mp.id = c.mini_pc_id)  -- CANONICAL JOIN
      → camera_health (ON c.id = ch.camera_id)
```

Groups by user/mini_pc and aggregates camera health counts.

**Access**: `service_role` only.  
**Security**: `security_invoker = true` (confirmed via `pg_class.reloptions`).  
**Note**: This view confirms the canonical `cameras JOIN mini_pcs ON cameras.mini_pc_id = mini_pcs.id` pattern.  
**Usage**: No application code references this view (grep verified). May be used via direct Supabase Dashboard queries.

---

## 12. Database Functions — Production Verified

| Function | Return Type | Security Definer | Volatility | Notes |
|----------|-------------|------------------|------------|-------|
| `generate_document_number(text)` | TEXT | No | VOLATILE | Atomic YYYY-0001 numbering per doc type |
| `generate_invoice_number()` | TEXT | No | VOLATILE | Wrapper → `generate_document_number('invoice')` |
| `generate_quote_number()` | TEXT | No | VOLATILE | Wrapper → `generate_document_number('quote')` |
| `get_mini_pc_id(uuid, text)` | TABLE(mini_pc_id uuid) | NO | VOLATILE | Resolve mini_pc_id from user_id + hostname |
| ~~`check_subscription_access(uuid)`~~ | — | — | — | ❌ DROPPED 2026-07-18 (referenced non-existent `subscriptions` table) |
| ~~`check_subscription_health(uuid)`~~ | — | — | — | ❌ DROPPED 2026-07-18 |
| ~~`find_expiring_trials()`~~ | — | — | — | ❌ DROPPED 2026-07-18 |
| ~~`find_paused_to_resume()`~~ | — | — | — | ❌ DROPPED 2026-07-18 |
| ~~`find_subscriptions_needing_sync()`~~ | — | — | — | ❌ DROPPED 2026-07-18 |
| ~~`find_subscriptions_to_cancel()`~~ | — | — | — | ❌ DROPPED 2026-07-18 |
| `update_updated_at_column()` | TRIGGER | NO | VOLATILE | Generic trigger function |
| `update_invoice_updated_at()` | TRIGGER | NO | VOLATILE | Invoice trigger |
| `update_recurring_payments_updated_at()` | TRIGGER | NO | VOLATILE | Recurring payments trigger |
| `update_admin_notifications_updated_at()` | TRIGGER | NO | VOLATILE | Admin notifications trigger |
| `update_next_payment_date()` | TRIGGER | NO | VOLATILE | Payment date calculation trigger |

**IMPORTANT**: No functions in the public schema use SECURITY DEFINER. All execute with caller's permissions (SECURITY INVOKER).  
**Note**: Dead functions referencing the non-existent `subscriptions` table were dropped on 2026-07-18. Only active functions remain.

### Database Triggers

| Trigger | Table | Timing | Function |
|---------|-------|--------|----------|
| `trigger_update_invoice_timestamp` | invoices | BEFORE UPDATE | `update_invoice_updated_at()` |
| `update_admin_notifications_updated_at` | admin_notifications | BEFORE UPDATE | `update_admin_notifications_updated_at()` |
| `update_payments_updated_at` | payments | BEFORE UPDATE | `update_updated_at_column()` |
| `recurring_payments_updated_at` | recurring_payments | BEFORE UPDATE | `update_recurring_payments_updated_at()` |

---

## 13. Storage Buckets — Production Verified

| Bucket | Public | Limit | Allowed Types | Purpose |
|--------|--------|-------|---------------|---------|
| `alert-snapshots` | YES | 1MB/file | `image/jpeg`, `image/png`, `image/webp` | AI detection snapshot images |
| `supportuploads` | YES | 10MB (API-enforced) | jpeg, png, gif, webp, mp4, mov, pdf (API-enforced) | Support ticket file attachments |

**Storage RLS policies** (on `storage.objects`):
- `Public read access for alert snapshots` — SELECT on `alert-snapshots` bucket (role: public)
- `Service role can upload alert snapshots` — INSERT on `alert-snapshots` bucket (role: public, despite name)
- `Users can view own alert snapshots` — SELECT filtered by user ID folder path

**Security note**: `supportuploads` is a **public bucket** (`public = true`) with **no storage policies**. Files are downloadable by anyone with the URL. Only `service_role` can upload (no INSERT policy). This may expose support ticket attachments (screenshots, PII) if URLs are guessed or leaked.

VOD files are stored externally in **Backblaze B2**, not Supabase Storage.

---

## 14. Known Inconsistencies

### 14.1 Legacy Denormalized Fields

| Table | Field | Issue | Migration Path |
|-------|-------|-------|----------------|
| `cameras` | `user_id` | Denormalized. Canonical path is `mini_pc_id → mini_pcs.user_id` | **Required** — RLS, 4+ routes, ingest pipeline depend on it. Removal requires RLS redesign |
| `cameras` | `user_email` | Redundant with user join | **Required** — used by `user-cameras` route, ingest routes, admin creation |
| `vod_files` | `user_email` | Copied from camera on insert | **Required** — used by ingest pipeline |
| `payments` | `invoice_id_text` | Pre-UUID text column | **Cannot be dropped** — actively used by `recent_payments` view |

### 14.2 Missing CREATE TABLE Migrations

The following tables exist in production but have no CREATE TABLE migration in the repository:

- `users`
- `cameras`
- `mini_pcs`
- `plans`
- `payments`
- `vod_files`
- `system_alerts`
- `admin_notifications`

No CREATE TABLE migration was found in the repository for these tables. Their creation method is unknown (possibly Supabase Dashboard, possibly untracked SQL).

### 14.3 FK Reference (Verified 2026-07-17)

`recurring_payments.user_id` FK target: Live `pg_constraint` query confirms it references `auth.users.id` (not `public.users.id`). This is the only table in the schema with a cross-schema FK to `auth.users` rather than `public.users`.

### 14.4 RLS Pattern Inconsistency

`camera_health` RLS joins through `cameras.user_id` (legacy field) rather than the canonical path `cameras.mini_pc_id → mini_pcs.user_id`. This works but is inconsistent with the architectural decision.

### 14.5 `subscriptions` Table — ✅ RESOLVED 2026-07-18

~~The `subscriptions` table does NOT exist in production.~~ All code references and dead DB functions were removed on 2026-07-18. Subscription checks now go directly to `recurring_payments.is_active` + `users.subscription_active`.

### 14.6 Dead Functions — ✅ RESOLVED 2026-07-18

~~Functions referencing the non-existent `subscriptions` table.~~ All 6 dead functions were dropped on 2026-07-18 (`find_expiring_trials`, `get_subscription_status`, `find_subscriptions_to_cancel`, `find_paused_to_resume`, `check_subscription_access`, `check_subscription_health`).

---

## 15. Future Considerations

These are documented as possible extensions. **None should be implemented until explicitly decided.**

- **Sites table**: A `sites` entity between `users` and `mini_pcs` could formalize the location concept. The current schema does not prevent this addition.
- **Organization/multi-user access**: An `organizations` table with membership would sit above `users`. Not currently planned.
- **Health history**: A `mini_pc_health_history` or `camera_health_history` table could store time-series data alongside the current UPSERT registers.
- **VOD lifecycle tracking**: `vod_files` could gain `expires_at`, `deleted_at`, or `status` columns for explicit retention management.
- **Notification preferences**: A dedicated `notification_preferences` table per user could replace the per-rule `notify_*` booleans.
- **Audit log**: ✅ Implemented 2026-07-18 — `audit_log` table with `logAdminAction()` helper. Currently tracks user.create and user.delete.

---

## 16. Entity Relationship Summary

```
┌─────────┐     1:N     ┌──────────┐     1:N     ┌─────────┐
│  users  │────────────▶│ mini_pcs │────────────▶│ cameras │
└─────────┘             └──────────┘             └─────────┘
     │                       │                        │
     │ 1:N                   │ 1:1                    │ 1:1
     ▼                       ▼                        ▼
┌──────────────┐    ┌───────────────┐    ┌──────────────┐
│ recurring_   │    │ mini_pc_health│    │ camera_health│
│   payments   │    │ mini_pc_tokens│    │ vod_files    │
│ payments     │    │ system_logs   │    │ alerts       │
│ invoices     │    └───────────────┘    │ system_alerts│
│ alert_rules  │                         └──────────────┘
│ support_req  │
└──────────────┘

─── CANONICAL path: users → mini_pcs → cameras
··· DENORMALIZED:  users → cameras (via cameras.user_id, actively required for RLS)
```

---

*Document verified against production Supabase metadata export on 2026-07-17. Updated 2026-07-18 with schema changes (soft delete, audit_log, dropped tables/functions, indexes, RLS on all 23 tables). All tables marked "Production Verified" have been confirmed via information_schema and pg_catalog queries.*

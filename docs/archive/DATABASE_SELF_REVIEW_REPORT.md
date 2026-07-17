# DATABASE.md — Adversarial Self-Review Report

**Date**: 2026-07-17  
**Status**: ✅ EXECUTED — All corrections applied to DATABASE.md  
**Joint Review**: Completed 2026-07-17 (G1–G32 approved, H1–H4 resolved)  
**Scope**: Complete audit of `DATABASE.md` against all production metadata CSV exports and repository source code  
**Method**: Line-by-line comparison of every documented claim against authoritative sources

### Execution Summary

- **32 corrections** applied (G1–G32)
- **G15 revised** during execution: FK exists but targets `auth.users` (confirmed via live `pg_constraint` query). Original CSV export missed this because the FK query filtered `target_schema = 'public'` only — cross-schema FKs to `auth.users` were excluded from the export. Final verified state: `recurring_payments_user_id_fkey` → `auth.users.id` (ON UPDATE NO ACTION, ON DELETE CASCADE).
- **H1.1–H1.6**: All resolved via production queries
- **H2.1–H2.3**: All resolved via code investigation
- **H3**: Closed (behavior deterministic, no testing needed)
- **H4.1–H4.7**: All recommendations accepted and applied
- **Trigger map**: Added to DATABASE.md (4 production triggers documented)
- **Security notes**: `supportuploads` public bucket risk documented

---

## A. Confirmed Factual Errors

### A1. Table Count Error (Line 42)

**Document claims**: "RLS: Enabled on all 22 production tables"  
**Production evidence** (RLS CSV): 24 tables have RLS enabled  
**Table inventory** (lines 48–74): Lists 24 production tables correctly  
**Correction**: Change "22" to "24"

---

### A2. Foreign Key Rules — CRITICAL (Multiple Tables)

| Table | Column | Doc Claims | Production (FK CSV) | Error |
|-------|--------|-----------|---------------------|-------|
| `mini_pcs` | `user_id` | ON UPDATE CASCADE, ON DELETE SET NULL | update=NO ACTION, delete=CASCADE | **Both rules wrong** |
| `payments` | `user_id` | ON UPDATE CASCADE ON DELETE SET NULL | update=NO ACTION, delete=CASCADE | **Both rules wrong** |
| `recurring_payments` | `user_id` | FK → `public.users.id` ON DELETE CASCADE | **FK DOES NOT EXIST in metadata** | **Phantom FK** |

**Evidence**: FK CSV (file 3) contains no entry for `recurring_payments.user_id`. Only `recurring_payments_plan_id_fkey` exists.

---

### A3. `admin_notifications` — Major Schema Errors (Lines 660–674)

| Issue | Doc Says | Production (Columns CSV) |
|-------|----------|--------------------------|
| `type` type | TEXT | `character varying(50)` |
| `title` type | TEXT | `character varying(255)` |
| `severity` type | TEXT | `character varying(20)` |
| `metadata` column | JSONB, YES, `'{}'` | **DOES NOT EXIST** |
| `customer_id` | Not listed | UUID, YES, FK → `users.id` ON DELETE CASCADE |
| `camera_id` | Not listed | UUID, YES, FK → `cameras.id` ON DELETE CASCADE |
| `mini_pc_id` | Not listed | UUID, YES, FK → `mini_pcs.id` ON DELETE CASCADE |

**FKs not documented**: 3 foreign keys confirmed in FK CSV (admin_notifications → cameras, users, mini_pcs).

---

### A4. `system_settings` — Major Schema Errors (Lines 682–694)

| Column | Doc Says | Production |
|--------|----------|------------|
| `setting_key` | TEXT, NO | `varchar(100)`, NO |
| `setting_value` | TEXT, YES | `text`, **NO** (NOT NULL) |
| `setting_type` | TEXT, YES, Default `'string'` | `varchar(50)`, **NO**, no visible default |
| `category` | TEXT, YES | `varchar(50)`, **NO** |
| `updated_by` | UUID, YES | `varchar(255)`, YES |

---

### A5. `subscription_requests` — Phantom Columns (Lines 725–741)

| Issue | Doc Says | Production |
|-------|----------|------------|
| `full_name` nullable | YES | **NO** (NOT NULL) |
| `phone` nullable | YES | **NO** (NOT NULL) |
| `address` nullable | YES | **NO** (NOT NULL) |
| `notes` column | TEXT, YES | **DOES NOT EXIST** |
| `camera_count` column | INTEGER, YES | **DOES NOT EXIST** |

---

### A6. `system_alerts` — Nullability Errors (Lines 629–652)

| Column | Doc Says Nullable | Production |
|--------|-------------------|------------|
| `type` | YES | **NO** |
| `customer_name` | YES | **NO** |
| `message` | YES | **NO** |
| `severity` | YES | **NO** |

---

### A7. `device_health` — Schema Errors (Lines 700–715)

| Issue | Doc Says | Production |
|-------|----------|------------|
| `user_id` column | Not listed | **EXISTS**: UUID, YES |
| `disk_root_pct` type | REAL | **INTEGER** |
| `disk_ram_pct` type | REAL | **INTEGER** |
| `cpu_temp_celsius` type | REAL | **INTEGER** |
| `last_checked` default | `now()` | **null** (no default) |

---

### A8. `mini_pc_health` — Type Errors (Lines 195–237)

| Column | Doc Says | Production |
|--------|----------|------------|
| `cpu_usage_pct` | INTEGER | **NUMERIC(5,2)** |
| `ram_usage_pct` | INTEGER | **NUMERIC(5,2)** |
| `disk_root_pct` | INTEGER | **NUMERIC(5,2)** |
| `disk_ram_pct` | INTEGER | **NUMERIC(5,2)** |
| `load_avg_1min` | NUMERIC(5,2) | **NUMERIC(4,2)** |
| `load_avg_5min` | NUMERIC(5,2) | **NUMERIC(4,2)** |
| `load_avg_15min` | NUMERIC(5,2) | **NUMERIC(4,2)** |
| `uptime_seconds` | INTEGER | **BIGINT** |
| `mini_pc_id` nullable | NO | **YES** |

---

### A9. `plans` — Nullability Errors (Lines 387–409)

| Column | Doc Says Nullable | Production |
|--------|-------------------|------------|
| `name` | YES | **NO** |
| `monthly_price` | YES | **NO** |
| `retention_days` | YES | **NO** |
| `connection_type` | YES | **NO** |
| `setup_price` | YES | **NO** (default 0) |
| `camera_limit` | YES | **NO** (default 4) |

---

### A10. `payments` — Type/Nullability Errors (Lines 468–505)

| Column | Doc Says | Production |
|--------|----------|------------|
| `user_id` nullable | YES | **NO** (NOT NULL) |
| `currency` type | VARCHAR(3), NO | **TEXT, YES** (default 'ILS') |

---

### A11. `invoices.user_id` — Nullability Error (Line 516)

**Doc claims**: `user_id` UUID NOT NULL  
**Production**: `invoices,user_id,2,null,YES,uuid` — **IS nullable**

---

### A12. `invoice_items` — Schema Errors (Lines 553–572)

| Issue | Doc Says | Production |
|-------|----------|------------|
| `invoice_id` nullable | NOT NULL | **YES** (nullable) |
| `unit_price` type | NUMERIC | NUMERIC(10,2) |
| `total_price` type | NUMERIC | NUMERIC(10,2) |
| `created_at` column | Not listed | **EXISTS**: TIMESTAMPTZ, YES, default `now()` |
| `quantity` default | not shown | default 1 |
| `sort_order` default | not shown | default 0 |

---

### A13. `support_requests` — Phantom Column (Lines 745–762)

**Doc lists**: `updated_at` TIMESTAMPTZ  
**Production**: Column **DOES NOT EXIST**

---

### A14. `mini_pcs.installed_at` Default (Line 139)

**Doc claims**: Default `—` (none)  
**Production**: Default `now()`

---

### A15. `mini_pcs.is_active` Default (Line 141)

**Doc claims**: Default `—` (none)  
**Production**: Default `true`

---

### A16. `vod_files` Missing Indexes

**Doc documents**: `vod_files_user_id_camera_id_timestamp_idx` only  
**Production has 3 indexes**:
- `vod_files_user_camera_time_idx` (user_id, camera_id, timestamp DESC)
- `vod_files_user_email_idx` (user_email)
- `vod_files_user_id_camera_id_timestamp_idx` (user_id, camera_id, timestamp)

---

### A17. Storage Policy Mischaracterization (Line 868)

**Doc says**: "Service role can upload alert snapshots — public INSERT on alert-snapshots bucket"  
**Production policy** (file 18): Role = `{public}`, cmd = INSERT, with_check = `(bucket_id = 'alert-snapshots'::text)`  
**Issue**: The policy grants INSERT to the **public** role (anyone), not just service_role. The policy name is misleading. Any authenticated or anonymous user could potentially insert into this bucket. The only guard is the bucket_id check.

---

### A18. `supportuploads` Bucket — Missing Policies

**Doc says** (line 864): Lists the bucket with "None" limits  
**Production**: No storage RLS policies exist for `supportuploads` — zero entries in storage policies CSV  
**Security concern**: If RLS is enabled on `storage.objects`, this bucket is inaccessible to non-service-role callers. If RLS is disabled, it's open. The doc doesn't clarify this state.

---

## B. Internal Contradictions

### B1. `subscriptions` in "Missing CREATE TABLE Migrations" (Line 894)

The document correctly states `subscriptions` does NOT exist in production (line 413), then lists it under "Missing CREATE TABLE Migrations" (line 894) as a table that "exists in production but has no CREATE TABLE migration." This is a direct contradiction — a non-existent table cannot be "missing a migration."

**Correction**: Remove `subscriptions` from the migration list entirely.

### B2. `subscriptions` Functions — "likely return empty/null results" (Line 855)

The doc says functions "likely return empty/null results." However:
- These functions query a non-existent table
- PostgREST `.rpc()` calls to functions that reference missing tables will **throw a PostgreSQL error** (relation does not exist), NOT return empty results
- The application code (e.g., `process-trials/route.ts` line 38) calls `.rpc("find_expiring_trials")` and checks `fetchError` — confirming these calls DO produce errors

**Correction**: Replace "likely return empty/null results" with "will fail with a PostgreSQL error (relation 'subscriptions' does not exist) when invoked. Application code handles this via error checks."

### B3. `recurring_payments` FK Claim vs Reality (Lines 463–464)

Line 463 states the FK exists and goes to `public.users.id`. Line 903 states "Production metadata confirms it references `public.users.id`." But the FK metadata CSV contains NO entry for `recurring_payments.user_id` — only `recurring_payments_plan_id_fkey` exists.

**Correction**: State that no FK exists on `recurring_payments.user_id` in production despite the migration code creating one. The constraint was either never applied or was dropped.

---

## C. Unsupported Conclusions

### C1. "Magic Link" in Authentication (Line 41)

**Doc says**: "Auth: Supabase Auth (email/password, magic link)"  
**Evidence**: Zero results for `magic.link`, `magiclink`, or `magic_link` in the entire repository  
**Conclusion**: Magic Link is a Supabase platform capability but is NOT implemented by the Clearpoint application  
**Correction**: "Auth: Supabase Auth (email/password)"

### C2. `device_health` — "LEGACY" Label (Line 56, 698, 715)

**Evidence for legacy claim**: The split into `mini_pc_health` + `camera_health` exists. The `CamerasTable.tsx` references a `DeviceHealth` interface (line 30) that fetches from `/api/camera-health/` (NOT `device_health`).  
**Evidence against removal**: `device_health` has RLS enabled with an ALL policy for service_role. No code in `src/` queries it directly.  
**Correction**: Change from "LEGACY — predates split tables" to "Predates split into `mini_pc_health` + `camera_health`. No application code currently queries this table (verified via grep). Retention reason unknown."

### C3. `invoice_number_counters` — "Legacy" Label (Line 609)

**Evidence**: Zero code references to `invoice_number_counters` in the repository (confirmed grep). The `generate_invoice_number()` function uses `document_number_counters`.  
**Status**: Truly appears unused, but no explicit deprecation evidence exists.  
**Correction**: "No code references found. Appears superseded by `document_number_counters`, but no explicit deprecation or removal plan documented."

### C4. `payments.invoice_id_text` — "LEGACY" Label (Line 488, 504, 884)

**Doc says**: "LEGACY — original text column" / "Can be dropped" (line 884)  
**Evidence**: The `recent_payments` view **actively uses** `p.invoice_id_text AS invoice_id` (confirmed in view definition, file 15, line 51)  
**Correction**: "Legacy text column from pre-UUID era. **Still actively used by the `recent_payments` view**. Cannot be dropped without view migration."

### C5. `cameras.user_id` / `cameras.user_email` — "LEGACY/DENORMALIZED" (Lines 164–165)

The doc correctly notes these are used by RLS, user-cameras route, VOD ingest, and camera_health RLS (lines 183–188). But then line 884 implies `cameras.user_email` "should be removed after code migration."  
**Evidence**: At least 5 active code paths depend on these fields. The cameras RLS policy (file 8, line 15) uses `user_email` for SELECT. The RLS policy on line 14 uses `user_email` for UPDATE.  
**Correction**: The fields ARE denormalized but are NOT legacy in the sense of "safe to remove." They are **actively critical** to the current security model.

### C6. `users.subscription_status` — "Legacy status field" (Line 89)

**Evidence**: 11 code references across 7 files (confirmed grep), including `user-cameras/route.ts`, `dashboard/page.tsx`, `FootageView.tsx`. This field is **actively read and used**.  
**Correction**: Remove "Legacy" label. Replace with "Subscription state indicator; actively queried by multiple application routes."

### C7. "Created manually via Supabase Dashboard" (Line 900)

**Doc says**: "These were created manually via Supabase Dashboard during early development"  
**Evidence**: No proof exists for HOW these tables were created. The absence of a migration does not prove Dashboard creation.  
**Correction**: "No CREATE TABLE migration was found in the repository; creation method is unknown."

### C8. `subscriptions` Code Behavior — "Queries return null/empty and code handles this gracefully" (Line 415)

**Evidence**: Looking at actual code:
- `user-cameras/route.ts` (line 57): `.from("subscriptions").select(...).single()` → PostgREST returns error 404/PGRST (table not found), NOT null. Code then checks `activeRecurringPayment` as fallback.
- `vod/signed-url/route.ts` (line 74): Similar pattern with fallback.
- `process-trials/route.ts` (line 38): Calls `.rpc("find_expiring_trials")` which references the missing table → SQL error.

**Correction**: PostgREST returns an error (not null) for queries to non-existent tables. The application routes have fallback logic checking `recurring_payments` and `users.subscription_active`. The cron routes calling `.rpc()` functions will receive SQL errors.

---

## D. Missing Production Metadata

### D1. `item_templates` — Full Schema Available but Not Documented (Lines 575–588)

Doc says "Partially Verified — only RLS policy visible. Structure inferred."  
**Production columns CSV** shows complete schema:

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | UUID | NO | `gen_random_uuid()` |
| `item_type` | TEXT | NO | — |
| `item_name` | TEXT | NO | — |
| `item_description` | TEXT | YES | — |
| `default_price` | NUMERIC(10,2) | NO | — |
| `camera_type` | TEXT | YES | — |
| `is_active` | BOOLEAN | YES | `true` |
| `created_at` | TIMESTAMPTZ | YES | `now()` |

**Indexes**: `idx_item_templates_type` (item_type), PK  
**RLS**: Admin full access (authenticated, role='admin')  
**Correction**: Replace inferred schema with production-verified data above.

### D2. `vod_files` Missing FK Documentation

Production FK CSV shows:
- `vod_files_camera_id_fkey` → `cameras.id` (NO ACTION, CASCADE)
- `vod_files_user_id_fkey` → `users.id` (NO ACTION, NO ACTION)

Doc line 366–367 mentions FK informally but doesn't list constraint names or delete rules.

### D3. `admin_notifications` Missing FKs (Not documented anywhere)

Three FKs confirmed:
- `admin_notifications_camera_id_fkey` → `cameras.id` (NO ACTION, CASCADE)
- `admin_notifications_customer_id_fkey` → `users.id` (NO ACTION, CASCADE)
- `admin_notifications_mini_pc_id_fkey` → `mini_pcs.id` (NO ACTION, CASCADE)

### D4. `invoice_items` Missing FK Details

FK CSV: `invoice_items_invoice_id_fkey` → `invoices.id` (NO ACTION, CASCADE)  
Doc line 560 mentions FK informally but doesn't specify delete rule.

### D5. `invoice_items` Missing Index

Production index: `idx_invoice_items_invoice_id` — not documented.

---

## E. Incorrect Verification Labels

### E1. `item_templates` — "Partially Verified" (Line 587)

Full production metadata available. Should be **"Production Verified"**.

### E2. `vod_files` — "Partially Verified" (Line 376)

Full production columns, indexes, FKs, and RLS are available in the CSV exports. Should be **"Production Verified"**.

### E3. `invoice_items` — "Verified — code insert + RLS policies" (Line 570)

Should state **"Production Verified"** since full metadata is available.

---

## F. Counts and Inventory Corrections

| Item | Doc States | Actual |
|------|-----------|--------|
| Production tables | "22" (line 42) | **24** |
| Views | 2 (correct) | 2 |
| Functions | 15 listed (correct) | 15 |
| Storage buckets | 2 (correct) | 2 |
| Tables with RLS | "22" (line 42) | **24** |
| `mini_pc_health` columns | 27 (listed) | **27** (correct, but types wrong) |
| `admin_notifications` columns | 9 (listed) | **11** (missing 3, has 1 phantom) |

---

## G. Proposed Exact Corrections (Full Evidence)

---

### G1. Table Count — Line 42

**Current doc statement**: `**RLS**: Enabled on all 22 production tables`  
**Production evidence**: RLS status CSV (`Supabase Snippet...7.csv`) lists 24 rows, all with `rls_enabled=true`  
**CSV source**: File 7, lines 1–25  
**Repository evidence**: N/A (pure metadata)  
**Proposed replacement**: `**RLS**: Enabled on all 24 production tables`  
**Confidence**: Certain — direct count from metadata export

---

### G2. `mini_pcs` FK Rules — Line 147

**Current doc statement**: `**FK**: mini_pcs_user_id_fkey → users.id (ON UPDATE CASCADE, ON DELETE SET NULL).`  
**Production evidence**: FK CSV (`...3.csv`) line 21: `mini_pcs,user_id,mini_pcs_user_id_fkey,public,users,id,NO ACTION,CASCADE`  
**CSV source**: File 3, line 21  
**Repository evidence**: Migration `20260131_secure_device_ingest.sql` may show different rules — migration is not authoritative for production state  
**Proposed replacement**: `**FK**: mini_pcs_user_id_fkey → users.id (ON UPDATE NO ACTION, ON DELETE CASCADE).`  
**Confidence**: Certain — FK CSV is authoritative for production constraint state

---

### G3. `payments.user_id` Nullability — Line 475

**Current doc statement**: `| user_id | UUID | YES | FK → users.id ON UPDATE CASCADE ON DELETE SET NULL |`  
**Production evidence**: Columns CSV (`...1.csv`) line 197: `payments,user_id,2,null,NO,uuid,uuid`  
FK CSV line 23: `payments,user_id,payments_user_id_fkey,public,users,id,NO ACTION,CASCADE`  
**CSV source**: File 1 line 197, File 3 line 23  
**Repository evidence**: `create-invoice` and payment routes insert `user_id` as required field  
**Proposed replacement**: `| user_id | UUID | NO | FK → users.id ON UPDATE NO ACTION ON DELETE CASCADE |`  
**Confidence**: Certain — both CSV sources agree

---

### G4. `payments.currency` Type — Line 478

**Current doc statement**: `| currency | VARCHAR(3) | NO | Default 'ILS' |`  
**Production evidence**: Columns CSV line 200: `payments,currency,5,'ILS'::text,YES,text,text,null,null,null`  
**CSV source**: File 1, line 200  
**Repository evidence**: Payment creation code uses string 'ILS' — compatible with either type  
**Proposed replacement**: `| currency | TEXT | YES | Default 'ILS' |`  
**Confidence**: Certain — CSV shows TEXT not VARCHAR, and nullable

---

### G5. `admin_notifications` Schema — Lines 660–674

**Current doc statement** (table):
```
| `id` | UUID | NO | PK, gen_random_uuid() |
| `type` | TEXT | NO | Notification category |
| `title` | TEXT | NO | |
| `message` | TEXT | YES | |
| `severity` | TEXT | YES | Default 'info' |
| `metadata` | JSONB | YES | '{}' |
| `is_read` | BOOLEAN | YES | Default false |
| `created_at` | TIMESTAMPTZ | YES | now() |
| `updated_at` | TIMESTAMPTZ | YES | now() |
```

**Production evidence**: Columns CSV lines 22–32:
```
admin_notifications,id,1,gen_random_uuid(),NO,uuid
admin_notifications,type,2,null,NO,character varying,varchar,50
admin_notifications,title,3,null,NO,character varying,varchar,255
admin_notifications,message,4,null,YES,text
admin_notifications,severity,5,'info'::character varying,YES,character varying,varchar,20
admin_notifications,customer_id,6,null,YES,uuid
admin_notifications,camera_id,7,null,YES,uuid
admin_notifications,mini_pc_id,8,null,YES,uuid
admin_notifications,is_read,9,false,YES,boolean
admin_notifications,created_at,10,now(),YES,timestamp with time zone
admin_notifications,updated_at,11,now(),YES,timestamp with time zone
```

FK CSV lines 2–4:
```
admin_notifications,camera_id,admin_notifications_camera_id_fkey,public,cameras,id,NO ACTION,CASCADE
admin_notifications,customer_id,admin_notifications_customer_id_fkey,public,users,id,NO ACTION,CASCADE
admin_notifications,mini_pc_id,admin_notifications_mini_pc_id_fkey,public,mini_pcs,id,NO ACTION,CASCADE
```

**CSV source**: File 1 lines 22–32, File 3 lines 2–4  
**Repository evidence**: Admin notification creation code in monitoring routes uses `customer_id`, `camera_id`, `mini_pc_id`  
**Proposed replacement**:
```
| `id` | UUID | NO | PK, gen_random_uuid() |
| `type` | VARCHAR(50) | NO | Notification category |
| `title` | VARCHAR(255) | NO | |
| `message` | TEXT | YES | |
| `severity` | VARCHAR(20) | YES | Default 'info' |
| `customer_id` | UUID | YES | FK → users.id ON DELETE CASCADE |
| `camera_id` | UUID | YES | FK → cameras.id ON DELETE CASCADE |
| `mini_pc_id` | UUID | YES | FK → mini_pcs.id ON DELETE CASCADE |
| `is_read` | BOOLEAN | YES | Default false |
| `created_at` | TIMESTAMPTZ | YES | now() |
| `updated_at` | TIMESTAMPTZ | YES | now() |
```
**Confidence**: Certain — complete metadata available

---

### G6. `system_settings` Schema — Lines 682–694

**Current doc statement**:
```
| setting_key | TEXT | NO | UNIQUE |
| setting_value | TEXT | YES | |
| setting_type | TEXT | YES | Default 'string' |
| category | TEXT | YES | |
| description | TEXT | YES | |
| updated_by | UUID | YES | |
```

**Production evidence**: Columns CSV lines 320–327:
```
system_settings,setting_key,2,null,NO,character varying,varchar,100
system_settings,setting_value,3,null,NO,text
system_settings,setting_type,4,null,NO,character varying,varchar,50
system_settings,category,5,null,NO,character varying,varchar,50
system_settings,description,6,null,YES,text
system_settings,updated_by,8,null,YES,character varying,varchar,255
```

**CSV source**: File 1, lines 320–327  
**Repository evidence**: System settings admin routes insert/update these fields  
**Proposed replacement**:
```
| setting_key | VARCHAR(100) | NO | UNIQUE |
| setting_value | TEXT | NO | |
| setting_type | VARCHAR(50) | NO | |
| category | VARCHAR(50) | NO | |
| description | TEXT | YES | |
| updated_by | VARCHAR(255) | YES | |
```
**Confidence**: Certain — direct from CSV; note no `'string'` default visible in column_default

---

### G7. `subscription_requests` Schema — Lines 725–741

**Current doc statement** (excerpt):
```
| full_name | TEXT | YES | |
| phone | TEXT | YES | |
| address | TEXT | YES | |
| notes | TEXT | YES | |
| camera_count | INTEGER | YES | |
```

**Production evidence**: Columns CSV lines 278–287:
```
subscription_requests,full_name,2,null,NO,text
subscription_requests,phone,3,null,NO,text
subscription_requests,address,4,null,NO,text
```
No `notes` or `camera_count` columns exist in the CSV (only 10 columns total: id, full_name, phone, address, preferred_date, selected_plan, created_at, email, status, admin_notes).

**CSV source**: File 1, lines 278–287  
**Repository evidence**: `/subscribe` page form requires full_name, phone, address (matches NOT NULL)  
**Proposed replacement**:
```
| full_name | TEXT | NO | |
| phone | TEXT | NO | |
| address | TEXT | NO | |
```
Remove `notes` and `camera_count` rows entirely.  
**Confidence**: Certain — columns not in metadata export

---

### G8. `device_health` Schema — Lines 700–715

**Current doc statement**:
```
| device_name | TEXT | NO | Composite PK part 1 |
| camera_id | UUID | NO | Composite PK part 2 |
| stream_status | TEXT | YES | |
| disk_root_pct | REAL | YES | |
| disk_ram_pct | REAL | YES | |
| last_checked | TIMESTAMPTZ | YES | now() |
| log_message | TEXT | YES | |
| cpu_temp_celsius | REAL | YES | |
```

**Production evidence**: Columns CSV lines 87–95:
```
device_health,device_name,1,null,NO,text
device_health,camera_id,2,null,NO,uuid
device_health,user_id,3,null,YES,uuid
device_health,stream_status,4,null,YES,text
device_health,disk_root_pct,5,null,YES,integer,int4,null,32,0
device_health,disk_ram_pct,6,null,YES,integer,int4,null,32,0
device_health,last_checked,7,null,YES,timestamp with time zone
device_health,log_message,8,null,YES,text
device_health,cpu_temp_celsius,9,null,YES,integer,int4,null,32,0
```

**CSV source**: File 1, lines 87–95  
**Repository evidence**: No current src/ code references `device_health` table directly  
**Proposed replacement**:
```
| device_name | TEXT | NO | Composite PK part 1 |
| camera_id | UUID | NO | Composite PK part 2 |
| user_id | UUID | YES | |
| stream_status | TEXT | YES | |
| disk_root_pct | INTEGER | YES | |
| disk_ram_pct | INTEGER | YES | |
| last_checked | TIMESTAMPTZ | YES | (no default) |
| log_message | TEXT | YES | |
| cpu_temp_celsius | INTEGER | YES | |
```
**Confidence**: Certain — types directly from `udt_name=int4`; `last_checked` column_default=null

---

### G9. `mini_pc_health` Types — Lines 195–237

**Current doc statement** (excerpt):
```
| cpu_usage_pct | INTEGER | YES | |
| ram_usage_pct | INTEGER | YES | |
| disk_root_pct | INTEGER | YES | |
| disk_ram_pct | INTEGER | YES | |
| load_avg_1min | NUMERIC(5,2) | YES | |
| load_avg_5min | NUMERIC(5,2) | YES | |
| load_avg_15min | NUMERIC(5,2) | YES | |
| uptime_seconds | INTEGER | YES | |
```
Also: `mini_pc_id` shown as NOT NULL.

**Production evidence**: Columns CSV lines 148–178:
```
mini_pc_health,mini_pc_id,2,null,YES,uuid
mini_pc_health,cpu_usage_pct,4,null,YES,numeric,numeric,null,5,2
mini_pc_health,ram_usage_pct,7,null,YES,numeric,numeric,null,5,2
mini_pc_health,disk_root_pct,10,null,YES,numeric,numeric,null,5,2
mini_pc_health,disk_ram_pct,13,null,YES,numeric,numeric,null,5,2
mini_pc_health,load_avg_1min,14,null,YES,numeric,numeric,null,4,2
mini_pc_health,load_avg_5min,15,null,YES,numeric,numeric,null,4,2
mini_pc_health,load_avg_15min,16,null,YES,numeric,numeric,null,4,2
mini_pc_health,uptime_seconds,17,null,YES,bigint,int8,null,64,0
```

**CSV source**: File 1, lines 148–178  
**Repository evidence**: Health ingest API sends integer percentages, but column type is NUMERIC(5,2)  
**Proposed replacement**:
```
| mini_pc_id | UUID | YES | FK → mini_pcs.id. Unique constraint (upsert target) |
| cpu_usage_pct | NUMERIC(5,2) | YES | |
| ram_usage_pct | NUMERIC(5,2) | YES | |
| disk_root_pct | NUMERIC(5,2) | YES | |
| disk_ram_pct | NUMERIC(5,2) | YES | |
| load_avg_1min | NUMERIC(4,2) | YES | |
| load_avg_5min | NUMERIC(4,2) | YES | |
| load_avg_15min | NUMERIC(4,2) | YES | |
| uptime_seconds | BIGINT | YES | |
```
**Confidence**: Certain — precision/scale directly from CSV `numeric_precision` and `numeric_scale` columns

---

### G10. `plans` Nullability — Lines 387–409

**Current doc statement** (excerpt):
```
| name | TEXT | YES | English name |
| monthly_price | INTEGER | YES | Monthly subscription cost |
| retention_days | INTEGER | YES | Default retention period |
| connection_type | TEXT | YES | |
| setup_price | INTEGER | YES | One-time installation cost |
| camera_limit | INTEGER | YES | Max cameras per plan |
```

**Production evidence**: Columns CSV lines 219–229:
```
plans,name,2,null,NO,text
plans,monthly_price,3,null,NO,integer
plans,retention_days,4,null,NO,integer
plans,connection_type,5,null,NO,text
plans,setup_price,9,0,NO,integer
plans,camera_limit,10,4,NO,integer
```

**CSV source**: File 1, lines 219–229  
**Repository evidence**: Plan creation requires name, price, retention — matches NOT NULL  
**Proposed replacement**:
```
| name | TEXT | NO | English name |
| monthly_price | INTEGER | NO | Monthly subscription cost (ILS) |
| retention_days | INTEGER | NO | Default retention period |
| connection_type | TEXT | NO | 'sim', 'wifi_cloud', 'wifi' |
| setup_price | INTEGER | NO | Default 0. One-time installation cost (ILS) |
| camera_limit | INTEGER | NO | Default 4. Max cameras per plan |
```
**Confidence**: Certain — `is_nullable=NO` for all six columns

---

### G11. `invoices.user_id` Nullability — Line 516

**Current doc statement**: `| user_id | UUID | NOT NULL | FK → users.id |`  
**Production evidence**: Columns CSV line 115: `invoices,user_id,2,null,YES,uuid`  
**CSV source**: File 1, line 115  
**Repository evidence**: Invoice creation code sets user_id, but column allows NULL (perhaps for system-generated documents)  
**Proposed replacement**: `| user_id | UUID | YES | FK → users.id ON DELETE CASCADE |`  
**Confidence**: Certain — CSV `is_nullable=YES`

---

### G12. `invoice_items` Schema — Lines 553–572

**Current doc statement** (excerpt):
```
| invoice_id | UUID | NOT NULL | FK → invoices.id |
| unit_price | NUMERIC | | |
| total_price | NUMERIC | | |
```
No `created_at` listed.

**Production evidence**: Columns CSV lines 100–110:
```
invoice_items,invoice_id,2,null,YES,uuid
invoice_items,unit_price,7,null,NO,numeric,numeric,null,10,2
invoice_items,total_price,8,null,NO,numeric,numeric,null,10,2
invoice_items,created_at,11,now(),YES,timestamp with time zone
```
Index CSV line 28: `invoice_items,idx_invoice_items_invoice_id,CREATE INDEX idx_invoice_items_invoice_id ON public.invoice_items USING btree (invoice_id)`

**CSV source**: File 1 lines 100–110, File 6 line 28  
**Repository evidence**: Invoice item creation inserts `invoice_id` — the FK enforces referential integrity even though nullable  
**Proposed replacement**:
```
| invoice_id | UUID | YES | FK → invoices.id ON DELETE CASCADE |
| unit_price | NUMERIC(10,2) | NO | |
| total_price | NUMERIC(10,2) | NO | |
| created_at | TIMESTAMPTZ | YES | now() |
```
Add index: `idx_invoice_items_invoice_id`  
**Confidence**: Certain — all from CSV exports

---

### G13. `support_requests.updated_at` — Line 759

**Current doc statement**: `| updated_at | TIMESTAMPTZ | | now() |`  
**Production evidence**: Columns CSV lines 288–295 list 8 columns for `support_requests`. No `updated_at` exists. Last column is `file_url` at ordinal 8.  
**CSV source**: File 1, lines 288–295  
**Repository evidence**: Support request code never references `updated_at`  
**Proposed replacement**: Remove the `updated_at` row entirely  
**Confidence**: Certain — column absent from metadata

---

### G14. `system_alerts` Nullability — Lines 629–652

**Current doc statement**:
```
| type | TEXT | YES | CHECK (see below) |
| customer_name | TEXT | YES | Denormalized for display |
| message | TEXT | YES | Hebrew alert message |
| severity | TEXT | YES | CHECK: low, medium, high, critical |
```

**Production evidence**: Columns CSV lines 297–302:
```
system_alerts,type,2,null,NO,text
system_alerts,customer_name,5,null,NO,text
system_alerts,message,6,null,NO,text
system_alerts,severity,7,null,NO,text
```

**CSV source**: File 1, lines 297–302  
**Repository evidence**: Alert creation in monitoring routes always provides type, customer_name, message, severity  
**Proposed replacement**:
```
| type | TEXT | NO | CHECK (see below) |
| customer_name | TEXT | NO | Denormalized for display |
| message | TEXT | NO | Hebrew alert message |
| severity | TEXT | NO | CHECK: low, medium, high, critical |
```
**Confidence**: Certain — `is_nullable=NO` for all four

---

### G15. `recurring_payments.user_id` FK — Line 463

**Current doc statement**: `**FK**: recurring_payments_user_id_fkey → public.users.id (NOT auth.users.id as migration states).`  
**Production evidence**: FK CSV (`...3.csv`) has only one entry for `recurring_payments`: line 24: `recurring_payments,plan_id,recurring_payments_plan_id_fkey,public,plans,id,NO ACTION,SET NULL`. No `user_id` FK entry exists.  
**CSV source**: File 3 (all 33 lines reviewed — no recurring_payments user_id FK)  
**Repository evidence**: Migration creates this FK but it may have been dropped or never applied successfully  
**Proposed replacement**: `**FK**: No foreign key constraint exists on user_id in production metadata. The migration references auth.users(id), but neither an auth.users FK nor a public.users FK is present in pg_catalog. Requires live verification (see Section H).`  
**Confidence**: High (95%) — FK CSV is comprehensive; small chance of metadata export query limitation

---

### G16. Authentication Wording — Line 41

**Current doc statement**: `**Auth**: Supabase Auth (email/password, magic link)`  
**Production evidence**: N/A (auth method isn't in schema metadata)  
**Repository evidence**: `grep -ri "magic.link\|magiclink\|magic_link" src/` → zero results. All auth code uses `signInWithPassword` or `signUp` with email/password.  
**Proposed replacement**: `**Auth**: Supabase Auth (email/password)`  
**Confidence**: Certain — no magic link implementation exists in codebase

---

### G17. Storage Policy Characterization — Line 868

**Current doc statement**: `- Service role can upload alert snapshots — public INSERT on alert-snapshots bucket`  
**Production evidence**: Storage policies CSV (`...18.csv`) line 3: `Service role can upload alert snapshots,PERMISSIVE,{public},INSERT,null,(bucket_id = 'alert-snapshots'::text)`  
**CSV source**: File 18, line 3  
**Repository evidence**: Alert snapshot uploads use service_role client, but the policy itself doesn't restrict to service_role  
**Proposed replacement**: `- "Service role can upload alert snapshots" — role: **{public}**, INSERT, with_check: bucket_id = 'alert-snapshots'. **Note**: Despite the policy name, this grants INSERT to any role (public). In practice, only service_role uploads because client code uses service_role key. The policy name is misleading.`  
**Confidence**: Certain — policy definition directly from export

---

### G18. `subscriptions` in Missing Migrations — Line 894

**Current doc statement**: `- subscriptions` (in list of tables that "exist in production but have no CREATE TABLE migration")  
**Production evidence**: Tables CSV (`...14.csv`) has no entry for `subscriptions`. The table does NOT exist in production.  
**CSV source**: File 14 (all 27 lines — no subscriptions entry)  
**Repository evidence**: Line 413 of DATABASE.md itself states "DOES NOT EXIST IN PRODUCTION"  
**Proposed replacement**: Remove `subscriptions` from this list entirely  
**Confidence**: Certain — internal contradiction; table doesn't exist

---

### G19. Creation Method Claim — Line 900

**Current doc statement**: `These were created manually via Supabase Dashboard during early development (pre-migration era).`  
**Production evidence**: None — no metadata can prove creation method  
**Repository evidence**: No migrations found, but absence of migration ≠ proof of Dashboard creation  
**Proposed replacement**: `No CREATE TABLE migration was found in the repository for these tables. Their creation method is unknown (possibly Supabase Dashboard, possibly untracked SQL).`  
**Confidence**: Certain — the current claim is unsubstantiated

---

### G20. `device_health` "LEGACY" Label — Line 56, 698, 715

**Current doc statement**: `**LEGACY** — predates split tables` / `LEGACY — kept for historical data`  
**Production evidence**: Table exists with RLS (service_role ALL). No code in src/ queries it.  
**Repository evidence**: `grep -r "device_health" src/` → 0 results. Admin cameras page uses `/api/camera-health/` which queries `camera_health`, NOT `device_health`.  
**Proposed replacement**: `Predates mini_pc_health + camera_health split. No application code currently queries this table (grep verified). Retention reason and current usage not verified — may contain historical data.`  
**Confidence**: High — grep is reliable, but the table could be queried from external systems

---

### G21. `users.subscription_status` "Legacy" Label — Line 89

**Current doc statement**: `| subscription_status | TEXT | YES | — | Legacy status field |`  
**Production evidence**: Column exists (Columns CSV line 331)  
**Repository evidence**: 11 matches across 7 files including `user-cameras/route.ts`, `dashboard/page.tsx`, `admin-get-users/route.ts`, `FootageView.tsx`. Actively read and used for business logic.  
**Proposed replacement**: `| subscription_status | TEXT | YES | — | Subscription state indicator (actively used by multiple routes) |`  
**Confidence**: Certain — grep confirms active usage

---

### G22. `payments.invoice_id_text` "Can be dropped" — Line 884

**Current doc statement**: `| payments | invoice_id_text | Legacy text column from pre-UUID era | Can be dropped |`  
**Production evidence**: View definition CSV (`...15.csv`) line 51: `p.invoice_id_text AS invoice_id`  
**Repository evidence**: `recent_payments` view actively selects this column  
**Proposed replacement**: `| payments | invoice_id_text | Legacy text column from pre-UUID era | **Cannot be dropped** — actively used by recent_payments view |`  
**Confidence**: Certain — view definition proves active dependency

---

### G23. Subscription Functions Behavior — Line 855

**Current doc statement**: `check_subscription_* and find_* functions reference a subscriptions table that does not exist in production — these likely return empty/null results.`  
**Production evidence**: Functions exist (File 16); `subscriptions` table doesn't (File 14)  
**Repository evidence**: `process-trials/route.ts` line 38 calls `.rpc("find_expiring_trials")` and checks `fetchError`. `user-cameras/route.ts` line 57 calls `.from("subscriptions")` and falls back to `recurring_payments` on error/null.  
**Proposed replacement**: `check_subscription_* and find_* functions reference a subscriptions table that does not exist in production. Calling these via .rpc() will produce a PostgreSQL error ("relation 'subscriptions' does not exist"). Application code handles this via error checks and fallback to recurring_payments/users.subscription_active. PostgREST .from("subscriptions") queries return an error (not null), and callers have fallback logic.`  
**Confidence**: High — PostgreSQL behavior with missing relations is deterministic; actual error handling confirmed in code

---

### G24. `item_templates` Full Schema — Lines 575–588

**Current doc statement**: `(inferred) id | UUID | ...` with "Partially Verified" label  
**Production evidence**: Columns CSV lines 139–146:
```
item_templates,id,1,gen_random_uuid(),NO,uuid
item_templates,item_type,2,null,NO,text
item_templates,item_name,3,null,NO,text
item_templates,item_description,4,null,YES,text
item_templates,default_price,5,null,NO,numeric,numeric,null,10,2
item_templates,camera_type,6,null,YES,text
item_templates,is_active,7,true,YES,boolean
item_templates,created_at,8,now(),YES,timestamp with time zone
```
Index CSV line 43: `item_templates,idx_item_templates_type`  
RLS CSV line 32: `Admin full access item_templates, authenticated, ALL, role='admin'`

**CSV source**: File 1 lines 139–146, File 6 line 43–44, File 8 line 32  
**Repository evidence**: `/api/admin/item-templates` GET route selects all columns  
**Proposed replacement**:
```
| id | UUID | NO | PK, gen_random_uuid() |
| item_type | TEXT | NO | Category |
| item_name | TEXT | NO | Template name |
| item_description | TEXT | YES | |
| default_price | NUMERIC(10,2) | NO | Default price |
| camera_type | TEXT | YES | 2MP, 4MP, 5MP |
| is_active | BOOLEAN | YES | Default true |
| created_at | TIMESTAMPTZ | YES | now() |
```
**Verification**: Production Verified  
**Indexes**: `idx_item_templates_type` (item_type)  
**RLS**: Admin full access (authenticated, jwt role='admin')  
**Confidence**: Certain — full metadata available

---

### G25. `vod_files` Missing Indexes — Line 379

**Current doc documents**: `vod_files_user_id_camera_id_timestamp_idx` only  
**Production evidence**: Index CSV lines 91–94:
```
vod_files,vod_files_user_camera_time_idx,"(user_id, camera_id, timestamp DESC)"
vod_files,vod_files_user_email_idx,"(user_email)"
vod_files,vod_files_user_id_camera_id_timestamp_idx,"(user_id, camera_id, timestamp)"
```

**CSV source**: File 6, lines 91–94  
**Repository evidence**: VOD queries filter by user_email (explains user_email index), and by user_id+camera_id+timestamp (both orderings)  
**Proposed replacement**: Add all 3 indexes to the vod_files section:
```
**Indexes**: `vod_files_user_id_camera_id_timestamp_idx` (user_id, camera_id, timestamp), `vod_files_user_camera_time_idx` (user_id, camera_id, timestamp DESC), `vod_files_user_email_idx` (user_email).
```
**Confidence**: Certain — direct from index CSV

---

### G26. `admin_notifications` Missing FKs — Lines 660–674

**Current doc statement**: No FKs documented  
**Production evidence**: FK CSV lines 2–4 (shown in G5 above)  
**CSV source**: File 3, lines 2–4  
**Repository evidence**: Admin notification routes pass `customer_id`, `camera_id`, `mini_pc_id`  
**Proposed replacement**: Add FK section:
```
**FKs**:
- admin_notifications_customer_id_fkey → users.id (ON DELETE CASCADE)
- admin_notifications_camera_id_fkey → cameras.id (ON DELETE CASCADE)
- admin_notifications_mini_pc_id_fkey → mini_pcs.id (ON DELETE CASCADE)
```
**Confidence**: Certain — FK CSV is authoritative

---

### G27. `invoice_items.created_at` and Index — Lines 553–572

**Current doc statement**: No `created_at` column listed; no index documented  
**Production evidence**: Columns CSV line 110: `invoice_items,created_at,11,now(),YES,timestamp with time zone`. Index CSV line 28: `idx_invoice_items_invoice_id`  
**CSV source**: File 1 line 110, File 6 line 28  
**Proposed replacement**: Add `| created_at | TIMESTAMPTZ | YES | now() |` to column table; add `idx_invoice_items_invoice_id` to indexes  
**Confidence**: Certain

---

### G28. `vod_files` FK Delete Rules — Line 377

**Current doc statement**: FKs mentioned informally without constraint names or rules  
**Production evidence**: FK CSV lines 32–33:
```
vod_files,camera_id,vod_files_camera_id_fkey,public,cameras,id,NO ACTION,CASCADE
vod_files,user_id,vod_files_user_id_fkey,public,users,id,NO ACTION,NO ACTION
```

**CSV source**: File 3, lines 32–33  
**Proposed replacement**:
```
**FKs**:
- vod_files_camera_id_fkey → cameras.id (ON UPDATE NO ACTION, ON DELETE CASCADE)
- vod_files_user_id_fkey → users.id (ON UPDATE NO ACTION, ON DELETE NO ACTION)
```
**Confidence**: Certain

---

### G29. Verification Labels Upgrade

| Table | Current Label | Proposed Label | Evidence |
|-------|--------------|----------------|----------|
| `item_templates` | Partially Verified | Production Verified | Full CSV metadata available |
| `vod_files` | Partially Verified | Production Verified | Full CSV metadata available |
| `invoice_items` | "Verified — code insert + RLS" | Production Verified | Full CSV metadata available |

**Confidence**: Certain — metadata proves production existence with complete schema

---

### G30. `supportuploads` Bucket Security Flag — Line 864

**Current doc statement**: `| supportuploads | YES | None | None (any) | Support ticket file attachments |`  
**Production evidence**: Bucket CSV (`...17.csv`) line 3: `supportuploads,supportuploads,true,null,null`. Storage policies CSV (`...18.csv`): NO policies reference `supportuploads` bucket.  
**CSV source**: File 17 line 3, File 18 (3 policies, all for alert-snapshots only)  
**Repository evidence**: Support upload feature uses this bucket via service_role client  
**Proposed replacement**:
```
| `supportuploads` | YES (public) | No limit | Any MIME | Support ticket attachments |
```
Add note: `**Security concern**: No storage RLS policies exist for this bucket. Access depends entirely on service_role usage by application code. No size limit and no MIME type restriction. Public visibility means files are URL-accessible without authentication once the path is known.`  
**Confidence**: Certain — absence of policies confirmed

---

### G-Extra: `mini_pcs.installed_at` Default — Line 139

**Current doc statement**: `| installed_at | TIMESTAMPTZ | YES | — | Installation date |`  
**Production evidence**: Columns CSV line 190: `mini_pcs,installed_at,7,now(),YES,timestamp with time zone`  
**CSV source**: File 1, line 190  
**Proposed replacement**: `| installed_at | TIMESTAMPTZ | YES | now() | Installation date |`  
**Confidence**: Certain

---

### G-Extra: `mini_pcs.is_active` Default — Line 141

**Current doc statement**: `| is_active | BOOLEAN | YES | — | Active flag |`  
**Production evidence**: Columns CSV line 192: `mini_pcs,is_active,9,true,YES,boolean`  
**CSV source**: File 1, line 192  
**Proposed replacement**: `| is_active | BOOLEAN | YES | true | Active flag |`  
**Confidence**: Certain

---

## H. Remaining Unknowns — Categorized by Resolution Method

### H1. Resolvable via Read-Only Supabase Metadata Queries

These can be answered by running safe, read-only SQL against the production database (no mutation, no behavior change).

| # | Unknown | Current State | Required Query | Expected Output |
|---|---------|--------------|----------------|-----------------|
| H1.1 | `recurring_payments.user_id` FK existence | FK CSV doesn't list it; doc claims it exists | `SELECT conname, contype, confrelid::regclass FROM pg_constraint WHERE conrelid = 'recurring_payments'::regclass AND contype = 'f';` | Either confirms FK exists (CSV export limitation) or confirms it truly doesn't exist |
| H1.2 | View `security_invoker` status | Doc claims both views use `security_invoker = true`; no CSV column confirms | `SELECT viewname, definition FROM pg_views WHERE schemaname = 'public';` and check for `security_invoker` in view options: `SELECT relname, reloptions FROM pg_class WHERE relname IN ('recent_payments', 'admin_monitoring_hierarchy');` | Returns view options array — either contains `security_invoker=true` or not |
| H1.3 | Triggers: complete assignment map | Doc lists trigger functions but doesn't map which tables have which triggers | `SELECT trigger_name, event_object_table, action_timing, event_manipulation, action_statement FROM information_schema.triggers WHERE trigger_schema = 'public';` | Full trigger-to-table map |
| H1.4 | `device_health` row count and last update | Unknown if table has any data or when last written | `SELECT count(*), max(last_checked) FROM device_health;` | Shows if table is actively receiving data or is truly dormant |
| H1.5 | `invoice_number_counters` usage | No code references; `generate_invoice_number()` may use it | `SELECT prosrc FROM pg_proc WHERE proname = 'generate_invoice_number';` | Function body reveals which counter table it queries |
| H1.6 | Storage RLS enforcement on `supportuploads` | No policies exist; behavior depends on whether storage.objects RLS is enforced vs bucket public flag | `SELECT id, name, public FROM storage.buckets WHERE name = 'supportuploads';` and `SELECT relrowsecurity FROM pg_class WHERE relname = 'objects' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'storage');` | Confirms if RLS is even enabled on storage.objects, and whether public=true bypasses it |

---

### H2. Resolvable via Repository/Code Investigation

These can be answered by deeper examination of application source code, without touching production.

| # | Unknown | Current State | Required Investigation | Where to Look |
|---|---------|--------------|----------------------|---------------|
| H2.1 | `system_settings.setting_type` default | CSV shows `column_default=null`; doc claims `'string'` | Check if application code always provides `setting_type` on insert, making the default moot | `grep -r "system_settings" src/ --include="*.ts"` — examine INSERT calls |
| H2.2 | `admin_monitoring_hierarchy` view usage | View exists in production; no grep match in src/ | Check if queried from external admin tools, Supabase Dashboard direct queries, or Retool/admin panels | `grep -r "admin_monitoring" src/` (already done: 0 results). Check if Supabase Dashboard SQL editor history references it (requires human check) |
| H2.3 | `cameras.user_email` migration path | Doc says "should be removed after code migration" but 5+ code paths depend on it | Count all code paths using `user_email` and determine if migration is feasible | `grep -r "user_email" src/ --include="*.ts" --include="*.tsx"` — count results and assess if all could use `mini_pc_id` join instead |

---

### H3. Resolvable via Production Behavior Testing

These require executing operations against the running application to observe behavior. **These are destructive-read or state-observing operations that go beyond pure metadata.**

| # | Unknown | Current State | Required Test | Risk Level |
|---|---------|--------------|---------------|------------|
| H3.1 | `subscriptions` functions — error vs empty | Doc says "likely return empty/null"; code has error handlers | Execute `.rpc("find_expiring_trials")` via Supabase client or API and observe response | **Low risk** — read-only function call; will either error or return data. No mutation. |
| H3.2 | `.from("subscriptions")` PostgREST behavior | Code queries non-existent table and has fallback logic | Make a test API call to an endpoint that hits this path (e.g., `/api/user-cameras`) | **Low risk** — read-only request with existing auth. Observe whether PostgREST returns 404, empty array, or error object. |

---

### H4. Requires Human Architectural/Business Decision

These cannot be resolved by any technical investigation. They require a product owner or engineering lead to make a judgment call.

| # | Unknown | Context | Decision Required |
|---|---------|---------|-------------------|
| H4.1 | `device_health` — keep or drop? | Table predates split. No code queries it. May have historical data. RLS allows service_role only. | **Decision**: Should this table be dropped, preserved as archive, or migrated into a time-series format? |
| H4.2 | `invoice_number_counters` — keep or drop? | Superseded by `document_number_counters`. `generate_invoice_number()` function exists but may reference it. | **Decision**: After verifying function body (H1.5), decide whether to drop table and function or keep as fallback. |
| H4.3 | `subscriptions` table — create or remove references? | Table doesn't exist but 12+ code paths reference it. Functions query it. Cron jobs call `.rpc()` targeting it. | **Decision**: Either (a) create the `subscriptions` table in production to match code expectations, (b) remove all code references and dead functions, or (c) document as intentional ghost with fallback pattern. |
| H4.4 | `recurring_payments.user_id` FK — add or document absence? | FK may have been dropped intentionally or accidentally. Column exists and is NOT NULL. | **Decision**: After verifying via H1.1, if FK truly doesn't exist: (a) add it via migration, or (b) document that referential integrity relies on application logic only. |
| H4.5 | `supportuploads` bucket security — tighten or accept? | Public bucket, no RLS policies, no size/MIME limits. Any URL-guessable path is accessible. | **Decision**: Is this acceptable for support ticket attachments (which may contain PII/screenshots)? Should policies be added? |
| H4.6 | "Legacy" label policy | Multiple fields labeled "legacy" are actively used. What threshold defines "legacy"? | **Decision**: Define criteria for when a field/table earns the "legacy" label — e.g., "no code references AND superseded by newer equivalent AND product owner approves removal plan." |
| H4.7 | `cameras.user_id` / `cameras.user_email` deprecation timeline | Denormalized but critical for current RLS and 5+ code paths | **Decision**: Is there a planned migration to use `mini_pc_id` joins exclusively? If so, when? If not, remove "should be removed" language from docs. |

---

### Resolution Priority

1. **Run H1 queries first** — these are safe, read-only, and will resolve 6 unknowns immediately
2. **Complete H2 code investigation** — can be done in parallel with H1
3. **H3 behavior tests** — low risk but lower priority; the PostgreSQL behavior for missing tables is well-known
4. **H4 decisions** — block on human review; cannot be automated

---

## I. Final Confidence Assessment

### Current Confidence: **62%** (down from previously claimed ~85%)

**Reason for downgrade**: This review found:
- **3 phantom columns** that don't exist in production (metadata, notes, camera_count)
- **3 missing columns** (admin_notifications FK columns)
- **1 initially-missing FK** (recurring_payments.user_id — resolved: exists as cross-schema FK to `auth.users`, missed by CSV export filter)
- **2 completely wrong FK rules** (mini_pcs, payments)
- **~20 nullability errors** across multiple tables
- **~12 type errors** (INTEGER vs NUMERIC, TEXT vs VARCHAR, REAL vs INTEGER, UUID vs VARCHAR)
- **1 authentication claim** with zero evidence (magic link)
- **1 misleading storage policy** characterization
- **2 phantom columns** (support_requests.updated_at, subscription_requests notes/camera_count)
- **Incorrect behavioral claim** about what happens when querying non-existent table

### After Corrections (Applied 2026-07-17): **97%+**

All items from the "remaining 8%" have been resolved:
- ✅ `recurring_payments.user_id` FK confirmed via live `pg_constraint` query → `auth.users.id`
- ✅ View `security_invoker` confirmed via `pg_class.reloptions`
- ✅ Trigger map documented (4 triggers)
- ✅ `supportuploads` access model documented with security note
- ✅ All "legacy" labels replaced with factual descriptions

**Remaining unknowns** (documented in DATABASE.md §14):
- `device_health` retention decision (human decision pending)
- `subscriptions` ghost table strategy (human decision pending)
- `supportuploads` security tightening (human decision pending)

### Summary

The document's **table inventory, RLS enabled status, function signatures, CHECK constraints, view definitions, and bucket metadata** are largely correct. The main systemic failure is in **FK delete/update rules**, **column nullability**, and **data types** — areas where the previous edit session appears to have mixed up production metadata with migration-code expectations. The phantom columns suggest some edits were applied from code inference rather than strictly from the CSV exports.

---

*Report generated from: 13 production CSV metadata exports + full repository grep analysis*

# Security Model — Clearpoint Security

<!--
purpose: Document the authentication model, authorization patterns, trust boundaries, and known security considerations
audience: All engineers, security reviewers, AI assistants
when_to_read: Before making any auth, access control, or data exposure changes
prerequisites: SYSTEM_ARCHITECTURE.md, API_REFERENCE.md, DATABASE.md
related_docs:
  - API_REFERENCE.md (endpoint auth requirements)
  - DATABASE.md (RLS policies, storage policies)
  - SYSTEM_ARCHITECTURE.md (trust boundary diagram)
source_of_truth_for: Authentication flows, authorization model, trust boundaries, security considerations
confidence: Verified — traced from source code and production metadata
last_verified: 2026-07-17
owner: Engineering Lead
-->

---

## 1. Authentication Architecture

### 1.1 Identity Provider

**Supabase Auth** is the sole identity provider.

- User accounts created in `auth.users` (Supabase-managed schema)
- Public-facing `users` table in `public` schema mirrors identity with application fields
- Password-based authentication only (email + password)
- No magic link, OAuth, or social login configured

### 1.2 Session Management — NextAuth

**NextAuth v4** with `CredentialsProvider` wraps Supabase Auth for the web application.

```
Login Flow:
Browser → NextAuth → Supabase Auth API (/auth/v1/token?grant_type=password)
       ← JWT session cookie (contains: id, email, role, access_token)
```

**Implementation**: `src/app/api/auth/[...nextauth]/route.ts`

| Property | Value |
|----------|-------|
| Provider | `CredentialsProvider` |
| Session strategy | JWT (cookie-based) |
| Secret | `NEXTAUTH_SECRET` env var |
| Login page | `/login` |
| Token contents | `id`, `email`, `role`, `access_token` |

### 1.3 Role Model

Two roles exist:

| Role | Stored in | Access |
|------|-----------|--------|
| `admin` | `users.role = 'admin'` | Full CRUD, all data, all admin routes |
| Customer (default) | `users.role = ''` or NULL | Own data only, subscription-gated features |

Role is fetched from `public.users` during login and embedded in the JWT. The middleware checks `token.role` for route protection.

---

## 2. Authorization Layers

### 2.1 Layer 1 — Middleware (Route Protection)

**File**: `src/middleware.ts`

| Path Pattern | Requirement |
|--------------|-------------|
| `/dashboard/*` | Authenticated (any role) |
| `/admin/*` | Authenticated + `role === 'admin'` |
| `/dashboard/` (camera views) | Authenticated + active subscription (checked via internal API call) |
| `/dashboard/subscription`, `/dashboard/invoices`, `/dashboard/support` | Authenticated only (no subscription required) |

### 2.2 Layer 2 — API Route Guards

Every API route independently verifies auth:

```typescript
// User routes:
const session = await getServerSession(authOptions);
if (!session?.user?.email) return 401;

// Admin routes:
if (!session || session.user.role !== 'admin') return 403;

// Ingest routes:
const token = req.headers.get("x-clearpoint-device-token");
if (!token) return 401;
// → SHA-256 hash → lookup in mini_pc_tokens → verify not revoked
```

### 2.3 Layer 3 — Row-Level Security (Database)

RLS policies enforce data isolation at the PostgreSQL level:

| Pattern | Tables | Mechanism |
|---------|--------|-----------|
| User sees own | cameras, alerts, alert_rules, vod_files | `user_id = auth.uid()` or `user_email = jwt.email` |
| Admin sees all | All tables with admin policies | `auth.role() = 'service_role'` or `role = 'admin'` join |
| Service only | system_settings, system_logs, mini_pc_tokens | `auth.role() = 'service_role'` |
| Public read | plans | Two policies: `public` + `authenticated` SELECT |

**Critical note**: Most API routes use `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS entirely). RLS serves as a defense-in-depth layer, not the primary authorization mechanism.

---

## 3. Device Authentication (Mini PC → Cloud)

### 3.1 Device Token Model

Edge devices (Mini PCs) authenticate to ingest endpoints using bearer-style device tokens.

```
Device Token Flow:
1. Admin creates token via /api/admin/mini-pc-tokens/create
2. Server generates 32 random bytes → hex string (64 chars)
3. SHA-256 hash stored in mini_pc_tokens table
4. Raw token returned once to admin (never stored on server)
5. Token installed on device (environment variable)
6. Device sends: x-clearpoint-device-token: <raw-token>
7. Server hashes incoming token, looks up in DB
8. Validates: exists + not revoked + resolves mini_pc_id
```

### 3.2 Token Lifecycle

| Event | Action |
|-------|--------|
| Creation | Previous active token for same mini_pc is revoked (`revoked_at` set) |
| Rotation | Admin creates new token → old one auto-revoked |
| Usage | `last_used_at` updated on each API call |
| Revocation | Manual or via new token creation |

**Constraint**: `mini_pc_tokens_one_active_per_mini_pc` — partial unique index on `(mini_pc_id) WHERE revoked_at IS NULL` ensures only one active token per device.

### 3.3 Token Scope

A valid device token grants access to:
- Report health for the token's `mini_pc_id` and its cameras
- Submit VOD file metadata for cameras belonging to that mini_pc
- Submit AI detection alerts for cameras belonging to that mini_pc
- Submit system log entries tagged with that mini_pc

A device token does NOT grant:
- Access to any other mini_pc's data
- Admin operations
- User session creation
- Direct database access

---

## 4. Trust Boundaries

```
┌─────────────────────────────────────────────────────────┐
│                    INTERNET (Untrusted)                   │
└────────────┬───────────────────────────────┬─────────────┘
             │                               │
             ▼                               ▼
┌────────────────────────┐     ┌────────────────────────────┐
│  Browser (Customer)    │     │  Mini PC (On-premises)      │
│  Auth: NextAuth cookie │     │  Auth: Device token         │
│  Access: Own data only │     │  Access: Ingest endpoints   │
└────────────┬───────────┘     └────────────┬───────────────┘
             │                               │
             ▼                               ▼
┌──────────────────────────────────────────────────────────┐
│              Vercel (Next.js Application)                  │
│                                                           │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐ │
│  │ User Routes │  │Admin Routes │  │ Ingest Routes    │ │
│  │ Session+RLS │  │ Session+Role│  │ Token+Service    │ │
│  └──────┬──────┘  └──────┬──────┘  └────────┬─────────┘ │
│         │                 │                   │           │
│         ▼                 ▼                   ▼           │
│  ┌───────────────────────────────────────────────────┐   │
│  │         SUPABASE_SERVICE_ROLE_KEY                  │   │
│  │         (Bypasses all RLS)                         │   │
│  └───────────────────────────────┬───────────────────┘   │
└──────────────────────────────────┼───────────────────────┘
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────┐
│              Supabase (PostgreSQL + Auth + Storage)        │
│  ┌─────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │auth.users│  │public tables│  │ storage.objects     │  │
│  │(identity)│  │  (+ RLS)    │  │ (alert-snapshots,   │  │
│  └─────────┘  └─────────────┘  │  supportuploads)    │  │
│                                  └─────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

### Key Trust Decisions

1. **Service role on Vercel**: The `SUPABASE_SERVICE_ROLE_KEY` exists only on Vercel (server-side). It never reaches the browser or device.
2. **No service role on device**: Mini PCs use device tokens, NOT the service role key. This was a deliberate security improvement (see `docs/design/installer-v2.md`).
3. **RLS as defense-in-depth**: Since most routes use service_role, RLS primarily protects against:
   - Direct Supabase Dashboard/client misuse
   - Bugs in route handler authorization logic
   - Future client-side Supabase SDK usage

---

## 5. Webhook Security

### PayPlus Webhook Verification

**Endpoint**: `POST /api/webhooks/payplus`

```typescript
// Verification method:
const receivedHash = req.headers.get('hash');
const userAgent = req.headers.get('user-agent');
verifyWebhookSignature(payload, receivedHash, userAgent);
```

The `verifyWebhookSignature` function (in `src/lib/payplus.ts`) validates that the webhook originated from PayPlus using a shared secret.

---

## 6. Storage Security

### 6.1 `alert-snapshots` Bucket

| Property | Value |
|----------|-------|
| Public | YES |
| File limit | 1MB |
| MIME types | `image/jpeg`, `image/png`, `image/webp` |
| Upload policy | `public` role (misleading name — actually means service_role-mediated) |
| Read policy | Public read (anyone with URL) |
| User isolation | Folder structure: `{user_id}/{filename}` |

**Risk**: URLs are guessable if user_id is known. Images contain AI detection snapshots (security camera frames).  
**Mitigation**: UUIDs in path make brute-force impractical.

### 6.2 `supportuploads` Bucket

| Property | Value |
|----------|-------|
| Public | **YES** |
| File limit | None |
| MIME types | None (any file accepted) |
| Storage policies | **None** |
| Upload method | Service role only (no INSERT policy for users) |

**⚠️ SECURITY CONCERN**: This bucket has NO access restrictions beyond URL knowledge. Support ticket attachments (screenshots, potentially containing PII) are accessible to anyone who knows or guesses the URL. No size or type limits exist.

**Recommended mitigations** (not implemented):
- Set bucket to private
- Add signed URL generation for downloads
- Add file size limit (e.g., 10MB)
- Restrict MIME types to images/documents

---

## 7. Secrets & Environment Variables

### Server-Side Only (Vercel)

| Variable | Purpose |
|----------|---------|
| `SUPABASE_SERVICE_ROLE_KEY` | Full DB access (bypasses RLS) |
| `NEXTAUTH_SECRET` | JWT signing for sessions |
| `PAYPLUS_SECRET_KEY` | PayPlus API authentication |
| `PAYPLUS_WEBHOOK_SECRET` | Webhook signature verification |
| `BUNNY_TOKEN_KEY` | CDN signed URL generation |

### Public (Exposed to Browser)

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key (RLS-limited) |
| `NEXT_PUBLIC_BASE_URL` | Application base URL |

### Device (Mini PC)

| Variable | Purpose |
|----------|---------|
| `CLEARPOINT_DEVICE_TOKEN` | Device auth token (raw, 64 hex chars) |
| `CLEARPOINT_API_URL` | Cloud API base URL |

---

## 8. Known Security Considerations

### 8.1 Active Risks

| Risk | Severity | Status |
|------|----------|--------|
| `supportuploads` public bucket with no policies | Medium | Open — awaiting decision |
| Cron endpoints have no auth | Low | Mitigated by Vercel Cron secrets (not verified in code) |
| Service role used in all routes | Low | By design — RLS is defense-in-depth |
| JWT contains Supabase `access_token` | Low | Token is server-side only, embedded in cookie |

### 8.2 Mitigated Risks

| Risk | Mitigation |
|------|------------|
| Service role on Mini PC | **Resolved** — replaced with device token model |
| Device token theft | Token rotation (admin creates new → old revoked), one active per device |
| Admin route access by customer | Middleware + route-level role check (double enforcement) |
| Cross-customer data access | RLS policies + `user_id` checks in every route handler |
| PayPlus webhook spoofing | Signature verification via shared secret |

### 8.3 Architecture Security Properties

- **No client-side Supabase mutations**: All writes go through Next.js API routes (server-validated)
- **No direct database exposure**: `anon_key` exists in client but no client-side Supabase SDK queries are made against production data
- **Token never stored on server**: Device tokens are hashed with SHA-256 before storage; only the hash is in the database
- **Single admin account**: Currently one admin user. No role hierarchy or permissions matrix beyond admin/customer
- **No audit log**: Mutations are not logged. Only `system_logs` exists (for device operational events, not security audit)

---

## 9. Authentication Sequence Diagrams

### 9.1 User Login

```
Browser          NextAuth          Supabase Auth       public.users
   │                │                    │                  │
   │─── POST /login─▶                   │                  │
   │                │── POST /auth/v1/token ─▶             │
   │                │◀── { access_token, user } ──         │
   │                │                    │                  │
   │                │── SELECT role WHERE email=? ────────▶│
   │                │◀── { role: 'admin' | '' } ──────────│
   │                │                    │                  │
   │◀── Set-Cookie: next-auth.session ──│                  │
   │    (JWT: id, email, role)          │                  │
```

### 9.2 Device Ingest

```
Mini PC                 Next.js API           mini_pc_tokens        Target Table
   │                       │                       │                     │
   │── POST /ingest/*  ───▶│                       │                     │
   │   x-clearpoint-device-token: abc123           │                     │
   │                       │                       │                     │
   │                       │── sha256(abc123) ─────▶                     │
   │                       │◀── { mini_pc_id, revoked_at: null } ──     │
   │                       │                       │                     │
   │                       │── UPDATE last_used_at ▶                     │
   │                       │                       │                     │
   │                       │── UPSERT health data ─────────────────────▶│
   │                       │                       │                     │
   │◀── 200 OK ───────────│                       │                     │
```

---

*Document verified against source code on 2026-07-17.*

# Engineering Guidelines — Clearpoint Security

<!--
purpose: Document code conventions, architecture patterns, and development standards
audience: All engineers, AI assistants
when_to_read: Before writing or reviewing code in this project
prerequisites: None
related_docs:
  - TECHNICAL_DEBT.md (known deviations from guidelines)
  - API_REFERENCE.md (API structure)
  - SECURITY.md (auth patterns)
source_of_truth_for: Code conventions, project patterns, development workflow
confidence: Descriptive — documents actual patterns in use (not aspirational)
last_verified: 2026-07-18
owner: Engineering Lead
-->

---

## 1. Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Framework** | Next.js (App Router) | 15.3.x |
| **Language** | TypeScript | 5.x |
| **React** | React | 19.x |
| **Auth** | NextAuth v4 + Supabase Auth | 4.24.x |
| **Database** | Supabase (PostgreSQL) | supabase-js 2.49.x |
| **Styling** | Tailwind CSS v4 | 4.1.x |
| **Icons** | Lucide React | 0.503.x |
| **Payments** | PayPlus API | Custom integration |
| **Email** | Resend | 4.7.x |
| **Hosting** | Vercel | — |
| **Storage** | Supabase Storage + BunnyCDN | — |

---

## 2. Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes (serverless functions)
│   │   ├── admin/         # Admin-only endpoints (RESTful, nested)
│   │   ├── cron/          # Scheduled jobs
│   │   ├── ingest/        # Device-to-cloud endpoints
│   │   ├── webhooks/      # External service callbacks
│   │   ├── public/        # Unauthenticated endpoints
│   │   └── user*/         # User-facing endpoints
│   ├── admin/             # Admin dashboard pages
│   ├── dashboard/         # Customer dashboard pages
│   └── (public pages)     # Login, subscribe, etc.
├── components/            # Shared React components
├── lib/                   # Shared utilities & integrations
│   ├── supabaseAdmin.ts   # Server-side Supabase (service role)
│   ├── supabaseClient.ts  # Client-side Supabase (anon key)
│   ├── payplus.ts         # PayPlus API functions
│   ├── payplusClient.ts   # PayPlus client class
│   ├── device-auth.ts     # Device token validation (shared)
│   ├── rate-limit.ts      # In-memory rate limiter
│   ├── notifications.ts   # Email/WhatsApp sending
│   ├── logger.ts          # System logging utility
│   ├── email-service.ts   # Email templates
│   └── utils.ts           # General utilities
├── types/
│   └── api.ts             # Shared API response types
├── middleware/            # (Unused — middleware.ts is at src root)
└── scripts/               # Server-side scripts
```

---

## 3. API Route Conventions

### 3.1 Standard Response Format

All API routes return JSON with a consistent structure:

```typescript
// Success
{ success: true, data: {...} }
{ success: true, plans: [...] }
{ success: true, rules: [...] }

// Error
{ success: false, error: "Human-readable message" }
{ error: "Short message" }  // Some older routes
```

**Status codes used**:
| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Bad request / validation error |
| 401 | Unauthorized (not authenticated) |
| 403 | Forbidden (wrong role / revoked token) |
| 404 | Resource not found |
| 429 | Rate limit exceeded |
| 500 | Server error |

### 3.2 Route File Pattern

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export const dynamic = 'force-dynamic';  // Required for all API routes

export async function POST(req: NextRequest) {
  try {
    // 1. Auth check
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    // 2. Parse body
    const body = await req.json();

    // 3. Validate
    if (!body.requiredField) {
      return NextResponse.json({ success: false, error: "Missing field" }, { status: 400 });
    }

    // 4. Create Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 5. Business logic
    const { data, error } = await supabase.from("table").select("*");

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // 6. Return success
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error("❌ Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
```

### 3.3 Auth Patterns by Route Type

| Type | Auth Check | Example |
|------|-----------|---------|
| Admin | `session.user.role !== "admin"` → 403 | `/api/admin/*` |
| User | `!session?.user?.email` → 401 | `/api/user-plan` |
| Device | `x-clearpoint-device-token` header → `validateDeviceToken()` | `/api/ingest/*` |
| Public | None | `/api/public/*` |
| Webhook | Signature verification (hash header) | `/api/webhooks/*` |
| Cron | `CRON_SECRET` header check | `/api/cron/*` |

---

## 4. Supabase Client Usage

### 4.1 Server-Side (API Routes)

**Pattern A: Inline creation (most common)**:
```typescript
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
```

**Pattern B: Shared singleton (recommended for new code)**:
```typescript
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
const supabase = getSupabaseAdmin();
```

> ⚠️ Most routes use Pattern A (inline). This is technical debt — prefer Pattern B for new code.

### 4.2 Client-Side (React Components)

```typescript
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
const supabase = createClientComponentClient();
```

### 4.3 Query Conventions

```typescript
// Single record (throws PGRST116 if not found)
const { data, error } = await supabase.from("table").select("*").eq("id", id).single();

// Optional single record (returns null if not found)
const { data, error } = await supabase.from("table").select("*").eq("id", id).maybeSingle();

// Joins (PostgREST syntax)
const { data } = await supabase.from("cameras").select(`
  id, name,
  user:users!cameras_user_id_fkey(full_name, email)
`);
```

---

## 5. TypeScript Conventions

### 5.1 Type Definitions

- **Local types**: Defined at top of file with `type` keyword
- **No shared types file**: Types are co-located with their usage
- **Inline generics**: Used with Supabase `.single<Type>()`
- **`any` usage**: Frequent (technical debt) — especially in API routes

```typescript
// Current pattern (local types)
type Plan = {
  name: string;
  monthly_price: number;
  retention_days: number;
};

// Supabase typed query
const { data } = await supabase.from("users").select("*").single<UserWithPlan>();
```

### 5.2 Strict Mode

TypeScript strict mode is enabled (`"strict": true`). However, heavy use of `any` and non-null assertions (`!`) reduces its effectiveness.

### 5.3 Path Aliases

```typescript
import { something } from "@/lib/module";  // → src/lib/module
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
```

---

## 6. React Component Patterns

### 6.1 Page Components (App Router)

```typescript
// Client component (interactive pages)
"use client";
export const dynamic = 'force-dynamic';
export default function PageName() { ... }

// Server component (static pages) — rare in this project
export default async function PageName() { ... }
```

### 6.2 State Management

- **No global state library** (no Redux, Zustand, etc.)
- State lives in page components via `useState`
- Data fetching via `useEffect` + `fetch` to internal APIs
- No SWR or React Query

### 6.3 UI Patterns

| Pattern | Implementation |
|---------|---------------|
| Layout | RTL (`dir="rtl"`) throughout |
| Language | Hebrew UI, English code/comments (mixed) |
| Styling | Tailwind utility classes inline |
| Icons | Lucide React |
| Loading | Inline spinner (`animate-spin`) |
| Alerts | `alert()` (browser native) for admin actions |
| Forms | Controlled inputs with useState |
| Tables | Custom div-based tables (not `<table>`) |

---

## 7. Naming Conventions

| Item | Convention | Example |
|------|-----------|---------|
| Files (pages) | `page.tsx` (Next.js convention) | `src/app/admin/cameras/page.tsx` |
| Files (components) | PascalCase | `CamerasTable.tsx` |
| Files (API routes) | `route.ts` | `src/app/api/plans/route.ts` |
| Files (libraries) | camelCase | `payplusClient.ts` |
| Variables | camelCase | `customerUid`, `planId` |
| Constants | UPPER_SNAKE_CASE | `PAYPLUS_CONFIG`, `EXTRA_CAMERA_PRICE` |
| Types/Interfaces | PascalCase | `Plan`, `UserWithPlan` |
| DB columns | snake_case | `user_id`, `created_at` |
| API paths | kebab-case | `/api/admin-create-camera` |
| React components | PascalCase | `NewCameraPageClient` |
| Env vars | UPPER_SNAKE_CASE | `SUPABASE_SERVICE_ROLE_KEY` |

---

## 8. Logging Conventions

### 8.1 Console Logging (API Routes)

Emoji-prefixed logging used throughout:

| Emoji | Meaning |
|-------|---------|
| ✅ | Success |
| ❌ | Error |
| 🔍 | Debug / searching |
| 🔵 | Info / creating |
| 📤 | Outgoing request |
| 📥 | Incoming response |
| ⚠️ | Warning |
| 🧪 | Test/mock mode |
| 🔐 | Auth/security |
| 📊 | Metrics/data |

### 8.2 System Logging (Database)

For structured logging to `system_logs` table:
```typescript
import { logger } from "@/lib/logger";
await logger.info("Message", { metadata });
await logger.error("Error message", { error: err.message });
```

---

## 9. Error Handling

### 9.1 API Routes

```typescript
// Pattern: try/catch wrapper with typed error
try {
  // ... business logic
} catch (err: any) {
  console.error("❌ Context:", err);
  return NextResponse.json(
    { success: false, error: err.message || "Unknown error" },
    { status: 500 }
  );
}
```

### 9.2 Supabase Errors

```typescript
const { data, error } = await supabase.from("table").select("*");
if (error) {
  // PGRST116 = "no rows returned" from .single()
  if (error.code === "PGRST116") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ success: false, error: error.message }, { status: 500 });
}
```

### 9.3 Client-Side

```typescript
try {
  const res = await fetch("/api/endpoint", { method: "POST", ... });
  const result = await res.json();
  if (!result.success) {
    alert("❌ שגיאה: " + result.error);  // Hebrew error display
  }
} catch (error) {
  console.error("Failed:", error);
  alert("שגיאה בלתי צפויה");
}
```

---

## 10. Development Workflow

### 10.1 Running Locally

```bash
npm run dev          # Start Next.js dev server (port 3000)
```

### 10.2 Environment Setup

Required `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000
PAYPLUS_USE_MOCK=true           # Use mock payments locally
```

### 10.3 Deployment

- **Platform**: Vercel (auto-deploys from main branch)
- **Build**: `next build` (standard Next.js)
- **No CI/CD pipeline** beyond Vercel's built-in
- **No staging environment** (dev → production directly)
- **No automated tests**

### 10.4 Database Migrations

Schema changes are documented in `supabase/migrations/`. See `supabase/README.md` for workflow.

```bash
# After making manual DB changes in Supabase Dashboard:
1. Create a new file: supabase/migrations/YYYYMMDD_description.sql
2. Document the SQL that was run
3. Commit and push
```

### 10.5 Device Auth & Rate Limiting

**Device token validation** is centralized in `src/lib/device-auth.ts`:
```typescript
import { validateDeviceToken } from "@/lib/device-auth";
const miniPcId = await validateDeviceToken(supabase, token);
```

**Rate limiting** is applied to all ingest routes via `src/lib/rate-limit.ts`:
```typescript
import { checkRateLimit, INGEST_LIMIT } from "@/lib/rate-limit";
const rl = checkRateLimit(`prefix:${sha256Hex(token)}`, INGEST_LIMIT);
if (!rl.allowed) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
```

Preset configs: `INGEST_LIMIT` (60/min), `ALERT_LIMIT` (30/min), `VOD_UPLOAD_LIMIT` (10/min), `ADMIN_LIMIT` (100/min).

---

## 11. Key Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| App Router (not Pages) | Modern Next.js, better layouts |
| NextAuth v4 (not v5) | Stability; v5 was unstable at project start |
| Service Role Key in backend | All API routes use service_role; RLS protects direct client access |
| No ORM | PostgREST via Supabase JS is sufficient |
| Shared types in `src/types/` | `api.ts` defines common response shapes |
| Hebrew UI / English code | Business is in Israel; developer is English-literate |
| `dynamic = 'force-dynamic'` on all routes | Prevent caching issues with auth/data |
| Inline Supabase client per route | Historical; should migrate to singleton |
| PayPlus mock mode | Allows local development without payment sandbox |

---

## 12. Code Review Checklist

When reviewing or writing new code:

- [ ] `export const dynamic = 'force-dynamic'` on all API routes
- [ ] Auth check present (session / device token / admin role)
- [ ] Supabase errors checked (`if (error)` after every query)
- [ ] Try/catch around entire route handler
- [ ] Response includes `success: true/false`
- [ ] No hardcoded secrets
- [ ] Console logging uses emoji prefix
- [ ] Hebrew strings for user-facing, English for logs/comments
- [ ] `maybeSingle()` when record might not exist (not `.single()`)
- [ ] No `any` without justification (aspirational — currently not enforced)

---

## 13. Known Anti-Patterns (Do Not Replicate)

| Pattern | Where | Why Bad | What To Do Instead |
|---------|-------|---------|-------------------|
| Inline Supabase client creation | ~60 routes | Memory waste, no singleton | Use `getSupabaseAdmin()` |
| `alert()` for success/error | Admin UI | Poor UX | Use toast notifications |
| ~~Flat admin API routes (`/api/admin-*`)~~ | ~~12 routes~~ | ✅ Fixed 2026-07-18 | Migrated to `/api/admin/users`, `/cameras`, `/support` |
| `any` types | Throughout | Defeats TypeScript | Define proper interfaces |
| Emoji in variable names (comments OK) | Some routes | Code readability | Remove from logic |
| ~~Duplicate `sha256Hex` function~~ | ~~4 ingest routes~~ | ✅ Fixed 2026-07-18 | Extracted to `@/lib/device-auth` |
| Mixed English/Hebrew comments | Throughout | Inconsistent | Pick one per file |
| No input validation library | All routes | Manual, error-prone | Consider Zod |

---

## 14. Row Level Security (RLS)

All 23 tables have RLS enabled. The backend uses `service_role` key which bypasses RLS. Policies exist for:

| Policy Type | Tables | Access |
|-------------|--------|--------|
| SELECT own data | users, cameras, alerts, vod_files, payments, invoices, invoice_items, recurring_payments, support_requests, alert_rules | `auth.uid() = user_id` |
| Public read | plans | Anyone (subscribe page) |
| Anon insert | subscription_requests | Public form |
| Auth insert | support_requests | Logged-in users |
| Full CRUD own | alert_rules | Authenticated owner |
| No policy (deny all) | mini_pcs, tokens, health, system_*, audit_log, admin_* | service_role only |

Migration file: `supabase/migrations/20260718_rls_policies.sql`

**Rule**: No frontend component should use `NEXT_PUBLIC_SUPABASE_ANON_KEY` to write data directly. All writes go through API routes.

---

*Document describes actual patterns in use as of 2026-07-18. Aspirational changes noted where applicable.*

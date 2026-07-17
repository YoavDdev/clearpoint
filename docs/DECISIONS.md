# Architecture Decision Records — Clearpoint Security

<!--
purpose: Document significant architectural and technology decisions with context, rationale, and consequences
audience: All engineers, AI assistants, future maintainers
when_to_read: When questioning "why was this done this way?" or before proposing architectural changes
prerequisites: ENGINEERING_GUIDELINES.md (current patterns), TECHNICAL_DEBT.md (known issues)
related_docs:
  - ENGINEERING_GUIDELINES.md (resulting conventions)
  - TECHNICAL_DEBT.md (consequences of some decisions)
  - MINI_PC.md (edge architecture)
  - SECURITY.md (auth architecture)
source_of_truth_for: Historical architectural decisions and their rationale
confidence: Reconstructed — derived from code analysis, not contemporaneous notes
last_verified: 2026-07-17
owner: Engineering Lead
-->

---

## ADR Index

| # | Decision | Status | Date (est.) |
|---|----------|--------|-------------|
| 1 | Next.js App Router as monolith | Accepted | 2024-Q4 |
| 2 | Dual auth: NextAuth + Supabase Auth | Accepted | 2024-Q4 |
| 3 | Mini PC edge architecture | Accepted | 2025-Q1 |
| 4 | PayPlus over Stripe | Accepted | 2025-Q1 |
| 5 | BunnyCDN for VOD storage | Accepted | 2025-Q2 |
| 6 | Device token authentication | Accepted | 2025-Q2 |
| 7 | Admin-only user creation | Accepted | 2025-Q1 |
| 8 | No subscriptions table | Accepted (de facto) | 2025-Q3 |
| 9 | On-device AI (OpenVINO) | Accepted | 2025-Q3 |
| 10 | RAM disk for HLS segments | Accepted | 2025-Q2 |
| 11 | Cloudflared tunnels for live streaming | Accepted | 2025-Q2 |
| 12 | Hebrew-first UI | Accepted | 2024-Q4 |
| 13 | No automated testing | Accepted (pragmatic) | 2024-Q4 |
| 14 | Service Role Key for all server queries | Accepted | 2025-Q1 |

---

## ADR-1: Next.js App Router as Monolith

**Status**: Accepted  
**Context**: Need to build a security camera SaaS with admin dashboard, customer dashboard, device APIs, and payment integrations.  
**Decision**: Use Next.js 15 App Router as a single monolithic application hosting all concerns (UI + API + webhooks + cron jobs).  
**Rationale**:
- Single deployment target (Vercel)
- Shared TypeScript types between frontend and backend
- App Router provides file-based routing for both pages and API
- Solo developer — reduced operational complexity

**Consequences**:
- ✅ Fast iteration, single codebase
- ✅ Zero infra management (Vercel handles scaling)
- ⚠️ Cold starts on serverless functions
- ⚠️ All API routes share same memory/timeout limits
- ⚠️ Monitoring scheduler relies on long-running edge function (fragile)

---

## ADR-2: Dual Auth — NextAuth + Supabase Auth

**Status**: Accepted  
**Context**: Needed session management for dashboard (NextAuth) and invite/password-reset flows (Supabase Auth magic links).  
**Decision**: Use NextAuth v4 for session/JWT management with Supabase Auth as the identity provider.  
**Rationale**:
- NextAuth handles middleware-level route protection
- Supabase Auth provides built-in invite links, password reset, email confirmation
- Credentials provider bridges the two: NextAuth validates against Supabase Auth

**Consequences**:
- ✅ Middleware can protect routes before rendering
- ✅ Supabase invite flow works out of the box
- ⚠️ Two auth systems to maintain
- ⚠️ Token/session can drift between systems
- ⚠️ `AuthRedirectHandler` component needed as fallback for hash-based tokens

---

## ADR-3: Mini PC Edge Architecture

**Status**: Accepted  
**Context**: Cameras are on customer LANs with no public IP. Need recording, live streaming, and AI detection at the edge.  
**Decision**: Deploy a Mini PC (Intel N150, Ubuntu) at each customer site running FFmpeg, Express HLS server, cloudflared tunnel, and Python AI.  
**Rationale**:
- Cameras have no cloud connectivity (local RTSP only)
- Bandwidth too expensive for cloud recording (especially SIM customers)
- AI at edge reduces latency and cloud costs
- Mini PC is cheap (~$200) and low-power

**Consequences**:
- ✅ Works with any IP camera (RTSP standard)
- ✅ Low bandwidth to cloud (only health data + alerts + VOD upload)
- ✅ Real-time AI without cloud latency
- ⚠️ Physical device management (installation, maintenance)
- ⚠️ No remote OS update mechanism
- ⚠️ Device token is only auth (if compromised, full access to ingest APIs)

---

## ADR-4: PayPlus over Stripe

**Status**: Accepted  
**Context**: Need to process payments in Israel (ILS), support Israeli credit cards, and provide Hebrew payment pages.  
**Decision**: Use PayPlus as the payment provider instead of Stripe or other international options.  
**Rationale**:
- Native Israeli payment gateway — supports all local cards
- Hebrew payment pages built-in
- Recurring payment support
- Israeli tax invoice integration possibility
- Lower fees for local transactions

**Consequences**:
- ✅ Full Israeli card support (Isracard, Leumi Card, Cal, etc.)
- ✅ Hebrew UX on payment pages
- ⚠️ Less mature API documentation than Stripe
- ⚠️ Inconsistent API response formats (required custom parsing)
- ⚠️ No sandbox environment — must use mock mode for development

---

## ADR-5: BunnyCDN for VOD Storage

**Status**: Accepted  
**Context**: Need to store and serve video footage (VOD) to customers with signed URLs and reasonable bandwidth costs.  
**Decision**: Use BunnyCDN pull zones for VOD storage/delivery with signed URL authentication.  
**Rationale**:
- Cheap bandwidth ($0.01/GB vs S3 $0.09/GB)
- Built-in CDN for fast delivery
- Token authentication for signed URLs
- Simple HTTP upload from Mini PC

**Consequences**:
- ✅ Cost-effective video delivery
- ✅ Global CDN edge caching
- ⚠️ Need HEVC→H.264 transcoding on Mini PC before upload (compatibility)
- ⚠️ No server-side processing (unlike AWS MediaConvert)
- ⚠️ Relies on Mini PC cron for upload scheduling

---

## ADR-6: Device Token Authentication

**Status**: Accepted  
**Context**: Mini PCs need to authenticate with cloud APIs. No user session available on devices.  
**Decision**: Use random 256-bit tokens, stored as SHA-256 hashes in `mini_pc_tokens` table. Raw token lives on device in `.env`.  
**Rationale**:
- Simple bearer token model
- Hash-only storage — leaked DB doesn't expose raw tokens
- One active token per device (revoke old on regeneration)
- No expiration (token valid until revoked)

**Consequences**:
- ✅ Simple to implement and rotate
- ✅ DB breach doesn't compromise active tokens
- ⚠️ No expiration — leaked token valid indefinitely until manual revoke
- ⚠️ Token stored in plaintext on device (`.env` file, 644 permissions)
- ⚠️ Single token grants access to all ingest endpoints for that device

---

## ADR-7: Admin-Only User Creation

**Status**: Accepted  
**Context**: This is a B2B/B2C service where customers are acquired through sales, not self-service signup.  
**Decision**: No self-registration. Customers submit a request form; admin creates accounts manually.  
**Rationale**:
- Service requires physical hardware installation
- Payment must be collected before activation
- Admin controls who gets access
- Prevents unauthorized use

**Consequences**:
- ✅ Full control over customer onboarding
- ✅ No spam/bot accounts
- ⚠️ Admin bottleneck for every new customer
- ⚠️ No self-service plan changes or upgrades

---

## ADR-8: No Subscriptions Table (De Facto)

**Status**: Accepted (de facto — evolved, not designed)  
**Context**: Code references a `subscriptions` table that was never created in production. Subscription state is tracked across `users.subscription_active`, `recurring_payments.is_active`, and plan assignment.  
**Decision**: Continue using distributed subscription state rather than creating the missing table.  
**Rationale**:
- System works in production without it
- `recurring_payments` table effectively serves as subscription record
- Migration risk outweighs benefit for current scale
- Code has fallback logic when `subscriptions` query fails

**Consequences**:
- ✅ No migration needed
- ⚠️ Subscription check logic is scattered and fragile
- ⚠️ Ghost queries to non-existent table (silently failing)
- ⚠️ New developers confused by dead code referencing `subscriptions`
- 📋 See TECHNICAL_DEBT.md TD-1 and TD-10

---

## ADR-9: On-Device AI (OpenVINO)

**Status**: Accepted  
**Context**: Need real-time object detection (person, vehicle, fire, smoke) on camera feeds without cloud GPU costs.  
**Decision**: Run YOLOv8n models on Mini PC CPU using OpenVINO IR (FP16) format.  
**Rationale**:
- Intel N150 supports OpenVINO acceleration
- FP16 models are small (~12MB) and fast enough (~2s/frame)
- No cloud GPU costs ($0/month per customer)
- Works offline (only sends alerts, not video, to cloud)
- Multiple models can run sequentially (COCO + fire_smoke)

**Consequences**:
- ✅ Zero cloud inference cost
- ✅ Works without internet (queues alerts locally)
- ✅ Privacy-friendly (video never leaves premises)
- ⚠️ Limited to Intel CPUs (no GPU acceleration on N150)
- ⚠️ CPU usage ~77% with 4 cameras (limits other tasks)
- ⚠️ Cannot run large models (weapons model disabled due to CPU constraints)
- ⚠️ 30s cycle per camera (not real-time, ~2fps effective)

---

## ADR-10: RAM Disk for HLS Segments

**Status**: Accepted  
**Context**: HLS live streaming writes and deletes tiny .ts files (~1.5s each) every second. SSD endurance concern.  
**Decision**: Mount 128MB tmpfs at `/mnt/ram-ts` for all HLS segment storage.  
**Rationale**:
- Prevents SSD wear from constant small writes
- RAM is faster than NVMe for tiny I/O
- 128MB sufficient for 4 cameras × 8 segments × ~200KB each
- Data is ephemeral (live segments don't need persistence)

**Consequences**:
- ✅ Extends SSD lifespan significantly
- ✅ Lower latency for live stream reads
- ⚠️ Lost on reboot (acceptable — live data is ephemeral)
- ⚠️ 128MB limits maximum concurrent streams

---

## ADR-11: Cloudflared Tunnels for Live Streaming

**Status**: Accepted  
**Context**: Mini PCs are on customer LANs (NAT, no public IP). Need to expose HLS streams to the internet.  
**Decision**: Use Cloudflare Tunnel (cloudflared) to expose the local Express HLS server to `minipc.clearpoint.co.il`.  
**Rationale**:
- Zero inbound ports required (works behind any NAT/firewall)
- Free tier sufficient for current scale
- Automatic HTTPS
- Reliable reconnection
- No VPN infrastructure needed

**Consequences**:
- ✅ Works behind any network configuration
- ✅ Free, encrypted, reliable
- ⚠️ Depends on Cloudflare availability
- ⚠️ Single tunnel domain for all Mini PCs (routing by hostname)
- ⚠️ Latency added (~50ms) vs direct connection

---

## ADR-12: Hebrew-First UI

**Status**: Accepted  
**Context**: All customers are Israeli businesses/individuals. Admin is also Hebrew-speaking.  
**Decision**: Build entire UI in Hebrew (RTL), with English only in code, logs, and technical identifiers.  
**Rationale**:
- Target market is 100% Hebrew-speaking
- RTL layout from day one prevents retrofitting
- Admin tools are internal (no i18n needed)
- Code stays English for tooling compatibility

**Consequences**:
- ✅ Natural UX for target users
- ✅ No i18n complexity
- ⚠️ Mixed Hebrew/English in codebase (comments, error messages)
- ⚠️ Non-Hebrew developers need context to understand UI strings
- ⚠️ Browser `alert()` messages are Hebrew (hardcoded)

---

## ADR-13: No Automated Testing

**Status**: Accepted (pragmatic)  
**Context**: Solo developer, rapid iteration, MVP-stage product with <10 customers.  
**Decision**: Skip automated testing (unit, integration, e2e). Rely on manual testing and production monitoring.  
**Rationale**:
- Speed of delivery prioritized over test coverage
- Small user base means issues are caught quickly
- Monitoring + alerts catch regressions in production
- Type safety (TypeScript strict) provides some safety net

**Consequences**:
- ✅ Faster development velocity
- ⚠️ Regressions caught in production
- ⚠️ Refactoring is risky without test safety net
- ⚠️ No CI/CD quality gate
- 📋 Should be reconsidered as customer base grows

---

## ADR-14: Service Role Key for All Server Queries

**Status**: Accepted  
**Context**: Supabase offers RLS (Row Level Security) for per-user access control, but all API routes run server-side with admin-level access.  
**Decision**: Use `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS) for all server-side queries. Enforce access control in application code.  
**Rationale**:
- Simpler query logic (no RLS policy debugging)
- Admin routes need full access anyway
- User routes manually filter by `session.user.email`
- RLS policies still exist as defense-in-depth for direct DB access

**Consequences**:
- ✅ No RLS policy bugs blocking legitimate queries
- ✅ Simpler development (one key, full access)
- ⚠️ Application code is the only access control boundary
- ⚠️ Bug in auth check = full data exposure
- ⚠️ Service role key is high-value secret (compromised = full DB access)

---

## How to Add a New ADR

When making a significant architectural decision:

1. Add a new entry to the index table
2. Use this template:

```markdown
## ADR-N: Title

**Status**: Proposed | Accepted | Deprecated | Superseded by ADR-X
**Context**: What problem are we solving?
**Decision**: What did we decide?
**Rationale**: Why this approach over alternatives?
**Consequences**: What are the trade-offs? (✅ benefits, ⚠️ drawbacks, 📋 references)
```

---

*Document reconstructed from code analysis on 2026-07-17. Dates are estimated based on git history and feature maturity.*

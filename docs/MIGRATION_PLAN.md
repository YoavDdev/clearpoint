# Documentation Migration Plan (v2)

<!--
purpose: Define the complete migration strategy for Clearpoint's engineering knowledge base
audience: Engineering Lead, anyone executing the migration
when_to_read: Before creating, moving, or archiving any documentation
prerequisites: Read DOCUMENTATION_AUDIT.md for individual document assessments
related_docs:
  - DOCUMENTATION_AUDIT.md (detailed audit of every existing document)
  - MANIFESTO.md (engineering philosophy)
  - PROJECT_BIBLE.md (system overview)
source_of_truth_for: Documentation migration process, document standards, target structure
confidence: Verified
last_verified: 2026-07-17
owner: Engineering Lead
-->

> Migration principle: **Documentation first, migration second.**
> No existing document is moved or archived until all its valuable content
> has been absorbed into the new documentation system.
> At no point should the project temporarily lose information.

---

## Core Rules

1. **Create all new documents first.** Only after every new document exists, has been reviewed, and all important knowledge has been verified as migrated, do we archive legacy documents.

2. **Preserve historical knowledge.** Old documents contain decisions, reasoning, and lessons learned. Extract unique knowledge before archiving. The archive preserves history — it does not hide it.

3. **Zero information loss.** Every fact, decision, cost estimate, bandwidth calculation, camera config, and troubleshooting note must have a home in the new system before its source is archived.

4. **Documentation evolves with code.** From this point forward, any implementation change that affects architecture, business rules, APIs, database schema, security, monitoring, deployment, or operations must update documentation in the same change.

---

## Document Metadata Standard

Every document begins with an HTML comment containing structured metadata:

```markdown
<!--
purpose: One-line description of what this document covers
audience: Who should read this (e.g., "All engineers", "Operations team", "AI assistants")
when_to_read: When someone should reach for this document
prerequisites: Documents to read first
related_docs:
  - DOC_NAME.md (brief reason)
source_of_truth_for: What topics this document is authoritative on
confidence: Verified | Partially Verified | Assumption | Needs Validation
last_verified: YYYY-MM-DD
owner: Role or person responsible for keeping this current
-->
```

This enables both humans and AI systems to navigate the documentation without guessing.

---

## Architecture Decision Records (ADRs)

Instead of a single `DECISIONS.md`, we adopt Architecture Decision Records.

### Structure

```
docs/architecture/
├── README.md              ← ADR index with status summary
├── ADR-001-edge-heavy-architecture.md
├── ADR-002-nextauth-over-supabase-auth.md
├── ADR-003-device-tokens-over-service-role.md
├── ADR-004-payplus-over-meshulam.md
├── ADR-005-cloudflare-tunnel-for-live-streams.md
├── ADR-006-bunny-cdn-for-vod.md
├── ADR-007-mini-pc-over-raspberry-pi.md
├── ADR-008-rls-for-tenant-isolation.md
├── ADR-009-hebrew-first-ui.md
├── ADR-010-admin-operated-no-self-service.md
├── ADR-011-fail-open-subscription-check.md
├── ADR-012-yolov8n-openvino-for-detection.md
├── ADR-013-vercel-serverless-deployment.md
├── ADR-014-resend-for-email.md
└── ADR-015-supabase-storage-for-snapshots.md
```

### ADR Template

```markdown
# ADR-NNN: [Title]

<!--
purpose: Record and explain the decision to [brief description]
audience: All engineers, AI assistants
when_to_read: When working on [affected area] or questioning why [thing] works this way
prerequisites: PROJECT_BIBLE.md
related_docs:
  - [relevant docs]
source_of_truth_for: The decision to [brief]
confidence: Verified
last_verified: YYYY-MM-DD
owner: Engineering Lead
-->

## Status

[Accepted | Superseded | Deprecated]
Date: YYYY-MM-DD

## Context

What is the problem or situation that required a decision?

## Decision

What was decided and why?

## Alternatives Considered

What other options were evaluated?

| Alternative | Pros | Cons | Why Not |
|------------|------|------|---------|
| ... | ... | ... | ... |

## Consequences

### Positive
- ...

### Negative
- ...

### Risks
- ...

## Related Documents

- [links to related docs]
```

### Proposed ADRs from Existing Knowledge

| ADR | Source of Knowledge | Status |
|-----|-------------------|--------|
| ADR-001: Edge-heavy architecture | `Planning.md` (original vision), `PROJECT_BIBLE.md`, code | Accepted |
| ADR-002: NextAuth over Supabase Auth | `Planning.md` (said "no NextAuth"), code (uses NextAuth) — captures the migration | Accepted |
| ADR-003: Device tokens over service role | `installer-v2-design.md` (security section, lines 167-178) — documents the evolution | Accepted |
| ADR-004: PayPlus over Meshulam | `Planning.md` (said Meshulam), code (uses PayPlus) — captures the switch | Accepted |
| ADR-005: Cloudflare Tunnel for live streams | `Clearpoint_Hebrew_Live_Stream_Explained.md` (old: B2+Bunny), code (Tunnel) | Accepted |
| ADR-006: Bunny CDN for VOD delivery | `Plan_B_Cloud_VOD.md` (detailed rationale), code | Accepted |
| ADR-007: Mini PC over Raspberry Pi | `pi-setup-guide.md` (old), `pc-setup-guide.md` (new) — captures the hardware evolution | Accepted |
| ADR-008: RLS for tenant isolation | `SUPABASE_SCHEMA_AUDIT.md`, migration files | Accepted |
| ADR-009: Hebrew-first UI | Code patterns (all UI components use Hebrew text, RTL layout) | Accepted |
| ADR-010: Admin-operated, no self-service | Auth routes, admin panels, no signup flow | Accepted |
| ADR-011: Fail-open subscription check | `middleware.ts` — observed behavior (needs confirmation whether deliberate or accidental) | Accepted |
| ADR-012: YOLOv8n + OpenVINO for AI detection | `scripts/ai/detect.py`, `setup-ai.sh` | Accepted |
| ADR-013: Vercel serverless deployment | `vercel.json`, deployment config | Accepted |
| ADR-014: Resend for transactional email | `email-service.ts`, `notifications.ts` | Accepted |
| ADR-015: Supabase Storage for alert snapshots | `alert/route.ts`, `alert-snapshots` bucket | Accepted |

---

## Target Documentation Structure

```
docs/
├── MANIFESTO.md                  ← Engineering philosophy (EXISTS)
├── PROJECT_BIBLE.md              ← System overview (EXISTS)
├── SYSTEM_ARCHITECTURE.md        ← Component design, data flows, sequence diagrams
├── DATABASE.md                   ← Every table: purpose, schema, RLS, lifecycle
├── API_REFERENCE.md              ← Every endpoint: auth, request/response, security
├── SECURITY.md                   ← Auth model, threats, risks, device tokens
├── MINI_PC.md                    ← Hardware, installation, AI pipeline, services
├── MONITORING.md                 ← Health model, alerts, notifications, diagnostics
├── BUSINESS_RULES.md             ← Plans, pricing, billing, ownership, retention
├── OPERATIONS.md                 ← How to: add customer, deploy, recover, monitor
├── ENGINEERING_GUIDELINES.md     ← Conventions, patterns, code style
├── TECHNICAL_DEBT.md             ← Known issues with severity, priority, recommendations
├── MIGRATION_PLAN.md             ← This file (archive after migration completes)
├── DOCUMENTATION_AUDIT.md        ← Audit results (archive after migration completes)
│
├── architecture/                 ← Architecture Decision Records
│   ├── README.md                 ← ADR index
│   ├── ADR-001-edge-heavy-architecture.md
│   ├── ADR-002-nextauth-over-supabase-auth.md
│   └── ...
│
├── design/                       ← Forward-looking design specs (not yet implemented)
│   └── installer-v2.md
│
└── archive/                      ← Historical documents (read-only reference)
    ├── ARCHIVE_INDEX.md          ← What's here and why
    ├── Planning.md
    ├── Task.md
    ├── SUPABASE_SCHEMA_AUDIT.md
    ├── Pricing_full.md
    ├── Plan_B_Cloud_VOD.md
    ├── Plan_Master.md
    ├── New-Clearpoint_Plans_Overview.md
    ├── Clearpoint_Default_Camera_Config.md
    ├── Clearpoint_H265_Browser_Compatible.md
    ├── Clearpoint_Hebrew_Live_Stream_Explained.md
    ├── Install_checklist.md
    ├── camera-setup.md
    ├── pc-setup-guide.md
    ├── pi-setup-guide.md
    ├── installer-v2-design.md
    └── installer-v2-design.pdf

installer/
└── README.md                     ← Stays with code (no change)
```

---

## Migration Execution Plan

### Phase 1: Foundation (Complete)
- [x] Create `PROJECT_BIBLE.md`
- [x] Create `MANIFESTO.md`
- [x] Create `DOCUMENTATION_AUDIT.md`
- [x] Create `MIGRATION_PLAN.md`

### Phase 2: Core Documentation (Create one at a time, review each)

Order matters — each document builds on the ones before it:

| # | Document | Depends On | Absorbs Content From |
|---|----------|-----------|---------------------|
| 1 | `SYSTEM_ARCHITECTURE.md` ✅ | `PROJECT_BIBLE.md` | `Plan_B_Cloud_VOD.md` (VOD pipeline), `Planning.md` (data flows) |
| 2 | `DATABASE.md` | `SYSTEM_ARCHITECTURE.md` | `SUPABASE_SCHEMA_AUDIT.md` (column definitions, data issues) |
| 3 | `API_REFERENCE.md` | `DATABASE.md` | `SUPABASE_SCHEMA_AUDIT.md` (endpoint list) |
| 4 | `SECURITY.md` | `API_REFERENCE.md` | `installer-v2-design.md` (security evolution, lines 167-178) |
| 5 | `MINI_PC.md` | `SECURITY.md` | `Clearpoint_Default_Camera_Config.md` (camera settings — verbatim), `pc-setup-guide.md` (installation flow), `camera-setup.md` (RTSP setup) |
| 6 | `MONITORING.md` | `MINI_PC.md` | `Task.md` (troubleshooting notes, lines 86-94) |
| 7 | `BUSINESS_RULES.md` | `DATABASE.md` | `New-Clearpoint_Plans_Overview.md` (plan structure), `Plan_Master.md` (pricing/costs), `Pricing_full.md` (break-even), `Clearpoint_H265_Browser_Compatible.md` (bandwidth estimates) |
| 8 | `OPERATIONS.md` | All above | `pc-setup-guide.md` (Phase 1/2 flow), `Install_checklist.md` (physical items), `camera-setup.md` (RTSP testing), `Task.md` (discovered notes) |
| 9 | `ENGINEERING_GUIDELINES.md` | `MANIFESTO.md` | Code patterns discovered during audit |
| 10 | `TECHNICAL_DEBT.md` | All above | Production readiness review findings, audit contradictions |

### Phase 3: Architecture Decision Records

After all core documents are reviewed:

| # | ADR | Primary Source |
|---|-----|---------------|
| 1 | ADR-001 through ADR-015 | See table in ADR section above |

### Phase 4: Verification

Before any archiving:

- [ ] Every fact from every legacy document has been traced to its new location
- [ ] All pricing data preserved in `BUSINESS_RULES.md`
- [ ] All camera hardware specs preserved in `MINI_PC.md`
- [ ] All installation procedures preserved in `OPERATIONS.md`
- [ ] All bandwidth/storage estimates preserved in `BUSINESS_RULES.md`
- [ ] All troubleshooting notes preserved in `OPERATIONS.md`
- [ ] All security evolution documented in ADR-003
- [ ] All architectural decisions captured as ADRs
- [ ] Contradiction register from `DOCUMENTATION_AUDIT.md` resolved (correct version documented, wrong version noted)
- [ ] Every new document has metadata header
- [ ] Every new document has cross-references to related docs
- [ ] All current gaps documented in `MANIFESTO.md` are tracked in `TECHNICAL_DEBT.md`

### Phase 5: Archive Legacy Documents

Only after Phase 4 is complete:

1. Create `docs/archive/` directory
2. Create `docs/archive/ARCHIVE_INDEX.md`
3. Move each legacy document to `docs/archive/`
4. Move `docs/design/installer-v2.md` (copy from `installer-v2-design.md`)
5. Move `DOCUMENTATION_AUDIT.md` and `MIGRATION_PLAN.md` to archive
6. Verify no broken references
7. Final review

---

## Content Absorption Tracking

For each legacy document, this table tracks what unique content goes where:

| Legacy Document | Unique Content | Target Document | Absorbed? |
|----------------|---------------|-----------------|-----------|
| `Planning.md` | Original project vision (lines 1-14) | ADR-001 | ☐ |
| `Planning.md` | VOD upload logic description (lines 42-62) | `SYSTEM_ARCHITECTURE.md` | ☑ |
| `Planning.md` | Meshulam → PayPlus transition evidence | ADR-004 | ☐ |
| `Planning.md` | "Supabase Auth (no NextAuth)" → NextAuth transition | ADR-002 | ☐ |
| `Task.md` | "Notes Discovered" bugs (lines 86-94) | `OPERATIONS.md` | ☐ |
| `SUPABASE_SCHEMA_AUDIT.md` | Column definitions for users, cameras, support_requests, subscription_requests | `DATABASE.md` | ☐ |
| `SUPABASE_SCHEMA_AUDIT.md` | Data inconsistency observations (lines 144-147) | `TECHNICAL_DEBT.md` | ☐ |
| `New-Clearpoint_Plans_Overview.md` | Plan A/B/C feature matrix | `BUSINESS_RULES.md` | ☐ |
| `New-Clearpoint_Plans_Overview.md` | Upgrade path philosophy | `BUSINESS_RULES.md` | ☐ |
| `Plan_Master.md` | Pricing: ₪59-₪159/month per plan | `BUSINESS_RULES.md` | ☐ |
| `Plan_Master.md` | Hardware costs: ₪392 Mini PC | `BUSINESS_RULES.md` | ☐ |
| `Plan_Master.md` | Monthly cloud costs breakdown | `BUSINESS_RULES.md` | ☐ |
| `Plan_Master.md` | Annual discount structure | `BUSINESS_RULES.md` | ☐ |
| `Pricing_full.md` | Break-even calculation methodology | `BUSINESS_RULES.md` | ☐ |
| `Pricing_full.md` | Cloud cost estimates (B2 + Bunny) | `BUSINESS_RULES.md` | ☐ |
| `Plan_B_Cloud_VOD.md` | VOD pipeline: FFmpeg → B2 → Bunny → signed URL | `SYSTEM_ARCHITECTURE.md` | ☑ |
| `Plan_B_Cloud_VOD.md` | Storage: 5.5 GB/day/camera at 720p/10fps/H.265/512kbps | `BUSINESS_RULES.md` | ☐ |
| `Plan_B_Cloud_VOD.md` | Scale projection: 100 customers = 15.4-30.8 TB | `BUSINESS_RULES.md` | ☐ |
| `Clearpoint_Default_Camera_Config.md` | Camera settings table (720p, 10fps, H.265, 512kbps) | `MINI_PC.md` | ☐ |
| `Clearpoint_Default_Camera_Config.md` | AI detection camera requirements | `MINI_PC.md` | ☐ |
| `Clearpoint_Default_Camera_Config.md` | Smart Codec warning (Hikvision/Dahua) | `MINI_PC.md` | ☐ |
| `Clearpoint_H265_Browser_Compatible.md` | SIM bandwidth: 300GB VOD + 20GB live = 320GB/month | `BUSINESS_RULES.md` | ☐ |
| `Clearpoint_Hebrew_Live_Stream_Explained.md` | Security comparison: RTSP direct vs tunnel | ADR-005 | ☐ |
| `Install_checklist.md` | Physical hardware items list | `OPERATIONS.md` | ☐ |
| `Install_checklist.md` | Pre-installation testing checklist | `OPERATIONS.md` | ☐ |
| `camera-setup.md` | RTSP testing with VLC workflow | `OPERATIONS.md` | ☐ |
| `camera-setup.md` | Camera web UI access instructions | `MINI_PC.md` | ☐ |
| `pc-setup-guide.md` | Phase 1/Phase 2 installation structure | `OPERATIONS.md` | ☐ |
| `pc-setup-guide.md` | Cloudflare tunnel creation steps | `OPERATIONS.md` | ☐ |
| `pc-setup-guide.md` | DNS record instructions | `OPERATIONS.md` | ☐ |
| `pc-setup-guide.md` | Final verification checklist | `OPERATIONS.md` | ☐ |
| `pi-setup-guide.md` | ARM64 cloudflared download URL (`cloudflared-linux-arm64.deb`) | ADR-007 (historical note) | ☐ |
| `installer-v2-design.md` | UX flow design for future GUI installer | `docs/design/installer-v2.md` | ☐ |
| `installer-v2-design.md` | Security evolution: service role → device token | ADR-003 | ☐ |
| `installer-v2-design.md` | Acceptance test criteria (lines 181-191) | `OPERATIONS.md` | ☐ |

---

## Next Step

Begin Phase 2: Create `SYSTEM_ARCHITECTURE.md` — the first core document in the dependency chain.

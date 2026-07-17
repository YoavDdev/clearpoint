# Clearpoint Security — Engineering Manifesto

<!--
purpose: Define the engineering philosophy, principles, and standards that govern all work on the Clearpoint Security project
audience: Every engineer, contractor, and AI assistant working on Clearpoint
when_to_read: Before writing any code, documentation, or making any architectural decision
prerequisites: None — this is the starting point
related_docs:
  - PROJECT_BIBLE.md (system overview)
  - SYSTEM_ARCHITECTURE.md (technical design)
  - ENGINEERING_GUIDELINES.md (coding conventions)
source_of_truth_for: Engineering philosophy, development principles, collaboration rules
confidence: Partially Verified — product philosophy is verified from implementation patterns;
  engineering principles are a mix of verified practices and aspirational standards.
  Where current implementation violates a principle, it is noted explicitly.
last_verified: 2026-07-17
owner: Engineering Lead
-->

> This document defines how we think, build, and operate at Clearpoint Security.
> It is the first document every engineer or AI assistant should read.
> Every decision, every line of code, and every document should be consistent with these principles.

---

## Product Philosophy

### We build a managed security product, not a software tool

Clearpoint is not a camera app. It is a complete, managed security service. Our customers are not technical. They expect the system to work — always, silently, reliably. They should never need to understand how the system works.

**Implication**: Every feature must work without customer intervention. If something breaks, we must detect it before the customer notices. If the customer needs to do something, we must guide them through it.

### The customer sees a simple product; the engineering is invisible

From the customer's perspective: they log in, they see their cameras, they review footage, they get alerts. That simplicity is the product. Behind it is a distributed system spanning on-premises hardware, cloud infrastructure, real-time video, AI inference, and payment processing.

**Implication**: Complexity belongs in the infrastructure, not in the user experience. If a feature adds complexity to the customer's workflow, we are building it wrong.

### Hardware is part of the product

Unlike pure SaaS, we own the full stack — from the Mini PC and cameras at the customer's site to the cloud dashboard. This gives us control but also responsibility. A hardware failure is our problem, not the customer's.

**Implication**: The system must monitor its own health, report failures proactively, and support remote recovery. Field visits should be the last resort, not the first response.

---

## Engineering Principles

### 1. Security is not a feature — it is the foundation

We are a security company. Our product protects people's physical safety. A security vulnerability in our system is not a bug — it is a breach of trust.

**In practice**:
- Every API endpoint must have explicit authentication and authorization
  - ⚠️ **Current gap**: ~39 of 44 admin API routes lack session checks. See `TECHNICAL_DEBT.md`.
- Never trust client input — validate everything server-side
- Secrets must not appear in source code
  - ⚠️ **Current gap**: `BUNNY_TOKEN_KEY` is hardcoded in `scripts/utils/uploadVods.ts`. See `TECHNICAL_DEBT.md`.
- The service role key is for server-side operations only — never on client devices
  - ⚠️ **Current gap**: Some Mini PC scripts reference service role keys. The device token system (ADR-003) was implemented to replace this pattern, but migration is not fully complete.
- Device tokens are scoped, rotatable, and revocable
- Default to deny — if you're unsure whether access should be allowed, deny it

### 2. Reliability over features

A system that works reliably with 4 cameras is worth more than a system that supports 40 cameras but crashes. Our customers depend on this system for their safety. Downtime is not acceptable.

**In practice**:
- Every error must be caught, logged, and surfaced
  - ⚠️ **Current gap**: Cron jobs use `console.log`/`console.error` only — no structured error reporting system (Sentry, Datadog, etc.) is in place.
- Never fail silently — if something breaks, someone must know
- Prefer simple, tested solutions over clever, fragile ones
- Every cron job, webhook, and background process must have monitoring
  - ⚠️ **Current gap**: Only 2 of 5 cron jobs are registered in `vercel.json`. See `TECHNICAL_DEBT.md`.
- If a failure mode exists, we must have a recovery path

### 3. Simplicity over cleverness

Code that is easy to read, test, and debug is better than code that is elegant but opaque. We optimize for maintainability, not for impressiveness.

**In practice**:
- Write code that a new engineer can understand without asking questions
- Prefer explicit over implicit
- Avoid abstractions until the third time you need them
- One file should do one thing
- If a function needs a comment to explain what it does, simplify the function

### 4. Single source of truth

Every piece of knowledge — whether it's a business rule, a schema definition, an API contract, or an operational procedure — must exist in exactly one place. Duplication creates contradiction. Contradiction creates bugs.

**In practice**:
- Documentation lives in `docs/`, not in Slack, not in someone's head
- Database schema is documented in `DATABASE.md`, not scattered across migration files
- Business rules are documented in `BUSINESS_RULES.md`, not buried in code comments
- If information exists in two places, one of them is wrong — find out which

### 5. Observe everything, assume nothing

We cannot fix what we cannot see. Every system component must report its state. Every failure must be visible. Assumptions about system health are the #1 cause of outages.

**In practice**:
- Mini PCs report health every 60 seconds — `Verified`
- Cameras report stream status continuously — `Verified` (via `is_stream_active` and `last_seen_at`)
- Cron jobs log their execution and outcomes — `Partially Verified` (they log via `console.log` but lack structured logging)
- Errors must be sent to monitoring, not just console.log
  - ⚠️ **Current gap**: No external error monitoring service is configured. This is a key production readiness requirement.
- If a system has no monitoring, it is not production-ready

---

## Documentation Rules

### Documentation is production code

Documentation is not optional. It is not a nice-to-have. It is part of the implementation.

A feature without documentation is an unfinished feature. An API without documentation is an undiscoverable API. A decision without documentation is a decision that will be reversed by someone who doesn't know it was made.

### Rules

1. **Every implementation that changes architecture, business rules, APIs, database schema, security, monitoring, deployment, or operations must update the relevant documentation in the same change.**

2. **Every document must have a metadata header** specifying purpose, audience, prerequisites, and confidence level. This enables both humans and AI to navigate the documentation without guessing.

3. **Never present assumptions as facts.** If something is not verified from code, mark it explicitly:
   - `Verified` — confirmed from source code
   - `Partially Verified` — some aspects confirmed, others inferred
   - `Assumption` — reasonable inference without code confirmation
   - `Needs Validation` — requires investigation before relying on it

4. **One source of truth per topic.** If a topic is documented in multiple places, consolidate immediately.

5. **Archive, don't delete.** Old documents contain historical context. Move them to `docs/archive/` with an entry in the archive index. Never delete documentation.

6. **Cross-reference related documents.** Every document should link to its related docs. A reader should never hit a dead end.

---

## Development Workflow

### Before writing code

1. Read the relevant documentation (`PROJECT_BIBLE.md` → specific domain docs)
2. Understand the existing architecture and conventions
3. Check `TECHNICAL_DEBT.md` — the problem you're solving may already be documented
4. Check `docs/architecture/` — the decision you're about to make may already have been made

### While writing code

1. Follow conventions in `ENGINEERING_GUIDELINES.md`
2. Validate against business rules in `BUSINESS_RULES.md`
3. Ensure security requirements from `SECURITY.md` are met
4. Write tests for critical logic
   - ⚠️ **Current gap**: The project has zero test files. Establishing a test baseline is a priority. See `TECHNICAL_DEBT.md`.

### After writing code

1. Update any documentation affected by your change
2. If you made an architectural decision, create an ADR in `docs/architecture/`
3. If you discovered technical debt, add it to `TECHNICAL_DEBT.md`
4. Verify the system still works end-to-end

---

## AI Collaboration Rules

AI assistants (Cascade, Cursor, Copilot, or any future tool) are collaborators on this project. To work effectively, they must follow the same standards as human engineers.

### Rules for AI assistants

1. **Read before writing.** Always read relevant documentation and code before making changes. Never guess.

2. **Follow the manifesto.** These principles apply to AI-generated code equally. No exceptions.

3. **Never invent information.** If you don't know something, say so. Mark it as `Assumption` or `Needs Validation`. Never present a guess as a fact.

4. **Preserve knowledge.** Never delete documentation, comments, or code without understanding why they exist. If something looks wrong, verify before removing.

5. **Maintain documentation.** If you change code that affects documented behavior, update the documentation in the same change.

6. **Start with `MANIFESTO.md` and `PROJECT_BIBLE.md`.** These two documents provide the context needed to work effectively on any part of the system.

7. **Use `docs/` as your knowledge base.** The documentation is designed to be your primary source of truth. Prefer it over re-reading the entire codebase.

8. **Ask before assuming.** If something is ambiguous, ask the human. A wrong assumption implemented in code is worse than a question.

---

## Architectural Principles

### Edge-heavy, cloud-light

AI inference, video recording, and live streaming run on the Mini PC at the customer's site. The cloud handles CRUD, billing, monitoring, and the dashboard. This reduces cloud costs, minimizes latency for real-time features, and keeps the system operational even during internet outages (local recording continues).

### Tenant isolation by design

Every customer's data is isolated through Row Level Security (RLS) in PostgreSQL. Admin operations use the service role key to bypass RLS when necessary. Customer-facing operations always go through RLS.

### Stateless API, stateful devices

The Next.js API layer is stateless — deployed as serverless functions on Vercel. State lives in the database (Supabase) and on the Mini PCs. This means the API can scale horizontally without coordination.

### Fail-open for access, fail-closed for security

If a subscription check fails due to a server error, the customer can still access their dashboard (fail-open — we don't lock out paying customers due to our bugs). But if an authentication check fails, access is denied (fail-closed — security is non-negotiable).

---

## Coding Philosophy

### Hebrew-first UI, English-only code

All customer-facing text is in Hebrew. All variable names, function names, API keys, and database columns are in English.

⚠️ **Current gap**: ~228 Hebrew comments exist across 38 source files (primarily in `payplus.ts`, invoice routes, and webhook handlers). The target is English-only for all code artifacts — comments, variables, and logs. Existing Hebrew comments should be migrated to English during related refactoring work, not as a standalone effort.

### Convention over configuration

Follow existing patterns. If the codebase uses `getServerSession` for auth checks, use `getServerSession`. If health tables use upsert with unique indexes, use upsert with unique indexes. Consistency is more important than local optimization.

### Small, focused changes

Prefer small pull requests that do one thing well. A 50-line change that fixes one bug is better than a 500-line change that fixes one bug and refactors three files. Small changes are easier to review, easier to revert, and less likely to introduce new bugs.

---

## Refactoring Philosophy

### Refactor when it's necessary, not when it's tempting

Refactoring for its own sake is not productive. Refactor when:
- A bug is caused by unclear code structure
- A feature is blocked by technical debt
- The same pattern is repeated incorrectly in multiple places
- Security is at risk due to inconsistent implementation

### Never refactor without tests

If the code you're refactoring doesn't have tests, write tests first. Tests are the safety net that lets you refactor with confidence. Refactoring without tests is just introducing new bugs.

### Refactoring must preserve behavior

A refactor that changes behavior is not a refactor — it's a feature change. If you need to change behavior, do it in a separate change with its own documentation and testing.

---

## Production Mindset

### Everything we ship must be production-ready

There is no "we'll fix it later" in production. If code is not ready for production, it does not ship. This means:
- Error handling is complete
- Authentication is enforced
- Monitoring is in place
- Documentation is updated
- The change has been tested

### Incidents are learning opportunities

When something breaks, we don't blame. We investigate, document, and prevent recurrence. Every incident should result in:
- A root cause analysis
- A fix for the immediate issue
- A systemic improvement to prevent similar issues
- Updated documentation or monitoring

### We operate what we build

The engineer who builds a feature is responsible for its operation. This means thinking about monitoring, alerting, failure modes, and recovery paths during development — not after deployment.

---

## Summary

These principles describe how we intend to work. Some are already verified in the current implementation; others represent standards we are actively working toward. Where a principle is not yet met, it is marked with ⚠️ in the relevant section above.

The gap between principle and practice is documented — not hidden. Closing these gaps is tracked in `TECHNICAL_DEBT.md`. Every engineer, every AI assistant, and every contributor should internalize these principles before writing a single line of code.

If a principle conflicts with a deadline, the principle wins. Cutting corners creates technical debt. Technical debt creates outages. Outages erode trust. Trust is the foundation of a security company.

---

## Related Documents

- [PROJECT_BIBLE.md](./PROJECT_BIBLE.md) — System overview and architecture summary
- [ENGINEERING_GUIDELINES.md](./ENGINEERING_GUIDELINES.md) — Coding conventions and patterns
- [SECURITY.md](./SECURITY.md) — Security model and threat analysis
- [TECHNICAL_DEBT.md](./TECHNICAL_DEBT.md) — Known issues and improvement plan
- [docs/architecture/](./architecture/) — Architecture Decision Records

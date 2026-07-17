# Archive Index

> These documents are preserved for historical reference only.
> They contain outdated information and should NOT be used for current development.
> The canonical documentation lives in `docs/` (parent directory).

---

## Archived Documents

| Document | Reason | Content Absorbed Into |
|----------|--------|-----------------------|
| `Planning.md` | Outdated (Raspberry Pi, Meshulam, Next.js 14) | `PROJECT_BIBLE.md` |
| `Task.md` | Completed/abandoned task tracker | `TECHNICAL_DEBT.md` (when created) |
| `SUPABASE_SCHEMA_AUDIT.md` | Superseded by production-verified `DATABASE.md` | `DATABASE.md` |
| `Pricing_full.md` | Based on Raspberry Pi hardware costs | `BUSINESS_RULES.md` (when created) |
| `Plan_B_Cloud_VOD.md` | VOD pipeline description (partially accurate) | `SYSTEM_ARCHITECTURE.md` |
| `Clearpoint_H265_Browser_Compatible.md` | Raspberry Pi system overview (deprecated hardware) | Bandwidth estimates → `BUSINESS_RULES.md` |
| `Clearpoint_Hebrew_Live_Stream_Explained.md` | Incorrect live stream delivery claim (said B2+Bunny, actual is Cloudflare Tunnel) | Template for future customer docs |
| `Install_checklist.md` | Lists Raspberry Pi hardware | `OPERATIONS.md` (when created) |
| `camera-setup.md` | Contradicts default camera config; obsolete remote access method | `MINI_PC.md` (when created) |
| `pi-setup-guide.md` | Raspberry Pi only — superseded by `pc-setup-guide.md` | None (fully redundant) |
| `pc-setup-guide.md` | Mostly accurate but Ubuntu 22.04 (installer targets 24.04) | `OPERATIONS.md` (when created) |
| `installer-v2-design.pdf` | Binary duplicate of `.md` version | `docs/design/installer-v2.md` |
| `New-Clearpoint_Plans_Overview.md` | Plan descriptions (SIM/WiFi/Local) | `BUSINESS_RULES.md` (when created) |
| `Plan_Master.md` | Pricing, margins, cost breakdown | `BUSINESS_RULES.md` (when created) |
| `Clearpoint_Default_Camera_Config.md` | Camera hardware settings (still accurate) | `MINI_PC.md` (when created) |
| `DATABASE_SELF_REVIEW_REPORT.md` | Audit trail for DATABASE.md corrections (executed 2026-07-17) | Findings applied to `DATABASE.md` |

---

## Key Contradictions Found (Preserved for Reference)

| Item | Old docs said | Truth (from code) |
|------|--------------|-------------------|
| Auth system | Supabase Auth (no NextAuth) | NextAuth CredentialsProvider |
| Payment gateway | Meshulam | PayPlus |
| Hardware | Raspberry Pi 5 | Mini PC (Intel N150) |
| Camera resolution | 1920×1080 | 1280×720 (default config) |
| Live stream delivery | B2 + Bunny CDN | Cloudflare Tunnel |
| FFmpeg mode | `-c:v libx264` (transcode) | `-c copy` (passthrough for recording) |

---

*Archived: 2026-07-17*
*Audit source: `DOCUMENTATION_AUDIT.md`*

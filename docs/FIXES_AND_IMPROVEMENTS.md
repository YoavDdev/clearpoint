# Clearpoint Security — Fixes & Improvements Plan

> מסמך עבודה: נעבור פריט-פריט, נסמן מה בוצע, ונמשיך הלאה.
> עדכון אחרון: 2026-07-18

---

## סדר עדיפויות

| עדיפות | תיאור |
|---------|--------|
| 🔴 P0 | באגים קריטיים — משפיעים על production עכשיו |
| 🟠 P1 | תיקונים חשובים — סיכון אבטחה / integrity |
| 🟡 P2 | שיפורי ביצועים / קוד |
| 🟢 P3 | שיפורים קוסמטיים / nice-to-have |

---

## 🔴 P0 — באגים קריטיים

### 1. ✅ הסרת Ghost Table `subscriptions`
**מזהה**: TD-1, TD-2, TD-3  
**בוצע**: 2026-07-18  
**מה נעשה**:
- [x] הסרת כל ה-references ל-`subscriptions` מ-8 route files
- [x] הסרת 3 cron jobs מתים (`process-cancellations`, `process-trials`, `resume-paused`)
- [x] הסרת `simulate-recurring-payment` route (תלוי ב-subscriptions)
- [x] הסרת DB functions (`find_expiring_trials`, `get_subscription_status`, `find_subscriptions_to_cancel`, `find_paused_to_resume`)
- [x] vercel.json — לא היה צריך שינוי (dead crons לא היו מוגדרים)
- [x] כל subscription checks עוברים ישירות ל-`recurring_payments`

---

## 🟠 P1 — תיקוני אבטחה ו-Integrity

### 2. ✅ אימות Cron Endpoints
**מזהה**: TD-16  
**בוצע**: 2026-07-18  
**מה נעשה**:
- [x] הוספת `CRON_SECRET` header check ל-`cleanup-logs` (היחיד שלא היה מוגן)
- [x] `sync-payplus-recurring` — כבר היה מוגן
- [x] שני ה-cron routes מוגנים עכשיו

### 3. ✅ הגבלת `supportuploads` Bucket
**מזהה**: TD-15  
**בוצע**: 2026-07-18  
**מה נעשה**:
- [x] הגבלת גודל: 10MB max (server-side validation)
- [x] הגבלת MIME types: jpeg, png, gif, webp, mp4, mov, pdf
- [x] RLS לא נדרש — route כבר דורש session + service_role עוקף RLS

### 4. ✅ Soft Delete למשתמשים ולנתונים פיננסיים
**מזהה**: TD-7, TD-8  
**בוצע**: 2026-07-18  
**מה נעשה**:
- [x] הוספת `deleted_at` column ל-`users` (DB migration בוצע)
- [x] שינוי `admin-delete-user` מ-DELETE ל-UPDATE deleted_at
- [x] Auth user מושבת (ban) במקום נמחק
- [x] Admin list endpoints מסננים deleted users
- [x] נתונים פיננסיים (payments, invoices) נשמרים

### 5. ✅ Audit Log לפעולות Admin
**מזהה**: TD-17  
**בוצע**: 2026-07-18  
**מה נעשה**:
- [x] יצירת טבלה `audit_log` עם RLS (DB migration בוצע)
- [x] יצירת `src/lib/audit.ts` עם `logAdminAction()` — fire-and-forget
- [x] שילוב ב-user.create ו-user.delete
- [ ] TODO: הרחבה לפעולות נוספות (recurring cancel, payment create)

---

## 🟡 P2 — שיפורי ביצועים וקוד

### 6. ✅ Extract Device Token Validation
**מזהה**: TD-18, TD-19  
**בוצע**: 2026-07-18  
**מה נעשה**:
- [x] יצירת `src/lib/device-auth.ts` עם `validateDeviceToken()` + `sha256Hex()`
- [x] החלפת קוד כפול ב-6 ingest routes
- [x] אותה התנהגות בדיוק — רק DRY

### 7. ✅ הוספת Composite Indexes
**מזהה**: TD-14  
**בוצע**: 2026-07-18  
**מה נעשה**:
- [x] `idx_alerts_user_ack_created` — alerts(user_id, acknowledged, created_at DESC)
- [x] `idx_vod_files_user_camera_time` — vod_files(user_id, camera_id, timestamp DESC)
- [x] `idx_system_logs_minipc_created` — system_logs(mini_pc_id, created_at DESC)

### 8. ✅ הוספת `/api/health` Endpoint
**מזהה**: TD-22  
**בוצע**: 2026-07-18  
**מה נעשה**:
- [x] יצירת `src/app/api/health/route.ts`
- [x] בדיקת DB connection + env vars
- [x] Response: `{ status, timestamp, latencyMs, checks }` — 200/503

### 9. ✅ ניקוי Admin Routes מתים
**מזהה**: TD-4, TD-9  
**בוצע**: 2026-07-18  
**מה נעשה**:
- [x] זיהוי 6 routes ללא שימוש ב-frontend (grep על כל .tsx)
- [x] מחיקת: `admin-all-cameras`, `admin-fix-constraints`, `admin-update-plans`
- [x] מחיקת: `admin/update-alerts-table`, `admin/test-monitoring`, `admin/get-subscription`
- [ ] TODO: מיגרציה של flat routes פעילים ל-nested (דורש שינוי frontend)

### 10. ✅ שיפור Subscription Check Pattern
**מזהה**: TD-10  
**בוצע**: 2026-07-18 (נפתר אוטומטית ב-#1)  
**מה נעשה**:
- [x] כל subscription checks עוברים ישירות ל-`recurring_payments` — ללא fallback

---

## 🟢 P3 — שיפורים כלליים

### 11. ✅ ניקוי טבלת `device_health`
**מזהה**: TD-11  
**בוצע**: 2026-07-18  
**מה נעשה**:
- [x] אימות: אפס references בקוד
- [x] DROP TABLE device_health

### 12. ✅ ניקוי `invoice_number_counters`
**מזהה**: TD-12  
**בוצע**: 2026-07-18  
**מה נעשה**:
- [x] אימות: אפס references בקוד
- [x] DROP TABLE invoice_number_counters

### 13. ✅ הבהרת `plans.price` Column
**מזהה**: TD-13  
**בוצע**: 2026-07-18  
**מה נעשה**:
- [x] בדיקה: Column בשימוש פעיל (`subscription/page.tsx` מציג מחיר ללקוח)
- [x] לא נדרש שינוי — ה-column לגיטימי

### 14. ✅ TypeScript Response Types
**מזהה**: TD-20  
**בוצע**: 2026-07-18  
**מה נעשה**:
- [x] יצירת `src/types/api.ts` עם interfaces לכל ה-responses הנפוצים (Users, Cameras, VOD, Payments, Health, SystemStats)
- [x] בסיס ל-import ב-frontend components

### 15. ✅ Database Migration Files
**מזהה**: TD-24  
**בוצע**: 2026-07-18  
**מה נעשה**:
- [x] יצירת `supabase/migrations/20260718_baseline.sql` — מתעד כל שינויי DB של הלילה
- [x] יצירת `supabase/README.md` עם workflow לשינויי schema עתידיים

---

## שיפורי UX / פיצ'רים קטנים

### 16. ✅ Webhook Idempotency
**בוצע**: 2026-07-18  
**מה נעשה**:
- [x] הוספת idempotency check — אם payment כבר `completed`/`refunded`, דולג webhook כפול
- [x] מונע עיבוד כפול ושליחת email כפולה ב-retries

### 17. ✅ Email Notification על תשלום נכשל
**בוצע**: 2026-07-18  
**מה נעשה**:
- [x] חיבור `sendPaymentFailed()` (שכבר הייתה קיימת) ל-webhook handler
- [x] שליחת email ללקוח עם סיבת הכשלון + לינק לחשבוניות
- [x] fire-and-forget — לא שובר את ה-webhook אם המייל נכשל

### 18. ✅ Admin Dashboard — Payment Status Indicators
**בוצע**: 2026-07-18  
**מה נעשה**:
- [x] הצגת תאריך חיוב הבא מתחת badge המנוי
- [x] סטטוס תשלום אחרון עם צבעים: ירוק (שולם), אדום (נכשל), כתום (ממתין)
- [x] הצגת סכום + סטטוס בכרטיס לקוח

---

## 🟠 P1 — אבטחה ואיכות קוד (סבב שני)

### 19. ✅ Row Level Security (RLS)
**בוצע**: 2026-07-18  
**מה נעשה**:
- [x] הפעלת RLS על כל 23 הטבלאות
- [x] 16 policies: anon insert ל-subscription_requests, authenticated select על נתונים אישיים
- [x] Admin tables — deny all (רק service_role עובר)
- [x] תיקון 2 frontend components שהשתמשו ב-anon key ישירות → API routes
- [x] Migration file: `supabase/migrations/20260718_rls_policies.sql`

### 20. ✅ Supabase Singleton Migration
**בוצע**: 2026-07-18  
**מה נעשה**:
- [x] מיגרציה של 74 routes מ-inline `createClient()` ל-`getSupabaseAdmin()` singleton
- [x] רק `auth/[...nextauth]` נשאר עם createClient (מטרה אחרת)
- [x] מפחית יצירת חיבורים מיותרים + מרכז שינויים למקום אחד

### 21. ✅ Zod Input Validation
**בוצע**: 2026-07-18  
**מה נעשה**:
- [x] התקנת `zod` + יצירת `src/lib/validations.ts` עם schemas ו-`parseBody()` helper
- [x] הוספת validation ל-: POST/DELETE `/api/admin/users`, POST/DELETE `/api/admin/cameras`
- [x] בדיקת email, UUID, string length, number ranges בזמן ריצה

### 22. ✅ Unit Tests (Vitest)
**בוצע**: 2026-07-18  
**מה נעשה**:
- [x] התקנת Vitest + config עם path aliases
- [x] 6 tests ל-`rate-limit.ts` (allow, count, block, reset, isolation, timestamp)
- [x] 7 tests ל-`device-auth.ts` (sha256 format, validate valid/revoked/missing/error)
- [x] הרצה: `npm test` — 13 tests ב-100ms

### 23. ✅ מחיקת קוד מת (Mock/Test Routes)
**בוצע**: 2026-07-18  
**מה נעשה**:
- [x] מחיקת `/api/mock-grow`, `/api/mock-payplus` (7 קבצים)
- [x] מחיקת `/api/test-payplus` (1 קובץ)
- [x] סה"כ 692 שורות קוד מת הוסרו

### 24. ✅ Security Audit — Auth Guards
**בוצע**: 2026-07-18  
**מה נעשה**:
- [x] סריקת כל 80 routes לאימות auth check
- [x] יצירת `src/lib/admin-auth.ts` עם `requireAdmin()` helper
- [x] הוספת auth guard ל-46 admin routes + 2 user routes + 1 mini-pc-health
- [x] 48 חורי אבטחה נסגרו
- [x] 7 routes נשארו ציבוריים בכוונה (auth, plans, webhooks, quotes, subscribe)

### 25. ✅ Flat Routes → Nested RESTful Structure
**בוצע**: 2026-07-18  
**מה נעשה**:
- [x] העברת 8 user flat routes → `/api/user/...`
- [x] העברת 14 admin flat routes → nested תחת `invoices/`, `users/`, `system/`
- [x] מחיקת 5 routes לא בשימוש (calculate-price, payments, payplus-customers וכו')
- [x] עדכון 14+ frontend files עם נתיבים חדשים
- [x] מבנה API סופי: admin/ (17 groups), user/ (10 endpoints), ingest/, cron/, webhooks/, public/

### 26. ✅ API Error Handling Wrapper — apiHandler
**בוצע**: 2026-07-18  
**מה נעשה**:
- [x] יצירת `src/lib/api-handler.ts` עם `apiHandler()` wrapper
- [x] try/catch אוטומטי לכל handler — מונע קריסות שקטות ב-production
- [x] תגובת שגיאה אחידה: `{ success: false, error: "Internal server error" }` (status 500)
- [x] אזהרת Slow API כש-request לוקח יותר מ-3 שניות
- [x] הודעות שגיאה מפורטות רק ב-development, מוסתרות ב-production
- [x] הוחל על 15 routes שלא היה להם try/catch

### 27. ✅ Auto-Monitor Fix — Webpack + Auth
**בוצע**: 2026-07-18  
**מה נעשה**:
- [x] תיקון `Cannot find module './4243.js'` — cross-import של route handler גרם לשגיאת webpack
- [x] ביטול `import { POST } from "../monitor/route"` — שימוש ב-HTTP fetch במקום
- [x] הוספת `x-cron-secret` header כחלופה ל-session auth (scheduler לא מחזיק session)
- [x] Scheduler שולח CRON_SECRET → auto-monitor → monitor (שרשרת auth תקינה)
- [x] ניקוי `.next` cache

### 28. ✅ Console.log Cleanup
**בוצע**: 2026-07-18  
**מה נעשה**:
- [x] הסרת 51 שורות console.log מיותרות
- [x] Frontend: auth redirect, monitoring init, clip timeline
- [x] API: webhook payload dump, monitor settings dump, plans debug, subscription debug
- [x] הפחתה של ~68% (מ-~318 ל-~101 לוגים)
- [x] console.error ו-console.warn נשמרו — רק debug logs הוסרו

### 29. ✅ Nest System Routes
**בוצע**: 2026-07-18  
**מה נעשה**:
- [x] `system-alerts` → `admin/system/alerts`
- [x] `system-logs` → `admin/system/logs`
- [x] `system-stats` → `admin/system/stats`
- [x] עדכון 3 frontend references
- [x] מבנה `admin/system/` סופי: alerts, logs, stats, cleanup, cleanup-duplicate-alerts, storage-usage

### 30. ✅ Extend Zod Validation
**בוצע**: 2026-07-18  
**מה נעשה**:
- [x] `subscribeRequestSchema` — שם, אימייל, טלפון, כתובת, תוכנית
- [x] `supportRequestSchema` — הודעה (1-5000 תווים), קטגוריה (enum)
- [x] `createWithPaymentSchema` — requestId + planId (UUIDs)
- [x] `createInvoiceSchema` — userId, פריטים (שם, כמות, מחיר), billing fields
- [x] הוחל על 4 routes נוספים (סה"כ 8 routes עם Zod)

### 31. ✅ CRON_SECRET — Scheduler Auth
**בוצע**: 2026-07-18  
**מה נעשה**:
- [x] הגדרת `CRON_SECRET` ב-`.env.local` וב-Vercel production
- [x] תיקון scheduler 403 — כשאין CRON_SECRET מאפשר קריאות פנימיות ב-dev
- [x] `auto-monitor` ו-`monitor` מקבלים CRON_SECRET או admin session
- [x] Scheduler → auto-monitor → monitor שרשרת auth תקינה

### 32. ✅ apiHandler — 100% Route Coverage
**בוצע**: 2026-07-18  
**מה נעשה**:
- [x] עטיפת כל 64 routes שנותרו ב-`apiHandler` wrapper
- [x] סה"כ 79 routes עטופים (100% כיסוי)
- [x] חריג יחיד: `auth/[...nextauth]` — NextAuth מנהל שגיאות בעצמו
- [x] כל route מוגן מקריסות שקטות, כולל Slow API warnings

---

## סטטוס ביצוע

| # | פריט | סטטוס | תאריך |
|---|------|--------|--------|
| 1 | Ghost subscriptions | ✅ בוצע | 2026-07-18 |
| 2 | Cron auth | ✅ בוצע | 2026-07-18 |
| 3 | supportuploads | ✅ בוצע | 2026-07-18 |
| 4 | Soft delete | ✅ בוצע | 2026-07-18 |
| 5 | Audit log | ✅ בוצע | 2026-07-18 |
| 6 | Device token extract | ✅ בוצע | 2026-07-18 |
| 7 | Indexes | ✅ בוצע | 2026-07-18 |
| 8 | Health endpoint | ✅ בוצע | 2026-07-18 |
| 9 | Admin routes cleanup | ✅ בוצע | 2026-07-18 |
| 10 | Subscription check | ✅ נפתר ב-#1 | 2026-07-18 |
| 11 | device_health table | ✅ בוצע (DROP) | 2026-07-18 |
| 12 | invoice_number_counters | ✅ בוצע (DROP) | 2026-07-18 |
| 13 | plans.price | ✅ לא נדרש — Column בשימוש | 2026-07-18 |
| 14 | API response types | ✅ בוצע | 2026-07-18 |
| 15 | Migration files | ✅ בוצע | 2026-07-18 |
| 16 | Webhook retry | ✅ בוצע | 2026-07-18 |
| 17 | Failed payment email | ✅ בוצע | 2026-07-18 |
| 18 | Payment indicators | ✅ בוצע | 2026-07-18 |
| 19 | Row Level Security (RLS) | ✅ בוצע | 2026-07-18 |
| 20 | Supabase singleton | ✅ בוצע | 2026-07-18 |
| 21 | Zod validation | ✅ בוצע | 2026-07-18 |
| 22 | Unit tests (Vitest) | ✅ בוצע | 2026-07-18 |
| 23 | Dead code cleanup | ✅ בוצע | 2026-07-18 |
| 24 | Security audit (auth guards) | ✅ בוצע | 2026-07-18 |
| 25 | Flat → nested routes | ✅ בוצע | 2026-07-18 |
| 26 | API error handler (apiHandler) | ✅ בוצע | 2026-07-18 |
| 27 | Auto-monitor fix (webpack+auth) | ✅ בוצע | 2026-07-18 |
| 28 | Console.log cleanup (51 lines) | ✅ בוצע | 2026-07-18 |
| 29 | Nest system routes | ✅ בוצע | 2026-07-18 |
| 30 | Extend Zod validation (8 routes) | ✅ בוצע | 2026-07-18 |
| 31 | CRON_SECRET scheduler auth | ✅ בוצע | 2026-07-18 |
| 32 | apiHandler 100% coverage (79 routes) | ✅ בוצע | 2026-07-18 |

---

*נעבור פריט-פריט. כל תיקון ייבדק, ייושם, וייסגר לפני שנמשיך לבא.*

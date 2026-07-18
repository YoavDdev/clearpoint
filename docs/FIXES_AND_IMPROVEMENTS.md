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

---

*נעבור פריט-פריט. כל תיקון ייבדק, ייושם, וייסגר לפני שנמשיך לבא.*

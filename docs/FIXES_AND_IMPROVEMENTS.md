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

### 7. ☐ הוספת Composite Indexes
**מזהה**: TD-14  
**בעיה**: חיפושים נפוצים חסרי אינדקס מותאם.  
**תיקון**:
- [ ] `alerts(user_id, acknowledged, created_at DESC)`
- [ ] `vod_files(user_id, camera_id, timestamp DESC)`
- [ ] `system_logs(mini_pc_id, created_at DESC)`

### 8. ☐ הוספת `/api/health` Endpoint
**מזהה**: TD-22  
**בעיה**: אין endpoint פשוט לבדיקת health.  
**תיקון**:
- [ ] יצירת `src/app/api/health/route.ts`
- [ ] בדיקה: DB connection, environment vars loaded
- [ ] Response: `{ status: 'ok', timestamp, version }`

### 9. ☐ ניקוי Admin Routes כפולים
**מזהה**: TD-4, TD-9  
**בעיה**: 13 routes flat (`admin-*`) + 33 routes nested (`admin/*`) — אותו functionality.  
**תיקון**:
- [ ] זיהוי routes שנמצאים בשני הפורמטים
- [ ] מעבר ל-nested בלבד + redirect מהישנים
- [ ] או: מחיקת הישנים אחרי אימות שהחדשים עובדים

### 10. ☐ שיפור Subscription Check Pattern
**מזהה**: TD-10  
**בעיה**: כל בדיקת access עושה query כושלת ל-subscriptions ואז fallback.  
**תיקון**: (נפתר ב-#1 כשמסירים subscriptions)
- [ ] וידוא שאחרי תיקון #1 הבדיקה ישירה ל-`recurring_payments`

---

## 🟢 P3 — שיפורים כלליים

### 11. ☐ ניקוי טבלת `device_health`
**מזהה**: TD-11  
**בעיה**: טבלה ישנה שהוחלפה ב-`mini_pc_health` + `camera_health`.  
**תיקון**:
- [ ] וידוא שאין קוד שמשתמש בה
- [ ] Backup + DROP TABLE

### 12. ☐ ניקוי `invoice_number_counters`
**מזהה**: TD-12  
**בעיה**: הוחלפה ב-`document_number_counters`.  
**תיקון**:
- [ ] וידוא ש-`generate_invoice_number()` לא משתמש בה
- [ ] DROP TABLE

### 13. ☐ הבהרת `plans.price` Column
**מזהה**: TD-13  
**בעיה**: לא ברור אם זה list price, default, או unused.  
**תיקון**:
- [ ] בדיקת שימוש בקוד
- [ ] הוספת comment על ה-column / rename ל-`list_price`

### 14. ☐ TypeScript Response Types
**מזהה**: TD-20  
**בעיה**: API responses ללא types — frontend מנחש.  
**תיקון**:
- [ ] יצירת `src/types/api.ts` עם types ל-responses הנפוצים
- [ ] שימוש ב-types ב-frontend hooks

### 15. ☐ Database Migration Files
**מזהה**: TD-24  
**בעיה**: אין migration files — Schema רק ב-Supabase Dashboard.  
**תיקון**:
- [ ] Export של schema נוכחי כ-baseline migration
- [ ] הקמת `/supabase/migrations/` folder
- [ ] תיעוד workflow לשינויי schema

---

## שיפורי UX / פיצ'רים קטנים

### 16. ☐ Webhook Retry Logic
**בעיה**: אם webhook נכשל, PayPlus לא שולח שוב (או שכן ואנחנו לא מטפלים ב-retry).  
**תיקון**:
- [ ] בדיקת PayPlus retry policy
- [ ] הוספת idempotency check ב-webhook handler (אם חסר)

### 17. ☐ Email Notification על תשלום נכשל
**בעיה**: כשתשלום recurring נכשל, אין התראה ל-admin.  
**תיקון**:
- [ ] זיהוי כשלון ב-sync cron
- [ ] שליחת email ל-admin

### 18. ☐ Admin Dashboard — Payment Status Indicators
**בעיה**: לא תמיד ברור מה סטטוס התשלום של לקוח.  
**תיקון**:
- [ ] צבעים ברורים: ירוק (פעיל), אדום (נכשל), אפור (בוטל)
- [ ] הצגת תאריך חיוב אחרון + הבא

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
| 7 | Indexes | ☐ טרם התחיל | — |
| 8 | Health endpoint | ☐ טרם התחיל | — |
| 9 | Admin routes cleanup | ☐ טרם התחיל | — |
| 10 | Subscription check | ✅ נפתר ב-#1 | 2026-07-18 |
| 11 | device_health table | ☐ טרם התחיל | — |
| 12 | invoice_number_counters | ☐ טרם התחיל | — |
| 13 | plans.price | ☐ טרם התחיל | — |
| 14 | API response types | ☐ טרם התחיל | — |
| 15 | Migration files | ☐ טרם התחיל | — |
| 16 | Webhook retry | ☐ טרם התחיל | — |
| 17 | Failed payment email | ☐ טרם התחיל | — |
| 18 | Payment indicators | ☐ טרם התחיל | — |

---

*נעבור פריט-פריט. כל תיקון ייבדק, ייושם, וייסגר לפני שנמשיך לבא.*

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

### 1. ☐ הסרת Ghost Table `subscriptions`
**מזהה**: TD-1, TD-2, TD-3  
**בעיה**: 12+ נתיבי קוד מנסים לקרוא מטבלת `subscriptions` שלא קיימת. כל קריאה נכשלת בשקט ונופלת ל-fallback.  
**השפעה**: ~50-100ms latency מיותר בכל בקשת VOD/cameras + 3 cron jobs מתים.  
**תיקון**:
- [ ] הסרת כל ה-references ל-`subscriptions` מ-8 route files
- [ ] הסרת 3 cron jobs מתים (`process-cancellations`, `process-trials`, `resume-paused`)
- [ ] הסרת DB functions (`find_expiring_trials`, `get_subscription_status`)
- [ ] הסרת cron entries מ-`vercel.json` (אם קיימות)

**קבצים**:
- `src/app/api/user-cameras/route.ts`
- `src/app/api/user-footage/route.ts`
- `src/app/api/vod/signed-url/route.ts`
- `src/app/api/ingest/vod-context/route.ts`
- `src/app/api/ingest/vod-file/route.ts`
- `src/app/api/cron/process-cancellations/route.ts`
- `src/app/api/cron/process-trials/route.ts`
- `src/app/api/cron/resume-paused/route.ts`

---

## 🟠 P1 — תיקוני אבטחה ו-Integrity

### 2. ☐ אימות Cron Endpoints
**מזהה**: TD-16  
**בעיה**: `/api/cron/*` routes נגישים ללא auth בקוד. מסתמכים רק על Vercel.  
**תיקון**:
- [ ] הוספת `CRON_SECRET` header check לכל cron route
- [ ] דגם: `if (req.headers.get('authorization') !== \`Bearer ${process.env.CRON_SECRET}\`) return 401`

### 3. ☐ הגבלת `supportuploads` Bucket
**מזהה**: TD-15  
**בעיה**: Bucket פתוח — כל סוג קובץ, ללא הגבלת גודל.  
**תיקון**:
- [ ] הוספת RLS policy (authenticated only)
- [ ] הגבלת גודל (10MB max)
- [ ] הגבלת MIME types (image/*, video/*, application/pdf)

### 4. ☐ Soft Delete למשתמשים ולנתונים פיננסיים
**מזהה**: TD-7, TD-8  
**בעיה**: מחיקת user מוחקת cascade את כל הנתונים הפיננסיים.  
**תיקון**:
- [ ] הוספת `deleted_at` column ל-`users`
- [ ] שינוי DELETE ל-soft-delete (update deleted_at)
- [ ] הגנה על `payments` + `invoices` מ-cascade
- [ ] עדכון admin UI — "מחיקה" = soft-delete

### 5. ☐ Audit Log לפעולות Admin
**מזהה**: TD-17  
**בעיה**: אין לוג לפעולות admin — אי אפשר לחקור אירועים.  
**תיקון**:
- [ ] יצירת טבלה `admin_audit_log` (admin_id, action, target_type, target_id, details, timestamp)
- [ ] helper function: `logAdminAction()`
- [ ] שילוב בנקודות קריטיות: user create/delete, payment create, recurring cancel

---

## 🟡 P2 — שיפורי ביצועים וקוד

### 6. ☐ Extract Device Token Validation
**מזהה**: TD-18, TD-19  
**בעיה**: אותה לוגיקת אימות (20 שורות) מועתקת ב-6 ingest routes.  
**תיקון**:
- [ ] יצירת `src/lib/device-auth.ts` עם `validateDeviceToken()`
- [ ] כולל `sha256Hex()` utility
- [ ] החלפת קוד כפול ב-6 קבצים

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
| 1 | Ghost subscriptions | ☐ טרם התחיל | — |
| 2 | Cron auth | ☐ טרם התחיל | — |
| 3 | supportuploads | ☐ טרם התחיל | — |
| 4 | Soft delete | ☐ טרם התחיל | — |
| 5 | Audit log | ☐ טרם התחיל | — |
| 6 | Device token extract | ☐ טרם התחיל | — |
| 7 | Indexes | ☐ טרם התחיל | — |
| 8 | Health endpoint | ☐ טרם התחיל | — |
| 9 | Admin routes cleanup | ☐ טרם התחיל | — |
| 10 | Subscription check | ☐ טרם התחיל | — |
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

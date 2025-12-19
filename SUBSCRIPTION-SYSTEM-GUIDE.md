# 📋 מדריך מערכת המנויים והתשלומים

## 🎯 סקירה כללית

מערכת מנויים מלאה עם אוטומציה מלאה, תמיכה בהוראות קבע (כרטיס אשראי + בנקאי), וניהול גישה חכם.

---

## 🗄️ מבנה Database

### טבלת `subscriptions` (שדות חדשים):

```sql
recurring_uid              -- מזהה PayPlus recurring
payment_method             -- 'credit_card' / 'direct_debit' / 'manual'
grace_period_end          -- עד מתי יש גישה אחרי ביטול
last_payment_date         -- תאריך חיוב אחרון
next_payment_date         -- תאריך חיוב הבא
free_trial_end            -- סוף חודש חינם
payment_failures          -- ספירת כשלונות (0-3)
auto_renew                -- האם לחדש אוטומטית
cancelled_at              -- תאריך ביטול
cancellation_reason       -- סיבת ביטול
```

### טבלת `subscription_charges` (חדשה):

לוג של כל החיובים החודשיים - הצלחות וכשלונות.

```sql
id                        -- UUID
subscription_id           -- קישור למנוי
user_id                   -- קישור למשתמש
amount                    -- סכום
currency                  -- מטבע (ILS)
status                    -- 'pending' / 'success' / 'failed' / 'refunded'
transaction_id            -- PayPlus transaction UID
recurring_uid             -- PayPlus recurring UID
payment_method            -- כרטיס / בנק
error_code                -- קוד שגיאה
error_message             -- הודעת שגיאה
charged_at                -- מתי חויב
metadata                  -- JSON מ-PayPlus
```

---

## 🔄 זרימת עבודה

### 1️⃣ **תשלום ראשוני (ציוד והתקנה)**

```
לקוח משלם → חשבונית + payment נוצרים
↓
Admin יוצר מנוי חדש עם free_trial_end = +30 days
↓
לקוח מקבל גישה מלאה לחודש ראשון (חינם)
```

### 2️⃣ **יצירת הוראת קבע (אוטומטי או ידני)**

**אופציה A - אוטומטי (מומלץ):**
```
Admin: "צור הוראת קבע" → API קורא ל-PayPlus
↓
PayPlus מחזירה: recurring_uid + payment_page_link
↓
שולח לינק ללקוח → לקוח מזין כרטיס/בנק
↓
PayPlus שולחת webhook: "recurring created"
↓
Database: שומר recurring_uid
```

**אופציה B - ידני (קיים):**
```
Admin נכנס ל-PayPlus dashboard
↓
יוצר הוראת קבע ידנית
↓
מעתיק את recurring_uid
↓
מזין ב-Admin panel
```

### 3️⃣ **חיוב חודשי אוטומטי**

```
PayPlus מחייבת אוטומטית כל חודש
↓
שולחת webhook ל: /api/webhooks/payplus/recurring
↓
Webhook מעדכן:
  - subscription_charges (רשומה חדשה)
  - last_payment_date = now
  - next_payment_date = +30 days
  - payment_failures = 0
↓
לקוח ממשיך לקבל גישה
```

### 4️⃣ **כשלון בתשלום**

```
PayPlus: "חיוב נכשל" → webhook
↓
Database: payment_failures++
↓
אם failures < 3: שלח אימייל אזהרה
אם failures >= 3: status = 'suspended' + חסום גישה
```

### 5️⃣ **ביטול מנוי**

```
לקוח: "בטל מנוי" → API
↓
קריאה ל-PayPlus: DeleteRecurring (עוצר חיובים עתידיים)
↓
חישוב grace_period_end = last_payment + 30 days
↓
status = 'cancelled' + grace_period_end
↓
לקוח ממשיך לקבל גישה עד grace_period_end
```

### 6️⃣ **חידוש מנוי**

```
לקוח פונה לתמיכה
↓
Admin יוצר הוראת קבע חדשה (ללא חודש חינם)
↓
חיוב ראשון מיידי → status = 'active'
↓
גישה מופעלת תוך דקות
```

---

## 🔐 בקרת גישה

### Middleware (`/src/middleware.ts`)

בודק גישה לפני כניסה לדפים:

```typescript
/dashboard/           → דורש מנוי פעיל
/dashboard/subscription  → גישה חופשית (לניהול מנוי)
/dashboard/invoices     → גישה חופשית
/dashboard/support      → גישה חופשית
/admin/*               → רק admin
```

### פונקציית בדיקה (`check_subscription_access`)

```sql
SELECT * FROM check_subscription_access('user_id');

תחזיר:
- has_access: true/false
- reason: 'free_trial' / 'active_subscription' / 'grace_period' / 'expired' / 'payment_failed'
- expires_at: מתי פוגה הגישה
```

---

## 🔌 API Endpoints

### למשתמש:

```
GET  /api/user/subscription-status   -- בדיקת גישה וסטטוס מנוי
GET  /api/user/subscription          -- פרטי המנוי המלאים
POST /api/user/cancel-subscription   -- ביטול מנוי (עם grace period)
```

### ל-Admin:

```
GET  /api/admin/check-subscriptions  -- Cron Job יומי
POST /api/admin/create-recurring     -- יצירת הוראת קבע
```

### Webhooks:

```
POST /api/webhooks/payplus/recurring -- קבלת עדכוני חיובים מ-PayPlus
```

---

## 🤖 Cron Job - בדיקה יומית

הרץ: `/api/admin/check-subscriptions` פעם ביום (00:00)

**מה הוא עושה:**
1. מוצא מנויים שעברו `next_payment_date` ללא חיוב
2. מעלה `payment_failures++`
3. אחרי 3 כשלונות → `status = 'suspended'`
4. מוצא מנויים בוטלים שעברו `grace_period_end` → `status = 'expired'`
5. שולח אימיילים

**הגדרה ב-Vercel:**
```json
// vercel.json
{
  "crons": [{
    "path": "/api/admin/check-subscriptions",
    "schedule": "0 0 * * *"
  }]
}
```

---

## 📊 סטטוסים של מנוי

| Status | משמעות | גישה? |
|--------|--------|-------|
| `active` | פעיל | ✅ יש |
| `cancelled` | בוטל + בתקופת חסד | ✅ עד `grace_period_end` |
| `suspended` | הושעה (3+ כשלונות) | ❌ אין |
| `expired` | פג תוקף | ❌ אין |

---

## 💳 שיטות תשלום נתמכות

### 1. כרטיס אשראי (Credit Card)
- ויזה, מאסטרקארד, ישראכרט
- `payment_method = 'credit_card'`
- PayPlus שומרת את הכרטיס בצורה מאובטחת

### 2. הוראת קבע בנקאית (Direct Debit)
- דרך הבנק של הלקוח
- `payment_method = 'direct_debit'`
- לוקח 2-3 ימי עסקים להפעלה

### 3. ידני (Manual)
- Admin מעדכן ידנית
- `payment_method = 'manual'`
- לשימוש במקרים חריגים

---

## 📧 אימיילים אוטומטיים (TODO)

```
✅ חיוב הצליח     → sendPaymentSuccessEmail()
⚠️ חיוב נכשל      → sendPaymentFailureEmail()
🚫 מנוי הושעה      → sendSuspensionEmail()
👋 מנוי בוטל       → sendCancellationEmail()
⏰ תזכורת לפני חיוב → sendUpcomingChargeEmail() (3 ימים לפני)
```

---

## 🧪 בדיקות

### 1. בדיקת חודש חינם:
```sql
-- צור מנוי עם free_trial_end
INSERT INTO subscriptions (..., free_trial_end = NOW() + INTERVAL '30 days')

-- בדוק גישה
SELECT * FROM check_subscription_access('user_id');
-- אמור להחזיר: has_access = true, reason = 'free_trial'
```

### 2. בדיקת webhook:
```bash
# שלח webhook מזויף
curl -X POST http://localhost:3000/api/webhooks/payplus/recurring \
  -H "Content-Type: application/json" \
  -H "user-agent: PayPlus" \
  -d '{
    "recurring_uid": "REC-123",
    "status_code": "000",
    "amount": "149",
    "transaction_uid": "TRX-456"
  }'
```

### 3. בדיקת ביטול עם Grace:
```bash
curl -X POST http://localhost:3000/api/user/cancel-subscription \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=..." \
  -d '{"reason": "לא צריך יותר"}'

# בדוק grace_period_end
# לקוח אמור לקבל גישה עד סוף החודש ששולם
```

---

## 🚀 הפעלה

### שלב 1: הרץ Migration
```bash
# בצע ב-Supabase SQL Editor:
migrations/add-subscription-tracking-fields.sql
```

### שלב 2: הגדר Webhook ב-PayPlus
```
URL: https://your-domain.com/api/webhooks/payplus/recurring
Method: POST
Events: Recurring Payment Success/Failure
```

### שלב 3: הגדר Cron Job
```json
// vercel.json
{
  "crons": [{
    "path": "/api/admin/check-subscriptions",
    "schedule": "0 0 * * *"
  }]
}
```

### שלב 4: בדוק שהכל עובד
```bash
# 1. צור מנוי חדש (admin panel)
# 2. בדוק שהלקוח רואה חודש חינם
# 3. שלח webhook test
# 4. הרץ Cron manually
```

---

## 🎉 זהו!

המערכת מוכנה לעבודה מלאה עם:
- ✅ חודש ראשון חינם
- ✅ הוראות קבע (כרטיס + בנק)
- ✅ Webhooks אוטומטיים
- ✅ ביטול עם grace period
- ✅ בדיקה יומית
- ✅ בקרת גישה חכמה

**כל מה שצריך לעשות הוא להריץ את ה-migration ולהגדיר את PayPlus!** 🚀

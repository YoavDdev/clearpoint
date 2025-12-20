# 🔄 Phase 1: Advanced Subscription Sync & Verification

## ✅ מה יצרנו:

### **1. Database Schema (עדכון טבלאות)**
📁 `database-migrations/add-advanced-subscription-features.sql`

**עמודות חדשות ל-`subscriptions`:**
- `last_sync_with_payplus` - מתי בוצע sync אחרון
- `last_verification_at` - מתי בוצע verification אחרון
- `payplus_status` - הסטטוס מ-PayPlus
- `payment_failure_count` - ספירת כשלונות
- `grace_period_ends_at` - תאריך סיום grace period
- `suspended_at` - מתי הושעה המנוי
- `suspension_reason` - סיבת השעיה
- `sync_errors` - שגיאות sync

**טבלה חדשה: `subscription_sync_history`**
- מעקב אחרי כל פעולת sync
- סטטיסטיקות: כמה חיובים נמצאו, נוצרו, מיילים נשלחו
- שגיאות ואזהרות
- משך זמן הרצה

**סטטוסים חדשים למנויים:**
- `pending_first_payment` - חדש, ממתין לתשלום ראשון
- `payment_failed` - חיוב נכשל
- `grace_period` - תקופת חסד (יש גישה למרות כשלון)
- `suspended` - מושעה (אין גישה)
- `pending_cancellation` - ממתין לביטול

**פונקציות עזר:**
- `check_subscription_health(sub_id)` - בדיקת תקינות מנוי
- `find_subscriptions_needing_sync()` - מציאת מנויים שצריכים sync

---

### **2. API לסנכרון מנוי**
📁 `src/app/api/admin/sync-subscription/[userId]/route.ts`

**Endpoint:** `POST /api/admin/sync-subscription/:userId`

**מה זה עושה:**
1. ✅ שולף נתונים מ-PayPlus API
2. ✅ מוצא חיובים שחסרים במערכת
3. ✅ יוצר אוטומטית:
   - `subscription_charges`
   - `invoices`
   - `invoice_items`
   - `payments`
4. ✅ שולח מיילים רטרואקטיביים
5. ✅ מעדכן סטטוס מנוי
6. ✅ שומר היסטוריה ב-`subscription_sync_history`

**Response:**
```json
{
  "success": true,
  "message": "Sync completed successfully",
  "result": {
    "subscription_id": "...",
    "payplus_status": "active",
    "sync_summary": {
      "charges_found": 2,
      "charges_synced": 2,
      "invoices_created": 2,
      "emails_sent": 2
    },
    "warnings": [],
    "duration_ms": 1543
  }
}
```

---

### **3. API לאימות סטטוס Real-Time**
📁 `src/app/api/admin/verify-subscription/[userId]/route.ts`

**Endpoint:** `GET /api/admin/verify-subscription/:userId`

**מה זה עושה:**
1. ✅ שולף סטטוס מ-PayPlus בזמן אמת
2. ✅ משווה עם המערכת
3. ✅ מזהה אי התאמות
4. ✅ נותן המלצות לתיקון
5. ✅ בודק:
   - האם המנוי פעיל?
   - האם יש חובות?
   - האם התאריכים מסונכרנים?
   - האם צריך לחסום/לפתוח גישה?

**Response:**
```json
{
  "success": true,
  "verification": {
    "verified": true,
    "status": "active_and_verified",
    "system_status": "active",
    "payplus_status": "active",
    "is_synced": true,
    "has_access": true,
    "issues": [],
    "warnings": [],
    "recommendation": "NONE",
    "details": {
      "payplus": {
        "status": "active",
        "next_charge": "2026-01-20",
        "last_charge": "2025-12-20",
        "amount": "1.00"
      },
      "system": {
        "status": "active",
        "next_payment": "2026-01-20",
        "last_payment": "2025-12-20",
        "amount": "1.00",
        "payment_failures": 0
      }
    }
  },
  "actions_needed": false
}
```

**Endpoint:** `POST /api/admin/verify-subscription/:userId`
(עם `autoFix: true`)

**מה זה עושה:**
- מריץ verification
- אם `autoFix: true` - מתקן אוטומטית אי התאמות
- מחזיר רשימת פעולות שבוצעו

---

## 🚀 איך להתחיל:

### **שלב 1: רוץ את ה-Migration**

```bash
# פתח Supabase Dashboard → SQL Editor
# העתק והרץ את הקובץ:
database-migrations/add-advanced-subscription-features.sql
```

זה יוסיף:
- ✅ עמודות חדשות ל-subscriptions
- ✅ טבלת subscription_sync_history
- ✅ אינדקסים לביצועים
- ✅ פונקציות עזר

---

### **שלב 2: בדוק שזה עבד**

```sql
-- בדוק שהעמודות נוספו
SELECT column_name 
FROM information_schema.columns
WHERE table_name = 'subscriptions' 
  AND column_name LIKE '%sync%';

-- בדוק שהטבלה נוצרה
SELECT * FROM subscription_sync_history LIMIT 1;
```

---

### **שלב 3: העלה לייצור**

```bash
git add .
git commit -m "Phase 1: Add subscription sync and verification system"
git push
```

זה יעלה אוטומטית ל-Vercel.

---

## 📖 שימוש:

### **סנכרון מנוי ידני:**

```bash
# סנכרן מנוי של משתמש ספציפי
curl -X POST "https://www.clearpoint.co.il/api/admin/sync-subscription/467d8618-42bd-468a-bc9d-7220e66f9abc"
```

---

### **אימות סטטוס:**

```bash
# בדיקה בלבד
curl "https://www.clearpoint.co.il/api/admin/verify-subscription/467d8618-42bd-468a-bc9d-7220e66f9abc"

# בדיקה + תיקון אוטומטי
curl -X POST "https://www.clearpoint.co.il/api/admin/verify-subscription/467d8618-42bd-468a-bc9d-7220e66f9abc" \
  -H "Content-Type: application/json" \
  -d '{"autoFix": true}'
```

---

## 🔧 מקרי שימוש:

### **1. לקוח מתלונן שהוא שילם אבל אין לו גישה:**
```bash
# רוץ verification
curl "https://www.clearpoint.co.il/api/admin/verify-subscription/:userId"

# אם מצא בעיה - רוץ sync
curl -X POST "https://www.clearpoint.co.il/api/admin/sync-subscription/:userId"
```

### **2. אחרי תקלת Zapier:**
```bash
# סנכרן את כל המנויים שצריכים
# (בעתיד - נוסיף endpoint לזה)
for userId in $(get_all_users); do
  curl -X POST "https://www.clearpoint.co.il/api/admin/sync-subscription/$userId"
done
```

### **3. בדיקה יומית:**
```bash
# מצא מנויים שצריכים סנכרון
SELECT * FROM find_subscriptions_needing_sync();

# סנכרן אותם
```

---

## ✅ התקדמות Phase 1:

- [x] Database schema מורחב
- [x] טבלת היסטוריה
- [x] API לסנכרון
- [x] API לאימות
- [x] פונקציות עזר
- [ ] בדיקה שהכל עובד
- [ ] העלאה לייצור

---

## 🔮 Phase 2 (הבא):

1. **Cron Job יומי** - בודק אוטומטית כל יום
2. **Dashboard למעקב** - ממשק גרפי לניהול
3. **Self-Healing** - המערכת מתקנת את עצמה אוטומטית
4. **התראות** - מייל לאדמין כשיש בעיות

---

## 📝 הערות:

- API endpoints מוגנים - צריך להיות admin
- כל sync נשמר בהיסטוריה למעקב
- autoFix זהיר - רק תיקונים בטוחים
- verification לא משנה כלום ללא autoFix=true

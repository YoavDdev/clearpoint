# 📘 מדריך זרימת מנויים - Clearpoint Security

## 🎯 תהליך מלא: מלקוח חדש עד חיוב אוטומטי

---

## 1️⃣ **יצירת לקוח חדש**

### דרך המערכת:
1. היכנס ל-`/admin/customers/new`
2. מלא פרטי לקוח
3. בחר חבילה (Basic/Professional/Enterprise)
4. לחץ "צור לקוח"

### מה קורה:
```
✅ נוצר user ב-Database
✅ נוצר subscription בסטטוס 'pending'
✅ לקוח מוכן לתשלום
```

---

## 2️⃣ **יצירת קישור תשלום**

### מה לעשות:
1. בעמוד הלקוח, לחץ "שלח קישור תשלום"
2. המערכת יוצרת הוראת קבע ב-PayPlus
3. קישור נשלח ללקוח במייל

### מה נשמר:
```
✅ payment_link - קישור לדף תשלום
✅ status = 'awaiting_payment'
```

### **חשוב!** וודא ש-`more_info` נשלח:
```typescript
more_info: `${userId}|recurring|monthly`
```

---

## 3️⃣ **לקוח משלם**

### מה קורה:
1. לקוח נכנס לקישור
2. ממלא פרטי כרטיס
3. משלם את התשלום הראשוני (₪1)
4. PayPlus יוצר הוראת קבע (recurring mandate)

### מה PayPlus מחזיר:
```json
{
  "transaction_uid": "abc-123",
  "customer_uid": "payplus-customer-456",
  "recurring_uid": "recurring-789",
  "status_code": "000"
}
```

---

## 4️⃣ **Zapier מעביר ל-Webhook**

### התהליך:
```
PayPlus → Zapier → המערכת שלך
```

### Zapier שולח:
```json
{
  "source": "zapier",
  "transaction_uid": "abc-123",
  "customer_uid": "payplus-customer-456",
  "amount": 1,
  "status_code": "000",
  "more_info": "user-uuid|recurring|monthly"
}
```

---

## 5️⃣ **המערכת מעבדת את ה-Webhook**

### `/api/webhooks/payplus/recurring` עושה:

1. **מחלץ user_id** מתוך `more_info`
2. **מוצא את המנוי** ב-Database
3. **שומר חיוב** ב-`subscription_charges`:
   ```sql
   INSERT INTO subscription_charges (
     subscription_id,
     transaction_id,
     amount,
     status,
     charged_at
   )
   ```

4. **מעדכן מנוי**:
   ```sql
   UPDATE subscriptions SET
     status = 'active',
     payplus_customer_uid = 'payplus-customer-456',
     last_payment_date = NOW(),
     next_payment_date = NOW() + INTERVAL '1 month',
     payment_failures = 0
   ```

### תוצאה:
```
✅ מנוי פעיל
✅ לקוח יכול להיכנס למערכת
✅ גישה למצלמות והקלטות
```

---

## 6️⃣ **חיוב חודשי אוטומטי**

### אחרי 30 יום:

1. **PayPlus מזהה** שצריך לחייב
2. **מחייב אוטומטית** ₪1 מהכרטיס
3. **שולח Webhook** ל-Zapier
4. **Zapier → המערכת שלך**
5. **המערכת:**
   - שומרת חיוב חדש
   - מעדכנת `last_payment_date`
   - מעדכנת `next_payment_date` (+30 יום)
   - מאפסת `payment_failures` ל-0

### כשלון בחיוב:
```sql
UPDATE subscriptions SET
  payment_failures = payment_failures + 1,
  status = CASE 
    WHEN payment_failures >= 2 THEN 'suspended'
    ELSE 'active'
  END
```

---

## 7️⃣ **ביטול מנוי**

### דרך הלקוח:
1. לקוח נכנס ל-`/dashboard/subscription`
2. לוחץ "בטל מנוי"
3. ממלא סיבת ביטול
4. מאשר

### מה קורה:
1. **ביטול ב-PayPlus:**
   ```
   DELETE /RecurringPayments/DeleteRecurring
   ```

2. **חישוב Grace Period:**
   ```javascript
   gracePeriodEnd = last_payment_date + 1 month
   ```

3. **עדכון ב-Database:**
   ```sql
   UPDATE subscriptions SET
     status = 'cancelled',
     cancelled_at = NOW(),
     grace_period_end = calculated_date,
     auto_renew = false
   ```

### במשך Grace Period:
```
✅ לקוח עדיין יכול להשתמש
✅ רואה הודעה: "המנוי בוטל, גישה עד..."
⏰ מונה ימים נותרים
```

---

## 8️⃣ **Cron Job יומי**

### `/api/admin/check-subscriptions` רץ כל יום ב-2:00

**מה הוא עושה:**

1. **בודק חיובים שלא עבדו:**
   ```sql
   WHERE next_payment_date < NOW()
     AND status = 'active'
   ```
   → מעלה `payment_failures`
   → אחרי 3 כשלונות → `status = 'suspended'`

2. **בודק Grace Period שפג:**
   ```sql
   WHERE status = 'cancelled'
     AND grace_period_end < NOW()
   ```
   → מעדכן ל-`status = 'expired'`

3. **שולח התראות** (אופציונלי):
   - 3 ימים לפני סוף Grace Period
   - כשתשלום נכשל
   - כשמנוי הושעה

---

## 🔍 **סטטוסים במערכת**

| סטטוס | משמעות | גישה? |
|-------|---------|-------|
| `pending` | ממתין לתשלום ראשוני | ❌ |
| `awaiting_payment` | קישור נשלח, ממתין | ❌ |
| `active` | מנוי פעיל | ✅ |
| `cancelled` | בוטל, בתקופת חסד | ✅ (עד `grace_period_end`) |
| `suspended` | 3+ כשלונות תשלום | ❌ |
| `expired` | Grace Period עבר | ❌ |

---

## 📊 **טבלאות ב-Database**

### `subscriptions`
```
- id
- user_id
- plan_id
- status
- payplus_customer_uid ← חיבור ל-PayPlus
- recurring_uid ← הוראת הקבע
- last_payment_date
- next_payment_date
- grace_period_end
- payment_failures
- auto_renew
- cancelled_at
- cancellation_reason
```

### `subscription_charges`
```
- id
- subscription_id
- transaction_id ← מ-PayPlus
- amount
- status (success/failed)
- charged_at
```

---

## 🛠️ **API Endpoints**

| Endpoint | תיאור |
|----------|--------|
| `/api/user/subscription` | פרטי מנוי של משתמש |
| `/api/user/subscription-status` | בדיקת גישה (has_access) |
| `/api/user/subscription-charges` | היסטוריית חיובים |
| `/api/user/cancel-subscription` | ביטול מנוי |
| `/api/webhooks/payplus/recurring` | קבלת webhooks מ-Zapier |
| `/api/admin/check-subscriptions` | Cron Job יומי |

---

## ⚙️ **הגדרות Zapier**

### Trigger:
- **App:** PayPlus
- **Event:** New Charge

### Action:
- **App:** Webhooks by Zapier
- **Event:** POST
- **URL:** `https://clearpoint-security.vercel.app/api/webhooks/payplus/recurring`
- **Data:**
  ```json
  {
    "source": "zapier",
    "transaction_uid": "{{transaction_uid}}",
    "customer_uid": "{{customer_uid}}",
    "amount": "{{amount}}",
    "status_code": "{{status_code}}",
    "more_info": "{{more_info}}"
  }
  ```

---

## ✅ **Checklist להפעלה**

- [ ] הרצת migration: `add-subscription-tracking-fields.sql`
- [ ] הרצת migration: `add-payplus-customer-uid.sql`
- [ ] הגדרת Zapier Zap והפעלה
- [ ] הגדרת Cron Job ב-Vercel (כבר ב-`vercel.json`)
- [ ] בדיקת משתמש טסט
- [ ] בדיקת ביטול מנוי
- [ ] בדיקת Grace Period

---

## 🐛 **פתרון בעיות נפוצות**

### "Subscription not found" ב-Webhook:
✅ וודא ש-`payplus_customer_uid` נשמר
✅ בדוק ש-`more_info` נשלח בפורמט הנכון

### חיוב חודשי לא מתקבל:
✅ בדוק ש-Zapier Zap פעיל
✅ בדוק logs ב-Zapier
✅ בדוק logs ב-Vercel

### Cron Job לא רץ:
✅ וודא ש-`vercel.json` deployed
✅ בדוק Cron logs ב-Vercel Dashboard

---

## 📞 **תמיכה**

יש בעיה? בדוק:
1. Logs ב-Vercel
2. Zapier History
3. Database queries ב-Supabase
4. PayPlus Dashboard

**הכל עובד? מעולה! 🎉**

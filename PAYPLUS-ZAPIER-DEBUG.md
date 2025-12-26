# 🐛 פתרון בעיית PayPlus + Zapier

## ❌ הבעיה
חיוב חודשי מתבצע ב-PayPlus אבל המערכת לא מתעדכנת:
- ❌ אין חשבונית באתר
- ❌ לא רואה חיוב בהיסטוריה
- ❌ הלקוח אין לו גישה למערכת
- ❌ Supabase לא מתעדכן

## 🎯 הסיבה
ה-Webhook לא מגיע מ-Zapier למערכת, או שהוא מגיע אבל הנתונים לא נכונים.

---

## ✅ פתרון שלב אחר שלב

### שלב 1: בדוק ש-Webhook URL נכון ב-Zapier

הכנס ל-Zapier → Zap שלך → Action (Webhooks by Zapier)

**ה-URL הנכון צריך להיות:**
```
https://clearpoint-security.vercel.app/api/webhooks/payplus/recurring
```

או אם אתה על ngrok:
```
https://your-ngrok-url.ngrok-free.dev/api/webhooks/payplus/recurring
```

⚠️ **שים לב:** הכתובת חייבת להיות `/recurring` ולא רק `/payplus`!

---

### שלב 2: בדוק מה Zapier שולח

ב-Zapier, בדוק את ה-Data (Body) שאתה שולח. צריך להיות בפורמט JSON:

```json
{
  "source": "zapier",
  "transaction_uid": "{{transaction_uid}}",
  "customer_uid": "{{customer_uid}}",
  "recurring_uid": "{{recurring_uid}}",
  "amount": "{{amount}}",
  "status_code": "{{status_code}}",
  "more_info": "{{more_info}}"
}
```

**חשוב מאוד:** `more_info` חייב להכיל את ה-user_id בפורמט:
```
user-uuid-here|recurring|monthly
```

---

### שלב 3: בדוק Logs ב-Vercel

1. היכנס ל-Vercel Dashboard
2. בחר את הפרויקט Clearpoint Security
3. לחץ על "Logs" או "Runtime Logs"
4. סנן לפי: `/api/webhooks/payplus/recurring`

**חפש את ההודעות האלה:**
```
🔔 Received PayPlus recurring webhook
📥 Webhook source: Zapier
✅ Zapier webhook accepted
```

**אם אתה רואה:**
- ✅ "Received webhook" → ה-webhook מגיע
- ❌ כלום → ה-webhook לא מגיע כלל
- ❌ "Subscription not found" → הבעיה בחיפוש המנוי

---

### שלב 4: בדוק שיש Subscription ב-Supabase

היכנס ל-Supabase → Table Editor → `subscriptions`

**וודא שיש רשומה עם:**
- `user_id` = ה-UUID של הלקוח שלך
- `status` = 'active' או 'pending'
- `recurring_uid` = ה-recurring_uid מ-PayPlus (אם יש)

**אם אין subscription:** צריך ליצור אחד ידנית או דרך המערכת.

---

### שלב 5: בדוק שה-customer_uid נכון

ב-PayPlus, כשאתה יוצר הוראת קבע, PayPlus נותן לך:
- `customer_uid` - מזהה לקוח ב-PayPlus
- `recurring_uid` - מזהה הוראת הקבע

**ב-Supabase**, וודא ש:
```sql
UPDATE subscriptions 
SET payplus_customer_uid = 'customer_uid_from_payplus'
WHERE user_id = 'your_user_id';
```

---

## 🔧 פתרון מהיר: הרצה ידנית של Webhook

אם אתה רוצה לבדוק אם ה-webhook עובד, אפשר לשלוח לו בקשה ידנית:

### Postman / cURL Test:
```bash
curl -X POST https://clearpoint-security.vercel.app/api/webhooks/payplus/recurring \
  -H "Content-Type: application/json" \
  -d '{
    "source": "zapier",
    "transaction_uid": "test-123",
    "customer_uid": "test-customer",
    "recurring_uid": "test-recurring",
    "amount": 100,
    "status_code": "000",
    "more_info": "YOUR_USER_UUID|recurring|monthly"
  }'
```

**החלף:** `YOUR_USER_UUID` ב-UUID אמיתי של הלקוח מטבלת users.

---

## 📊 בדיקת Zapier History

1. היכנס ל-Zapier
2. לחץ על ה-Zap שלך
3. לחץ על "History" (למעלה)
4. בדוק את הרצת ה-Zap האחרונה

**אם יש שגיאה:**
- בדוק את ה-URL
- בדוק שה-Data שלח בפורמט JSON תקין
- בדוק שהסטטוס 200 (הצלחה) ולא 404/500

**אם הכל ירוק:** אז ה-webhook הגיע אבל הבעיה בעיבוד הנתונים.

---

## 🆘 בעיות נפוצות

### 1. "Subscription not found"
**פתרון:**
```sql
-- בדוק אם יש subscription
SELECT * FROM subscriptions WHERE user_id = 'your_user_id';

-- אם אין, צור אחד:
INSERT INTO subscriptions (
  user_id,
  plan_id,
  status,
  billing_cycle,
  amount,
  currency,
  next_payment_date
) VALUES (
  'your_user_id',
  'your_plan_id',
  'active',
  'monthly',
  100,
  'ILS',
  NOW() + INTERVAL '1 month'
);
```

### 2. Zapier לא שולח more_info
**פתרון:** ודא שב-PayPlus, כשיצרת את ההוראת קבע, הוספת `more_info`:
```
user_id|recurring|monthly
```

### 3. Webhook מגיע אבל לא יוצר invoice
**פתרון:** בדוק ש-generate_invoice_number RPC קיים:
```sql
-- בדוק אם יש
SELECT * FROM pg_proc WHERE proname = 'generate_invoice_number';

-- אם אין, צור אותו (ראה migration files)
```

---

## 🎯 הצעה: בניית דף דיאגנוסטיקה

האם תרצה שאבנה לך דף אדמין שבודק:
1. ✅ האם יש webhook endpoint
2. ✅ האם יש subscription
3. ✅ האם ה-payplus_customer_uid מוגדר
4. ✅ היסטוריית webhooks שהתקבלו
5. ✅ כפתור לשליחה ידנית של webhook טסט

זה יעזור לך לאבחן בעיות מהר יותר.

---

## 📞 מה לעשות עכשיו?

1. **בדוק Zapier History** - רואה את ה-webhook שנשלח?
2. **בדוק Vercel Logs** - רואה את ה-webhook שהתקבל?
3. **בדוק Supabase** - יש subscription עם הנתונים הנכונים?
4. **תשלח לי:**
   - Screenshot של Zapier Action (ה-URL וה-Data)
   - Screenshot של Vercel Logs אחרי חיוב
   - ה-user_id של הלקוח שמנסה לשלם

ואני אעזור לך לפתור את הבעיה! 🚀

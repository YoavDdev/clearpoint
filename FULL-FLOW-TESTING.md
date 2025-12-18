# 🧪 מדריך בדיקה מקיף - Flow מלא של מערכת החשבונות והמנויים

## 📋 סקירה כללית

מדריך זה מכסה בדיקה מלאה של כל ה-flow שנבנה היום:
1. יצירת לקוח
2. יצירת חשבונית ראשונית עם מנוי
3. תשלום ראשוני
4. הפעלת subscription
5. חשבוניות חודשיות אוטומטיות
6. אימיילים ללקוח
7. ביטול מנוי

---

## 🎯 Flow 1: יצירת לקוח חדש

### צעדים:
1. **כניסה לדף אדמין:**
   ```
   http://localhost:3000/admin/customers
   ```

2. **לחץ "הוסף לקוח חדש"**

3. **מלא פרטים:**
   - שם מלא: `John Test`
   - אימייל: `test@example.com` (או האימייל שלך לבדיקה)
   - טלפון: `050-1234567`
   - כתובת: `רחוב הבדיקה 1, תל אביב`
   - תוכנית: Plan A או Plan B

4. **שמור**

### תוצאה צפויה:
- ✅ לקוח חדש נוצר
- ✅ מופיע ברשימת הלקוחות
- ✅ יש לו מזהה ייחודי (UUID)

---

## 🎯 Flow 2: יצירת חשבונית ראשונית + מנוי

### צעדים:
1. **פתח את דף הלקוח:**
   ```
   http://localhost:3000/admin/customers/[USER_ID]
   ```

2. **גלול ל-"יצירת חשבונית חדשה"**

3. **הוסף פריטים:**
   - מצלמה 4MP × 2 = ₪900
   - NVR 8CH × 1 = ₪800
   - התקנה × 1 = ₪500
   
4. **סמן "כלול מנוי חודשי"** ✅

5. **הזן מחיר חודשי:** `149`

6. **לחץ "צור חשבונית ושלח לתשלום"**

### תוצאה צפויה:
- ✅ חשבונית נוצרה עם מספר חשבונית
- ✅ סטטוס: "sent"
- ✅ נוצר payment record ב-DB
- ✅ נוצר subscription record עם סטטוס "pending"
- ✅ לינק תשלום PayPlus נוצר (או mock אם במצב dev)

### בדיקה ב-Supabase:
```sql
-- בדוק חשבונית
SELECT * FROM invoices WHERE user_id = '[USER_ID]' ORDER BY created_at DESC LIMIT 1;

-- בדוק תשלום
SELECT * FROM payments WHERE user_id = '[USER_ID]' ORDER BY created_at DESC LIMIT 1;

-- בדוק מנוי
SELECT * FROM subscriptions WHERE user_id = '[USER_ID]' ORDER BY created_at DESC LIMIT 1;
```

---

## 🎯 Flow 3: תשלום ראשוני

### אופציה A: סימולציה (מומלץ לפיתוח)
```bash
# בטרמינל
curl -X POST http://localhost:3000/api/webhooks/payplus \
  -H "Content-Type: application/json" \
  -d '{
    "status": "completed",
    "amount": 2200,
    "transaction_id": "TEST-12345",
    "more_info": "[USER_ID]|initial|monthly"
  }'
```

### אופציה B: תשלום אמיתי
1. העתק את לינק התשלום מדף הלקוח
2. פתח בדפדפן
3. בצע תשלום דרך PayPlus (Sandbox)

### תוצאה צפויה:
- ✅ payment.status = "completed"
- ✅ invoice.status = "paid"
- ✅ subscription.status = "active"
- ✅ subscription.next_billing_date = חודש מהיום
- ✅ user.plan_duration_days = 14

### בדיקה ב-Supabase:
```sql
-- סטטוס תשלום
SELECT status, amount, paid_at FROM payments WHERE user_id = '[USER_ID]';

-- סטטוס חשבונית
SELECT invoice_number, status, total_amount FROM invoices WHERE user_id = '[USER_ID]';

-- סטטוס מנוי
SELECT status, next_billing_date, amount FROM subscriptions WHERE user_id = '[USER_ID]';
```

---

## 🎯 Flow 4: בדיקת חשבונית ראשונית

### צעדים:
1. **לך לדף הלקוח:**
   ```
   http://localhost:3000/admin/customers/[USER_ID]
   ```

2. **גלול ל-"חשבוניות הלקוח"**

3. **לחץ "צפייה" על החשבונית**

### תוצאה צפויה:
- ✅ חשבונית מוצגת יפה
- ✅ יש 2 שורות בטבלת הפריטים:
  - פריטי הציוד והתקנה
  - שורת "מנוי חודשי" עם ₪0 (חודש ראשון חינם)
- ✅ סה"כ לתשלום: רק ציוד + התקנה (לא כולל מנוי)
- ✅ סטטוס: "שולם"

---

## 🎯 Flow 5: בדיקת אימייל אישור תשלום

### בדיקה:
1. **בדוק את האימייל של הלקוח** (test@example.com)
2. **חפש מייל מ-Resend** עם נושא: "✅ אישור תשלום"

### תוכן האימייל צפוי:
- ✅ כותרת: "התשלום בוצע בהצלחה"
- ✅ פרטי התשלום: סכום, תאריך, מספר עסקה
- ✅ מידע על מנוי: "החיוב הבא: [תאריך]"
- ✅ כפתור "צפה בדשבורד שלי"

### אם לא הגיע אימייל:
- בדוק Resend Dashboard: https://resend.com/emails
- בדוק spam/junk
- בדוק לוגים בטרמינל של השרת

---

## 🎯 Flow 6: סימולציית תשלום חוזר (חודשי)

### צעדים:
```bash
# בטרמינל
curl -X POST http://localhost:3000/api/admin/simulate-recurring-payment \
  -H "Content-Type: application/json" \
  -d '{"userId": "[USER_ID]"}'
```

### תוצאה צפויה (בקונסול):
```
🔄 Simulating recurring payment for subscription: xxx
✅ Subscription updated - next billing: 2026-XX-XX
✅ Payment record created: xxx
✅ Invoice created: 2025120XXX
📧 Sending invoice email to: test@example.com
✅ Invoice email sent
📧 Monthly invoice email sent to customer
```

### תוצאה ב-DB:
- ✅ חשבונית חדשה נוצרה (invoice_number: 2025120XXX)
- ✅ תשלום חדש נוצר (payment_type: "recurring", status: "completed")
- ✅ subscription.next_billing_date התעדכן לחודש הבא
- ✅ invoice_items יש פריט אחד: "מנוי חודשי"

### בדיקה ב-Supabase:
```sql
-- חשבוניות הלקוח (צריכות להיות 2 לפחות)
SELECT invoice_number, status, total_amount, created_at 
FROM invoices 
WHERE user_id = '[USER_ID]' 
ORDER BY created_at DESC;

-- תשלומים
SELECT payment_type, status, amount, created_at 
FROM payments 
WHERE user_id = '[USER_ID]' 
ORDER BY created_at DESC;
```

---

## 🎯 Flow 7: בדיקת חשבונית חודשית

### צעדים:
1. **בדוק בדף הלקוח:**
   ```
   http://localhost:3000/admin/customers/[USER_ID]
   ```

2. **בטבלת "חשבוניות הלקוח" צריכות להיות 2:**
   - חשבונית #2025120010 (ראשונית)
   - חשבונית #2025120XXX (חודשית)

3. **לחץ "צפייה" על החשבונית החודשית**

### תוצאה צפויה:
- ✅ חשבונית מוצגת
- ✅ פריט אחד: "מנוי חודשי - [חודש] [שנה]"
- ✅ סכום: ₪149
- ✅ סטטוס: "שולם"
- ✅ **אין** שורה כחולה נוספת של "חודש ראשון חינם"

---

## 🎯 Flow 8: בדיקת אימייל חשבונית חודשית

### בדיקה:
1. **בדוק את האימייל של הלקוח**
2. **חפש מייל חדש** עם נושא: "📄 חשבונית חודשית #2025120XXX"

### תוכן האימייל צפוי:
- ✅ כותרת: "חשבונית חודשית" (בצבע סגול)
- ✅ שלום [שם הלקוח], קיבלת חשבונית חודשית חדשה
- ✅ טבלה עם פרטי החשבונית:
  - מספר חשבונית: #2025120XXX (מימין)
  - תאריך: XX.XX.2025 (משמאל)
  - סכום כולל: ₪149 (משמאל)
- ✅ פריטים: מנוי חודשי
- ✅ הודעה: "זוהי חשבונית חודשית אוטומטית"
- ✅ כפתור "צפה בחשבונית המלאה"

---

## 🎯 Flow 9: בדיקת ניהול מנוי

### צעדים:
1. **לך לדף הלקוח:**
   ```
   http://localhost:3000/admin/customers/[USER_ID]
   ```

2. **גלול ל-"חיוב חודשי אוטומטי"**

### תוצאה צפויה:
- ✅ סטטוס: "פעיל" (ירוק)
- ✅ מחיר חודשי: ₪149
- ✅ חיוב הבא: [תאריך חודש הבא]
- ✅ תאריך הפעלה: [תאריך ההתקנה]
- ✅ הודעה: "החיוב מתבצע אוטומטית דרך PayPlus"
- ✅ כפתורים: "צור לינק מחדש", "ביטול מנוי"

---

## 🎯 Flow 10: ביטול מנוי

### צעדים:
1. **בדף הלקוח, בחלק "ניהול מנוי"**
2. **לחץ "ביטול מנוי"**
3. **אשר את הפעולה**

### תוצאה צפויה:
- ✅ subscription.status = "cancelled"
- ✅ הודעה: "המנוי בוטל בהצלחה"
- ✅ כפתור "ביטול מנוי" נעלם
- ✅ סטטוס משתנה ל-"מבוטל" (אדום)

### בדיקה ב-Supabase:
```sql
SELECT status, cancelled_at 
FROM subscriptions 
WHERE user_id = '[USER_ID]';
```

---

## 🎯 Flow 11: בדיקת page payment-success

### צעדים:
1. **פתח:**
   ```
   http://localhost:3000/invoice-payment-success?invoice_id=[INVOICE_ID]
   ```

### תוצאה צפויה:
- ✅ מסך הצלחה ירוק
- ✅ "התשלום בוצע בהצלחה"
- ✅ טבלה עם פרטי החשבונית:
  - מספר חשבונית (מימין): #2025120XXX (משמאל)
  - סכום ששולם (מימין): ₪XXX (משמאל)
  - שם לקוח (מימין): John Test (משמאל)
- ✅ **אין** בלוק "מה הלאה?"
- ✅ כפתור "חזרה לדף הבית"
- ✅ כפתור "צפה בחשבונית"

### בדיקת הכפתור "צפה בחשבונית":
- ✅ לוחצים על הכפתור
- ✅ עובר לדף החשבונית (`/invoice/[id]`)
- ✅ מציג את החשבונית המלאה (ללא redirect חזרה!)

---

## ✅ Checklist מלא

### יצירה ותשלום ראשוני:
- [ ] יצירת לקוח חדש עובדת
- [ ] יצירת חשבונית עם מנוי עובדת
- [ ] תשלום ראשוני מעדכן סטטוסים
- [ ] חשבונית ראשונית מוצגת נכון (עם שורת "חודש ראשון חינם")
- [ ] אימייל אישור תשלום נשלח

### תשלומים חוזרים:
- [ ] סימולציית תשלום חוזר עובדת
- [ ] חשבונית חודשית נוצרת אוטומטית
- [ ] חשבונית חודשית מוצגת נכון (ללא שורה כחולה)
- [ ] אימייל חשבונית חודשית נשלח
- [ ] תאריך חיוב הבא מתעדכן

### אימיילים:
- [ ] אימייל אישור תשלום נכון (עם מנוי)
- [ ] אימייל חשבונית חודשית נכון
- [ ] טבלאות באימיילים מיושרות נכון (RTL)
- [ ] כל האימיילים מגיעים ל-Resend

### דפים:
- [ ] דף payment-success מוצג נכון (ללא "מה הלאה")
- [ ] דף payment-success טבלה מיושרת נכון (RTL)
- [ ] כפתור "צפה בחשבונית" עובד (ללא redirect)
- [ ] דף החשבונית מוצג תמיד (גם אחרי תשלום)

### ניהול מנוי:
- [ ] ניהול מנוי בדף הלקוח עובד
- [ ] ביטול מנוי עובד
- [ ] סטטוס מנוי מתעדכן נכון

---

## 🚨 בעיות נפוצות ופתרונות

### אימייל לא הגיע:
1. בדוק Resend Dashboard
2. בדוק `RESEND_API_KEY` ב-.env.local
3. בדוק לוגים בטרמינל: "📧 Sending invoice email"

### Webhook לא עובד:
1. בדוק ngrok רץ: `ngrok http 3000`
2. בדוק הגדרת webhook ב-PayPlus Dashboard
3. בדוק לוגים: `/api/webhooks/payplus`

### חשבונית לא נוצרת:
1. בדוק שהמנוי active: `SELECT * FROM subscriptions`
2. בדוק לוגים בסימולציה
3. בדוק שיש `generate_invoice_number` function ב-Supabase

### טבלאות לא מיושרות:
1. בדוק שיש `dir="rtl"` על האלמנטים
2. בדוק ב-Resend Dashboard איך האימייל נראה
3. נסה לפתוח באימייל שונה (Gmail, Outlook)

---

## 📊 SQL Queries שימושיות

```sql
-- כל החשבוניות של לקוח
SELECT invoice_number, status, total_amount, has_subscription, created_at
FROM invoices
WHERE user_id = '[USER_ID]'
ORDER BY created_at DESC;

-- כל התשלומים של לקוח
SELECT payment_type, status, amount, created_at
FROM payments
WHERE user_id = '[USER_ID]'
ORDER BY created_at DESC;

-- סטטוס מנוי
SELECT status, amount, next_billing_date, last_billing_date, created_at
FROM subscriptions
WHERE user_id = '[USER_ID]';

-- פריטי חשבונית ספציפית
SELECT item_name, item_description, quantity, unit_price, total_price
FROM invoice_items
WHERE invoice_id = '[INVOICE_ID]'
ORDER BY sort_order;

-- כל החשבוניות החודשיות
SELECT i.invoice_number, i.total_amount, i.created_at, u.full_name
FROM invoices i
JOIN users u ON i.user_id = u.id
JOIN invoice_items ii ON ii.invoice_id = i.id
WHERE ii.item_type = 'subscription'
ORDER BY i.created_at DESC;
```

---

## 🎉 סיכום

אם כל הבדיקות עברו בהצלחה - **המערכת מוכנה לפרודקשן!** 🚀

רק צריך:
1. להגדיר את משתני הסביבה של PayPlus בפרודקשן
2. לוודא ש-Resend מוגדר נכון
3. לבדוק webhook אמיתי אחד לפני השקה

**בהצלחה!** 🎊

# ✅ רשימת בדיקות - סידור מערכת PayPlus

## 🎯 **מה עשינו עד כה:**

### ✅ **1. עדכון טקסטים בממשק**
- [x] דף החשבונית (`/invoice/[id]`) - שונה מ-"Grow Payment Gateway" ל-"PayPlus"
- [x] ממשק הפעלת מנוי (`SubscriptionManager`) - שונה מ-"Grow Payment" ל-"PayPlus"
- [x] הודעות שגיאה ב-API routes - כל ההודעות מעודכנות

---

## 📋 **רשימת בדיקות לפני השקה:**

### **שלב 1: הגדרות סביבה (Environment Variables)**

בדוק שקיים קובץ `.env.local` עם המשתנים הבאים:

```bash
# PayPlus Configuration
PAYPLUS_API_KEY=your_api_key_here
PAYPLUS_SECRET_KEY=your_secret_key_here
PAYPLUS_PAYMENT_PAGE_UID=your_page_uid_here
PAYPLUS_API_URL=https://restapi.payplus.co.il/api/v1.0

# Base URL
NEXT_PUBLIC_BASE_URL=https://clearpoint.co.il

# Mock Mode (false בפרודקשן!)
PAYPLUS_USE_MOCK=false
```

**📌 איך לקבל API Keys:**
1. היכנס ל: https://www.payplus.co.il/
2. Settings → API
3. העתק: API Key, Secret Key, Payment Page UID

---

### **שלב 2: הגדרת Webhook ב-PayPlus**

1. היכנס ל-PayPlus Dashboard
2. Settings → Webhooks
3. הוסף Webhook URL:
   ```
   https://clearpoint.co.il/api/webhooks/payplus
   ```
4. סמן את כל סוגי האירועים:
   - ✅ Payment Success
   - ✅ Payment Failed
   - ✅ Recurring Payment Success
   - ✅ Recurring Payment Failed

**📌 בדיקה שה-webhook עובד:**
```bash
curl https://clearpoint.co.il/api/webhooks/payplus

# אמור להחזיר:
{
  "message": "Payplus webhook endpoint is active",
  "timestamp": "..."
}
```

---

### **שלב 3: בדיקת זרימת חשבונית (Installation Payment)**

#### **3.1 יצירת חשבונית מהאדמין:**
1. לך ל: `/admin/customers/[id]`
2. לחץ על "💰 צור חשבונית ושלח לתשלום"
3. הוסף פריטים (מצלמות, NVR, וכו')
4. לחץ "צור חשבונית ושלח לינק תשלום"
5. **ודא שקיבלת לינק תשלום PayPlus**

#### **3.2 בדיקת דף החשבונית:**
1. פתח את הלינק שקיבלת
2. ודא שהחשבונית נראית יפה ומקצועית
3. **ודא שכתוב בתחתית: "תשלום מאובטח באמצעות PayPlus"**
4. לחץ על כפתור התשלום
5. אמור להפנות לדף התשלום של PayPlus

#### **3.3 ביצוע תשלום בדיקה:**
1. השתמש בכרטיס בדיקה של PayPlus (אם במצב Staging)
2. השלם את התשלום
3. **ודא שהופנית לדף הצלחה:** `/invoice-payment-success`
4. ודא שהחשבונית התעדכנה בדאטהבייס לסטטוס "paid"

---

### **שלב 4: בדיקת מנוי חודשי (Recurring Subscription)**

#### **4.1 הפעלת מנוי חודשי:**
1. לך ל: `/admin/customers/[id]`
2. גלול למטה ל-"💳 ניהול מנוי חודשי"
3. הגדר מחיר חודשי (לדוגמה: ₪149)
4. לחץ "הפעל מנוי חודשי"
5. **ודא שכתוב: "החיוב אוטומטי דרך PayPlus"**

#### **4.2 בדיקת המנוי בדאטהבייס:**
```sql
SELECT * FROM subscriptions WHERE user_id = 'USER_ID';
```
ודא:
- `provider` = 'payplus'
- `status` = 'active'
- `next_billing_date` = תאריך בעוד חודש
- `provider_subscription_id` = יש ערך (recurring_uid מ-PayPlus)

---

### **שלב 5: בדיקת Webhooks**

#### **5.1 מעקב אחרי Logs:**
```bash
# בטרמינל, הרץ את Next.js במצב development:
npm run dev

# צפה בלוגים כשאתה מבצע תשלום
```

אמור לראות:
```
🔔 Payplus Webhook received
📦 Webhook payload: {...}
✅ Webhook signature verified
💳 Payment status: completed
✅ Payment updated successfully
```

#### **5.2 ודא שהדאטהבייס מתעדכן:**
```sql
-- בדוק שהתשלום עודכן
SELECT * FROM payments 
WHERE provider_transaction_id = 'TRANSACTION_ID_FROM_WEBHOOK';

-- ודא:
-- status = 'completed'
-- paid_at = timestamp של עכשיו
-- provider_payment_id = transaction_uid מ-PayPlus
```

---

### **שלב 6: בדיקת חיוב חודשי חוזר**

**⚠️ שים לב:** חיוב חוזר ראשון יתבצע רק בעוד חודש!

**לבדיקה מיידית:**
1. ב-PayPlus Dashboard → Recurring Payments
2. מצא את המנוי שיצרת
3. לחץ "Charge Now" (אם זמין)
4. או: שנה את `start_date` ל-היום בדאטהבייס (רק לבדיקה!)

---

## 🐛 **פתרון בעיות נפוצות:**

### **❌ "Payplus API configuration is missing"**
**פתרון:**
1. ודא שכל המשתנים ב-`.env.local` נכונים
2. הפעל מחדש את Next.js: `npm run dev`
3. בדוק שאין טעויות כתיב

### **❌ "Invalid webhook signature"**
**פתרון:**
1. ודא ש-`PAYPLUS_SECRET_KEY` זהה לזה ב-PayPlus Dashboard
2. בדוק ש-PayPlus שולח header: `hash` ו-`user-agent: PayPlus`
3. צפה בלוגים ב-webhook handler

### **❌ "Failed to create PayPlus payment"**
**פתרון:**
1. ודא שה-`PAYPLUS_PAYMENT_PAGE_UID` נכון
2. בדוק שהחשבון PayPlus פעיל ומאושר
3. בדוק במצב Staging קודם: `PAYPLUS_API_URL=https://restapidev.payplus.co.il/api/v1.0`

### **❌ "Webhooks לא מגיעים"**
**פתרון:**
1. ודא ש-Webhook URL נגיש: `https://clearpoint.co.il/api/webhooks/payplus`
2. בדוק ב-PayPlus Dashboard → Webhooks → Logs
3. ודא שה-URL נכון ונגיש מהאינטרנט

---

## ✅ **Checklist סופי להשקה:**

```
[ ] משתני סביבה מוגדרים ונכונים
[ ] Webhook מוגדר ב-PayPlus Dashboard
[ ] בדיקת תשלום חד-פעמי עבר בהצלחה
[ ] בדיקת מנוי חודשי נוצר בהצלחה
[ ] Webhook מקבל עדכונים ומעדכן DB
[ ] דף החשבונית מציג "PayPlus" ולא "Grow"
[ ] דף הצלחה מופיע אחרי תשלום
[ ] הכל עובד במצב production! 🎉
```

---

## 📞 **תמיכה:**

אם יש בעיה:
1. 📖 **Docs:** https://docs.payplus.co.il/
2. 📧 **Email:** [email protected]
3. 💬 **Support:** דרך חשבון PayPlus

---

**בהצלחה! 🚀**

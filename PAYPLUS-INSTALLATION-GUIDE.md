# 🚀 מדריך התקנה - Payplus Integration

---

## ✅ **מה נבנה:**

1. ✅ **lib/payplus.ts** - ספריית API מלאה
2. ✅ **api/webhooks/payplus/route.ts** - Webhook handler
3. ✅ **תאימות מלאה** - כל הקוד הקיים עובד ללא שינוי!

---

## 📋 **שלבי ההתקנה**

### **שלב 1: הרשמה ל-Payplus** 🎫

```
1. היכנס ל: https://www.payplus.co.il/signup
2. מלא את הפרטים והירשם
3. המתן לאישור (1-2 ימי עבודה)
4. קבל אישור + גישה לחשבון
```

---

### **שלב 2: קבלת API Credentials** 🔑

```
1. היכנס ל: https://www.payplus.co.il/
2. לחץ Settings → API
3. העתק:
   - API Key
   - Secret Key
   - Payment Page UID
```

---

### **שלב 3: הגדרת Environment Variables** ⚙️

הוסף ל-`.env.local`:

```bash
# ============================================
# Payplus Payment Gateway
# ============================================

# API Credentials (קבל מ-Payplus Dashboard)
PAYPLUS_API_KEY=your_api_key_here
PAYPLUS_SECRET_KEY=your_secret_key_here
PAYPLUS_PAYMENT_PAGE_UID=your_payment_page_uid_here

# Environment (production או staging)
PAYPLUS_API_URL=https://restapi.payplus.co.il/api/v1.0
# לבדיקה השתמש ב:
# PAYPLUS_API_URL=https://restapidev.payplus.co.il/api/v1.0

# Mock Mode (לפיתוח בלי API אמיתי)
PAYPLUS_USE_MOCK=false
# שנה ל-true אם רוצה לבדוק בלי Payplus אמיתי

# Base URL (לwebhooks)
NEXT_PUBLIC_BASE_URL=https://your-domain.com
# לפיתוח מקומי:
# NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

---

### **שלב 4: הגדרת Webhook URL ב-Payplus** 🔔

```
1. היכנס ל-Payplus Dashboard
2. Settings → Webhooks
3. הוסף Webhook URL:
   https://your-domain.com/api/webhooks/payplus
   
4. סמן:
   ✅ Payment Success
   ✅ Payment Failed
   ✅ Recurring Payment Success
   ✅ Recurring Payment Failed
   
5. שמור
```

**לפיתוח מקומי (localhost):**
```
אתה צריך לחשוף את localhost לאינטרנט:

אופציה 1 - Ngrok:
$ ngrok http 3000
→ מקבל: https://abc123.ngrok.io
→ Webhook URL: https://abc123.ngrok.io/api/webhooks/payplus

אופציה 2 - Cloudflare Tunnel:
$ cloudflared tunnel --url http://localhost:3000
```

---

### **שלב 5: עדכון הקוד הקיים** 🔄

**אין צורך לשנות כלום!** 

אבל אם אתה רוצה להשתמש ב-Payplus במקום Grow:

#### אופציה A: שינוי גלובלי (כל הפרויקט)

```bash
# 1. מצא והחלף את כל ה-imports:
# Before:
import { createRecurringSubscription } from '@/lib/grow';

# After:
import { createRecurringSubscription } from '@/lib/payplus';
```

#### אופציה B: שינוי סלקטיבי (רק ב-API routes)

דוגמה - עדכון `/api/admin/activate-subscription/route.ts`:

```typescript
// Before:
import { createRecurringSubscription } from "@/lib/grow";

// After:
import { createRecurringSubscription } from "@/lib/payplus";

// שאר הקוד נשאר אותו דבר!
```

---

### **שלב 6: בדיקה** 🧪

#### **בדיקה 1: Webhook Endpoint**
```bash
curl https://your-domain.com/api/webhooks/payplus

# Expected:
{
  "message": "Payplus webhook endpoint is active",
  "timestamp": "2025-11-09T13:00:00.000Z"
}
```

#### **בדיקה 2: יצירת Payment Link**
```typescript
// בקוד שלך:
import { createOneTimePayment } from '@/lib/payplus';

const result = await createOneTimePayment({
  sum: 149.00,
  description: "בדיקת תשלום",
  customer_name: "יוסי כהן",
  customer_email: "test@example.com",
  customer_phone: "0501234567",
});

console.log("Payment Link:", result.data?.pageUrl);
// → https://payment.payplus.co.il/xxx-xxx-xxx
```

#### **בדיקה 3: יצירת Recurring Subscription**
```typescript
import { createRecurringSubscription } from '@/lib/payplus';

const result = await createRecurringSubscription({
  customer_id: "user_123",
  amount: 149.00,
  description: "מנוי חודשי Wi-Fi Cloud",
  customer_name: "יוסי כהן",
  customer_email: "test@example.com",
  customer_phone: "0501234567",
  billing_cycle: "monthly",
});

console.log("Recurring Link:", result.data?.pageUrl);
// → https://payment.payplus.co.il/recurring/xxx-xxx-xxx
```

---

## 🔄 **Migration מ-Grow ל-Payplus**

### **קבצים שצריך לעדכן:**

```
src/
├── app/
│   └── api/
│       └── admin/
│           ├── activate-subscription/route.ts      ✏️ שנה import
│           ├── create-complete-payment/route.ts    ✏️ שנה import
│           ├── create-invoice/route.ts             ✏️ שנה import (אם קיים)
│           └── regenerate-payment-link/route.ts    ✏️ שנה import
```

### **דוגמה לשינוי:**

**Before (Grow):**
```typescript
import { createRecurringSubscription, calculateNextBillingDate } from "@/lib/grow";
```

**After (Payplus):**
```typescript
import { createRecurringSubscription, calculateNextBillingDate } from "@/lib/payplus";
```

**זהו! שאר הקוד נשאר זהה!** ✅

---

## 🎯 **Mock Mode (לפיתוח בלי Payplus)**

אם אין לך עדיין API Keys:

```bash
# ב-.env.local:
PAYPLUS_USE_MOCK=true
```

זה יאפשר לך:
- ✅ לפתח ולבדוק את הזרימה
- ✅ לראות את כל הלוגיקה עובדת
- ✅ בלי לחייב כרטיסי אשראי אמיתיים
- ✅ בלי צורך ב-API Keys

**כשמוכן ל-production:**
```bash
PAYPLUS_USE_MOCK=false
PAYPLUS_API_KEY=your_real_api_key
PAYPLUS_SECRET_KEY=your_real_secret_key
PAYPLUS_PAYMENT_PAGE_UID=your_real_page_uid
```

---

## 🐛 **Troubleshooting**

### ❌ **"Payplus API configuration is missing"**
```
פתרון:
1. ודא ש-.env.local מכיל את כל המשתנים
2. הפעל מחדש את Next.js dev server
3. בדוק שאין שגיאות כתיב
```

### ❌ **"Invalid webhook signature"**
```
פתרון:
1. ודא ש-PAYPLUS_SECRET_KEY נכון
2. בדוק ש-Payplus שולח headers: hash, user-agent
3. בדוק logs: console.log בwebhook handler
```

### ❌ **"Payment link not working"**
```
פתרון:
1. בדוק שה-payment_page_uid נכון
2. ודא שהחשבון Payplus מאושר
3. בדוק במצב Staging קודם
```

### ❌ **"Webhooks not received"**
```
פתרון:
1. ודא ש-Webhook URL נגיש מהאינטרנט
2. בדוק ב-Payplus Dashboard → Webhooks → Logs
3. השתמש ב-ngrok/cloudflared לפיתוח מקומי
4. ודא שה-URL נכון: https://your-domain.com/api/webhooks/payplus
```

---

## 📊 **Comparison: Grow vs Payplus**

| תכונה | **Grow** | **Payplus** | הערות |
|-------|----------|-------------|-------|
| **API Structure** | Single endpoint | Multiple endpoints | Payplus יותר RESTful |
| **Authentication** | pageCode + apiKey | api-key + secret-key | Payplus יותר מאובטח |
| **Webhook Validation** | processToken | HMAC SHA256 | Payplus יותר מאובטח |
| **Response Format** | Custom | Standard REST | Payplus יותר סטנדרטי |
| **Error Handling** | status: '1'/'0' | results.status | שניהם טובים |

---

## ✅ **Checklist התקנה**

```
[ ] 1. נרשמתי ל-Payplus
[ ] 2. קיבלתי API Keys
[ ] 3. הוספתי למשתני סביבה (.env.local)
[ ] 4. הגדרתי Webhook URL ב-Payplus
[ ] 5. עדכנתי imports בקבצי API
[ ] 6. הרצתי את Next.js dev server מחדש
[ ] 7. בדקתי שה-webhook endpoint עובד (GET /api/webhooks/payplus)
[ ] 8. יצרתי Payment Link ראשון
[ ] 9. ביצעתי תשלום בדיקה
[ ] 10. קיבלתי webhook callback
[ ] 11. הכל עובד! 🎉
```

---

## 🎉 **מוכן לעבודה!**

```
עכשיו אתה יכול:

✅ ליצור תשלומים חד-פעמיים
✅ ליצור מנויים חודשיים
✅ לקבל webhooks אוטומטיים
✅ לעדכן את ה-DB אוטומטית
✅ לחסוך ₪358/חודש לעומת Grow! 💰

בהצלחה! 🚀
```

---

## 📞 **תמיכה**

יש בעיה? צריך עזרה?

1. 📖 **Documentation:** https://docs.payplus.co.il/reference/introduction
2. 📧 **Email:** [email protected]
3. 💬 **Support:** דרך חשבון Payplus
4. 🐛 **Debug:** הפעל console.log בקוד

---

**Good luck! 🎯**

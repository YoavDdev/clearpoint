# ✅ Checklist - אינטגרציית מערכת תשלומים

## 📋 שלב 1: משתני סביבה (.env.local)

### ודא שיש לך את המשתנים הבאים:

```bash
# Grow (Meshulam) API
GROW_API_URL=https://secure.meshulam.co.il
GROW_PAGE_CODE=<your_page_code>
GROW_API_KEY=<your_api_key>
GROW_USER_ID=<your_user_id>

# Application URLs
NEXT_PUBLIC_BASE_URL=http://localhost:3000  # שנה לפי הסביבה

# Supabase
SUPABASE_SERVICE_ROLE_KEY=<your_service_role_key>
NEXT_PUBLIC_SUPABASE_URL=<your_supabase_url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your_anon_key>
```

### 🔍 בדיקה מהירה:
```bash
# הרץ בטרמינל:
npm run dev

# אם אתה רואה שגיאות על משתנים חסרים - תוסיף אותם!
```

---

## 📁 שלב 2: קבצים שנוצרו - וידוא

### ✅ API Routes:
- [x] `/src/app/api/payments/create-one-time/route.ts`
- [x] `/src/app/api/payments/create-subscription/route.ts`  
- [x] `/src/app/api/payments/webhook/grow/route.ts`

### ✅ Library:
- [x] `/src/lib/grow.ts`

### ✅ Database:
- [x] טבלאות: `payments`, `subscriptions`, `subscription_history`
- [x] Views: `active_subscriptions_with_users`, `recent_payments`, `upcoming_billings`
- [x] RLS Policies
- [x] Triggers

---

## 🧪 שלב 3: בדיקת API Routes

### 1️⃣ בדיקת build:
```bash
npm run build
```

**תוצאה צפויה:** ✅ Build succeeds without errors

**אם יש שגיאות:**
- בדוק שכל ה-imports תקינים
- ודא ש-TypeScript מרוצה

---

### 2️⃣ בדיקת API endpoints (dev mode):

```bash
npm run dev
```

השרת רץ על `http://localhost:3000`

---

### 3️⃣ בדיקה ידנית עם Postman/Thunder Client:

#### Test 1: בדיקת webhook endpoint (ציבורי - ללא auth)

**Request:**
```
POST http://localhost:3000/api/payments/webhook/grow
Content-Type: application/json

{
  "status": "1",
  "data": {
    "customFields": {
      "cField1": "test-payment-id",
      "cField2": "test-user-id"
    },
    "transactionId": "12345",
    "sum": "100",
    "asmachta": "67890"
  }
}
```

**תוצאה צפויה:** 
- Status 401 (אם אין signature) 
- או Status 200 (אם ה-signature verification עובד)

---

#### Test 2: בדיקת create-one-time (דורש authentication)

**⚠️ לא ניתן לבדוק ישירות ללא token!**

נצטרך ליצור דף UI פשוט או לבדוק דרך הדפדפן עם משתמש מחובר.

---

## 🎨 שלב 4: יצירת דף בדיקה פשוט

בואו ניצור דף פשוט לבדיקת התשלומים:

### `/src/app/test-payment/page.tsx`

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function TestPaymentPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const router = useRouter();

  const testOneTimePayment = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/payments/create-one-time', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: 'plan-a', // או plan-b
          items: [
            { name: 'Router SIM', quantity: 1, price: 500, description: 'ציוד' }
          ],
          returnUrl: window.location.origin + '/dashboard'
        })
      });

      const data = await response.json();
      setResult(data);

      // אם יש URL תשלום - נפתח אותו
      if (data.success && data.paymentUrl) {
        window.location.href = data.paymentUrl;
      }
    } catch (error) {
      console.error('Payment error:', error);
      setResult({ error: String(error) });
    } finally {
      setLoading(false);
    }
  };

  const testSubscription = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/payments/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: 'plan-a',
          billingCycle: 'monthly',
          returnUrl: window.location.origin + '/dashboard'
        })
      });

      const data = await response.json();
      setResult(data);

      if (data.success && data.paymentUrl) {
        window.location.href = data.paymentUrl;
      }
    } catch (error) {
      console.error('Subscription error:', error);
      setResult({ error: String(error) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8" dir="rtl">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold mb-8">🧪 בדיקת מערכת תשלומים</h1>

        <div className="space-y-4">
          <button
            onClick={testOneTimePayment}
            disabled={loading}
            className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'טוען...' : 'בדיקת תשלום חד-פעמי'}
          </button>

          <button
            onClick={testSubscription}
            disabled={loading}
            className="w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'טוען...' : 'בדיקת מנוי חודשי'}
          </button>
        </div>

        {result && (
          <div className="mt-8 bg-gray-100 p-4 rounded-lg">
            <h3 className="font-bold mb-2">תוצאה:</h3>
            <pre className="text-sm overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}

        <div className="mt-8 border-t pt-8">
          <h3 className="font-bold mb-4">📊 מידע למפתחים:</h3>
          <ul className="text-sm text-gray-600 space-y-2">
            <li>✅ משתמש חייב להיות מחובר (Supabase Auth)</li>
            <li>✅ צריך משתני סביבה של Grow</li>
            <li>✅ Webhook URL: /api/payments/webhook/grow</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
```

---

## 🚀 שלב 5: הרצה ובדיקה

### 1. הרץ את השרת:
```bash
npm run dev
```

### 2. התחבר כמשתמש:
- גש ל-`http://localhost:3000/login`
- התחבר עם משתמש קיים

### 3. גש לדף הבדיקה:
```
http://localhost:3000/test-payment
```

### 4. לחץ על הכפתורים ובדוק:
- ✅ האם יש שגיאות ב-console?
- ✅ האם מתקבל response מה-API?
- ✅ האם יש redirect ל-Grow?

---

## 🐛 פתרון בעיות נפוצות

### שגיאה: "Unauthorized"
**פתרון:** ודא שהמשתמש מחובר (session קיים)

### שגיאה: "GROW_API_KEY is not defined"
**פתרון:** הוסף את המשתנה ל-`.env.local` והפעל מחדש את השרת

### שגיאה: "User not found"
**פתרון:** ודא שהמשתמש קיים בטבלת `users` ב-Supabase

### שגיאה: "Plan not found"
**פתרון:** ודא שה-`planId` קיים בטבלת `plans`

### Build errors
**פתרון:** 
```bash
rm -rf .next
npm run build
```

---

## ✅ Checklist סופי

- [ ] כל משתני הסביבה מוגדרים
- [ ] Build עובר בהצלחה
- [ ] Server רץ בלי שגיאות
- [ ] API routes מגיבים (אפילו עם errors - זה בסדר)
- [ ] דף הבדיקה נטען
- [ ] יש response מה-API (success או error)

---

## 📞 מה הלאה?

לאחר שהכל עובד:
1. ✅ שלב את כפתורי התשלום לדף Subscribe
2. ✅ צור דף היסטוריית תשלומים
3. ✅ צור דף ניהול מנוי
4. ✅ הגדר webhook ב-Grow (בפרודקשן)


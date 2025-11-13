# 📚 מדריך מקיף ל-Payplus API

---

## 🎯 **סיכום מה למדתי**

Payplus API היא **REST API** מלאה עם תיעוד מצוין, Interactive Explorer, וכל מה שצריך לבנות אינטגרציה מקצועית.

---

## 🔑 **1. Authentication (הזדהות)**

### Credentials שצריך:
```javascript
{
  "api-key": "YOUR_API_KEY",           // מפתח API
  "secret-key": "YOUR_SECRET_KEY",     // מפתח סודי
  "payment_page_uid": "YOUR_PAGE_UID"  // מזהה דף תשלום
}
```

### איך משתמשים:
```javascript
// כל request צריך headers:
headers: {
  "Content-Type": "application/json",
  "api-key": "YOUR_API_KEY",
  "secret-key": "YOUR_SECRET_KEY"
}
```

### איפה מוצאים את ה-Credentials?
1. היכנס לחשבון Payplus
2. Settings → API
3. העתק: API Key, Secret Key, Payment Page UID

---

## 🌐 **2. Environment URLs**

### Staging (בדיקה):
```
https://restapidev.payplus.co.il/api/v1.0/
```

### Production (ייצור):
```
https://restapi.payplus.co.il/api/v1.0/
```

**חשוב:** השתמש ב-Staging credentials עם Staging URL ו-Production credentials עם Production URL!

---

## 💳 **3. יצירת Payment Link (תשלום חד-פעמי)**

### Endpoint:
```
POST /PaymentPages/GenerateLink
```

### Request:
```javascript
POST https://restapidev.payplus.co.il/api/v1.0/PaymentPages/GenerateLink

Headers:
{
  "Content-Type": "application/json",
  "api-key": "YOUR_API_KEY",
  "secret-key": "YOUR_SECRET_KEY"
}

Body:
{
  // חובה
  "payment_page_uid": "xxx-xxx-xxx",
  "amount": 149.00,
  "currency_code": "ILS",
  
  // פרטי לקוח
  "customer": {
    "customer_name": "יוסי כהן",
    "email": "yossi@example.com",
    "phone": "0501234567"
  },
  
  // Callbacks & Redirects
  "refURL_callback": "https://my-site.com/api/webhooks/payplus",
  "refURL_success": "https://my-site.com/payment/success",
  "refURL_failure": "https://my-site.com/payment/cancel",
  
  // אופציונלי - שליחת metadata
  "more_info": "payment_id|user_id|invoice_id",
  
  // אופציונלי - פריטים מפורטים
  "items": [
    {
      "name": "NVR 16 ערוצים",
      "quantity": 1,
      "price": 1200.00
    },
    {
      "name": "מצלמה 5MP",
      "quantity": 4,
      "price": 450.00
    }
  ],
  
  // אופציונלי - חשבונית
  "create_invoice": true,
  "invoice_language": "he",
  
  // אופציונלי - אימיילים
  "sendEmailApproval": false,  // לא לשלוח אימייל הצלחה
  "sendEmailFailure": false,   // לא לשלוח אימייל כשלון
  
  // אופציונלי - קבלת callback גם על כשלון
  "send_failure_callback": true
}
```

### Response:
```javascript
{
  "results": {
    "status": "success",
    "code": 0,
    "description": "payment page link has been generated"
  },
  "data": {
    "page_request_uid": "0e8789bf-9eaf-4a07-9c16-0a348a4fd5d9",
    "payment_page_link": "https://payment.payplus.co.il/0e8789bf-9eaf-4a07-9c16-0a348a4fd5d9"
  }
}
```

### שימוש:
```javascript
// שלח את payment_page_link ללקוח
// הלקוח פותח את הלינק → משלם
// Payplus שולח callback ל-refURL_callback
```

---

## 🔄 **4. יצירת Recurring Payment (מנוי חודשי)**

### Endpoint:
```
POST /RecurringPayments/Add
```

### Request:
```javascript
POST https://restapidev.payplus.co.il/api/v1.0/RecurringPayments/Add

Headers:
{
  "Content-Type": "application/json",
  "api-key": "YOUR_API_KEY",
  "secret-key": "YOUR_SECRET_KEY"
}

Body:
{
  // חובה
  "payment_page_uid": "xxx-xxx-xxx",
  "amount": 149.00,
  "currency_code": "ILS",
  
  // הגדרות Recurring
  "charge_method": "Regular",         // סוג חיוב
  "charge_frequency": "Monthly",      // Monthly/Yearly
  "start_date": "2025-11-09",        // תאריך התחלה (YYYY-MM-DD)
  
  // אופציונלי - תאריך סיום
  "end_date": null,                   // null = אין סיום
  
  // פרטי לקוח
  "customer": {
    "customer_name": "יוסי כהן",
    "email": "yossi@example.com",
    "phone": "0501234567",
    "customer_uid": "user_12345"      // מזהה לקוח שלך
  },
  
  // תיאור
  "description": "מנוי חודשי Wi-Fi Cloud",
  
  // Callback
  "callback_url": "https://my-site.com/api/webhooks/payplus/recurring",
  
  // Metadata
  "more_info": "subscription_id|user_id|plan_id"
}
```

### Response:
```javascript
{
  "results": {
    "status": "success",
    "code": 0,
    "description": "recurring payment created successfully"
  },
  "data": {
    "recurring_uid": "REC-123-456-789",
    "payment_page_link": "https://payment.payplus.co.il/recurring/REC-123-456-789",
    "status": "pending"  // pending עד שהלקוח משלם פעם ראשונה
  }
}
```

### זרימה:
```
1. יצירת Recurring Payment דרך API
   ↓
2. קבלת payment_page_link
   ↓
3. שליחת הלינק ללקוח
   ↓
4. לקוח פותח → מזין כרטיס → משלם
   ↓
5. Payplus שומר את פרטי הכרטיס
   ↓
6. כל חודש (או שנה) Payplus מחייב אוטומטית
   ↓
7. Callback נשלח לכל חיוב
```

---

## 🔔 **5. Webhooks/Callbacks**

### מה זה?
כאשר תשלום מתבצע (הצלחה או כשלון), Payplus שולח **POST request** ל-URL שהגדרת.

### Callback URL:
```javascript
// בקריאת API שלח:
"refURL_callback": "https://my-site.com/api/webhooks/payplus"
```

### מה Payplus שולח?

#### Headers:
```javascript
{
  "user-agent": "PayPlus",
  "hash": "yb4ViUaVO6OFdF9iyISKtCi+cXTvWm0+3e/sQkPsNS0=",  // חתימה דיגיטלית
  "content-type": "application/json"
}
```

#### Body (GET או POST parameters):
```javascript
{
  // Transaction Details
  "transaction_uid": "TRX-123-456",
  "payment_request_uid": "REQ-789-012",
  "page_request_uid": "0e8789bf-9eaf-4a07-9c16-0a348a4fd5d9",
  
  // Payment Info
  "amount": "149.00",
  "currency": "ILS",
  "type": "regular",  // או "recurring"
  
  // Status
  "status_code": "000",  // 000 = success
  "approval_num": "1234567",
  "voucher_num": "789012",
  
  // Card Info
  "four_digits": "1234",
  "card_type": "Visa",
  "card_exp": "12/25",
  
  // Customer
  "customer_name": "יוסי כהן",
  "email": "yossi@example.com",
  "phone": "0501234567",
  
  // Metadata (מה ששלחת ב-more_info)
  "more_info": "payment_id|user_id|invoice_id",
  
  // Timestamps
  "created": "2025-11-09 14:23:45",
  "transaction_date": "2025-11-09"
}
```

### Status Codes:
```javascript
"000" = הצלחה ✅
"001" = כרטיס נדחה ❌
"002" = כרטיס גנוב ❌
"003" = תקשר לחברת אשראי ❌
"006" = שגיאת CVV ❌
// ... ועוד
```

---

## 🔐 **6. Webhook Validation (אבטחה)**

**חשוב מאוד!** צריך לוודא שה-callback באמת מגיע מ-Payplus ולא מהאקר!

### איך מאמתים:

```javascript
// Node.js Example
import crypto from 'crypto';

function validatePayplusCallback(request, secretKey) {
  // 1. בדוק User-Agent
  if (request.headers['user-agent'] !== 'PayPlus') {
    return false;
  }
  
  // 2. קבל את ה-hash מ-headers
  const receivedHash = request.headers['hash'];
  if (!receivedHash) {
    return false;
  }
  
  // 3. צור hash על ה-body
  const message = JSON.stringify(request.body);
  const calculatedHash = crypto
    .createHmac('sha256', secretKey)
    .update(message)
    .digest('base64');
  
  // 4. השווה
  return calculatedHash === receivedHash;
}

// שימוש:
export async function POST(req: NextRequest) {
  const secretKey = process.env.PAYPLUS_SECRET_KEY!;
  
  // אמת את הבקשה
  if (!validatePayplusCallback(req, secretKey)) {
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 401 }
    );
  }
  
  // עבד את התשלום
  const payload = await req.json();
  
  if (payload.status_code === '000') {
    // עדכן DB - התשלום הצליח!
    await updatePaymentStatus(payload.transaction_uid, 'completed');
  } else {
    // עדכן DB - התשלום נכשל
    await updatePaymentStatus(payload.transaction_uid, 'failed');
  }
  
  return NextResponse.json({ success: true });
}
```

---

## 🧪 **7. Testing (בדיקות)**

### Interactive API Explorer:
```
Payplus מציעים Interactive Explorer ישירות בתיעוד!

1. היכנס ל: https://docs.payplus.co.il/reference/introduction
2. בחר endpoint (למשל GenerateLink)
3. מלא את ה-parameters
4. לחץ "Try It!"
5. תקבל response אמיתי!
```

### Sandbox Environment:
```
URL: https://restapidev.payplus.co.il/api/v1.0/

- קבל Sandbox credentials מ-Payplus
- השתמש בהם עם Staging URL
- בצע בדיקות ללא חיוב אמיתי
- לאחר בדיקה מוצלחת → עבור ל-Production
```

---

## 📊 **8. Additional APIs**

### Customers API:
```
POST /Customers/Add           - הוסף לקוח
POST /Customers/Update        - עדכן לקוח
GET  /Customers/View          - צפה בלקוחות
POST /Customers/Remove        - הסר לקוח
```

### Tokens API (שמירת כרטיסים):
```
POST /Token/Add               - שמור כרטיס
POST /Token/Remove            - הסר כרטיס
GET  /Token/View              - צפה בכרטיס
POST /Token/Update            - עדכן כרטיס
```

### Products API:
```
POST /Products/Add            - הוסף מוצר
POST /Products/Update         - עדכן מוצר
GET  /Products/View           - צפה במוצרים
```

### Recurring Management:
```
POST /RecurringPayments/Update           - עדכן מנוי
POST /RecurringPayments/DeleteRecurring  - בטל מנוי
GET  /RecurringPayments/View             - צפה במנויים
GET  /RecurringPayments/ViewRecurring    - פרטי מנוי ספציפי
```

---

## 🎯 **9. Best Practices**

### ✅ מומלץ:
```
✅ תמיד אמת webhooks עם hash validation
✅ השתמש ב-more_info לשלוח metadata
✅ שמור את recurring_uid ב-database שלך
✅ טפל ב-failed callbacks (send_failure_callback: true)
✅ בדוק את status_code לפני עדכון DB
✅ השתמש ב-Staging לפני Production
✅ שמור logs של כל API call
✅ טפל ב-errors בצורה graceful
```

### ❌ לא מומלץ:
```
❌ לא לאמת webhooks (חשוף להאקרים!)
❌ לא לטפל ב-failed payments
❌ לסמוך על client-side data
❌ לשכוח לבדוק status_code
❌ לעשות API calls מה-frontend (חשוף את ה-keys!)
❌ לא לשמור logs
```

---

## 🔄 **10. Migration מ-Grow ל-Payplus**

### מה צריך לשנות:

#### 1. Environment Variables:
```bash
# Before (Grow):
GROW_API_KEY=xxx
GROW_PAGE_CODE=xxx
GROW_API_URL=xxx

# After (Payplus):
PAYPLUS_API_KEY=xxx
PAYPLUS_SECRET_KEY=xxx
PAYPLUS_PAYMENT_PAGE_UID=xxx
PAYPLUS_API_URL=https://restapi.payplus.co.il/api/v1.0
```

#### 2. API Functions:
```typescript
// Before (Grow):
import { createRecurringSubscription } from '@/lib/grow';

// After (Payplus):
import { createRecurringSubscription } from '@/lib/payplus';
// אותה signature, implementation שונה!
```

#### 3. Webhook Handler:
```typescript
// Before:
POST /api/webhooks/grow

// After:
POST /api/webhooks/payplus
// parsing שונה, אבל logic אותו דבר
```

### זמן המרה משוער:
```
✅ יצירת lib/payplus.ts: 2-3 שעות
✅ המרת webhook handler: 1 שעה
✅ בדיקות: 2 שעות
✅ סה"כ: יום עבודה אחד!
```

---

## 📞 **11. תמיכה**

### Technical Support:
```
Email: [email protected]
טלפון: (מצוין בחשבון)

טיפ: תמיד כלול:
- API call שעשית (request + response)
- Error message
- Transaction UID
- Timestamp
```

### Documentation:
```
📖 Docs: https://docs.payplus.co.il/reference/introduction
🧪 Interactive Explorer: בכל endpoint
💬 FAQ: https://www.payplus.co.il/faq/
```

---

## 🎉 **סיכום**

Payplus API היא:
```
✅ REST API מלאה
✅ תיעוד מצוין באנגלית
✅ Interactive Explorer
✅ Sandbox Environment
✅ Webhook Validation
✅ Recurring Payments
✅ Customer Management
✅ Token Management
✅ Products Management
✅ חברה ישראלית מבוססת
✅ תמיכה בעברית

💰 עלות:
- Staging (חינם)
- Production: ₪193.90/חודש + עמלות

🚀 מוכן להתחלה!
```

---

**הבא: בניית lib/payplus.ts** 🎯

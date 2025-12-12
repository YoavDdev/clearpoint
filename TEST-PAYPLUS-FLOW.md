# 🧪 בדיקת זרימת PayPlus - מדריך מעשי

## 📋 **תרחיש 1: תשלום חד-פעמי (חשבונית התקנה)**

### **שלב 1: יצירת חשבונית מהאדמין**

1. פתח: `https://clearpoint.co.il/admin/customers`
2. בחר לקוח או צור לקוח חדש
3. לחץ על הלקוח → תגיע לדף `/admin/customers/[id]`
4. גלול למטה ל-**"💰 צור חשבונית ושלח לתשלום"**
5. הוסף פריטים:
   - מחשב NVR 8CH: ₪800
   - מצלמה 4MP × 4: ₪1,800
   - POE Switch 8P: ₪400
   - עבודת התקנה: ₪500
   - **סה"כ: ₪3,500**
6. לחץ **"צור חשבונית ושלח לינק תשלום"**

### **מה אמור לקרות:**

```javascript
// API Call: POST /api/admin/create-invoice
{
  "userId": "user-uuid",
  "items": [
    { "item_type": "nvr", "item_name": "מחשב NVR 8CH", ... },
    ...
  ],
  "notes": "תנאי תשלום: 30 יום",
  "customerName": "יוסי כהן",
  "customerEmail": "[email protected]"
}

// Response:
{
  "success": true,
  "invoice": {
    "id": "inv-uuid",
    "invoice_number": "INV-2024-001",
    "total_amount": 3500
  },
  "payment": {
    "id": "payment-uuid",
    "paymentUrl": "https://payment.payplus.co.il/xxx-xxx-xxx"
  },
  "invoiceUrl": "https://clearpoint.co.il/invoice/inv-uuid"
}
```

### **שלב 2: שליחת הלינק ללקוח**

1. העתק את ה-`invoiceUrl`
2. שלח ללקוח בוואטסאפ/אימייל:
   ```
   שלום יוסי,
   
   החשבונית שלך מוכנה! 
   לתשלום מאובטח: https://clearpoint.co.il/invoice/inv-uuid
   
   תודה,
   צוות Clearpoint
   ```

### **שלב 3: הלקוח משלם**

1. הלקוח פותח את הלינק
2. רואה חשבונית יפה עם כל הפריטים
3. **רואה בתחתית: "תשלום מאובטח באמצעות PayPlus"**
4. לוחץ **"💳 לחץ כאן לתשלום מאובטח"**
5. מועבר ל-PayPlus
6. מזין פרטי כרטיס אשראי
7. לוחץ "שלם"

### **שלב 4: Webhook מתקבל**

```javascript
// PayPlus שולח POST /api/webhooks/payplus
{
  "transaction_uid": "12345-67890",
  "amount": "3500.00",
  "status_code": "000",  // ✅ הצלחה
  "customer_name": "יוסי כהן",
  "email": "[email protected]",
  "more_info": "payment-uuid|user-uuid|plan-uuid"
}

// המערכת:
// 1. מאמתת חתימה ✓
// 2. מעדכנת payments.status = 'completed' ✓
// 3. מעדכנת payments.paid_at = NOW() ✓
// 4. מעדכנת invoices.status = 'paid' ✓
```

### **שלב 5: הלקוח רואה הצלחה**

הלקוח מועבר אוטומטית ל:
```
https://clearpoint.co.il/invoice-payment-success?invoice_id=inv-uuid
```

מקבל מסך:
```
✅ התשלום בוצע בהצלחה!

פרטי חשבונית:
- מספר חשבונית: #INV-2024-001
- סכום ששולם: ₪3,500.00
- שם לקוח: יוסי כהן

מה הלאה?
✓ אישור תשלום נשלח לכתובת המייל שלך
✓ הצוות שלנו יצור איתך קשר בקרוב
✓ ההתקנה תתואם בהתאם לתאריך המועדף
```

---

## 📋 **תרחיש 2: מנוי חודשי (Recurring)**

### **שלב 1: הפעלת מנוי מהאדמין**

1. פתח: `/admin/customers/[id]`
2. גלול ל-**"💳 ניהול מנוי חודשי"**
3. בחר תוכנית: **"Wi-Fi Cloud - Unlimited"**
4. הגדר מחיר מותאם: **₪149.00**
5. **ודא שכתוב: "החיוב אוטומטי דרך PayPlus"**
6. לחץ **"הפעל מנוי חודשי"**

### **מה אמור לקרות:**

```javascript
// API Call: POST /api/admin/activate-subscription
{
  "userId": "user-uuid",
  "planId": "plan-uuid",
  "customPrice": 149.00
}

// המערכת קוראת ל-PayPlus:
await createRecurringSubscription({
  customer_id: "user-uuid",
  amount: 149.00,
  currency: "ILS",
  description: "Clearpoint Security - Wi-Fi Cloud",
  customer_name: "יוסי כהן",
  customer_email: "[email protected]",
  customer_phone: "0501234567",
  billing_cycle: "monthly",
  start_date: "2024-12-24", // בעוד חודש!
  notify_url: "https://clearpoint.co.il/api/webhooks/payplus"
});

// Response מ-PayPlus:
{
  "status": "1",
  "data": {
    "pageUrl": "https://payment.payplus.co.il/recurring/xxx-xxx",
    "recurringUid": "rec-12345",
    "processId": "proc-67890"
  }
}

// המערכת יוצרת ב-DB:
INSERT INTO subscriptions (
  user_id,
  plan_id,
  provider,
  provider_subscription_id,
  status,
  billing_cycle,
  amount,
  custom_price,
  next_billing_date,
  created_at
) VALUES (
  'user-uuid',
  'plan-uuid',
  'payplus',
  'rec-12345',
  'active',
  'monthly',
  149.00,
  149.00,
  '2024-12-24',
  NOW()
);
```

### **שלב 2: חיוב חודשי ראשון (בעוד חודש)**

ב-24/12/2024, PayPlus מבצע חיוב אוטומטי:

```javascript
// PayPlus שולח Webhook:
POST /api/webhooks/payplus
{
  "transaction_uid": "recurring-12345",
  "amount": "149.00",
  "status_code": "000",
  "type": "recurring",  // 🔄 זה חיוב חוזר!
  "more_info": "payment-uuid|user-uuid|plan-uuid"
}

// המערכת:
// 1. מזהה שזה recurring ✓
// 2. מוצאת את המנוי לפי user_id ✓
// 3. מעדכנת:
//    - last_billing_date = '2024-12-24'
//    - next_billing_date = '2025-01-24'
// 4. יוצרת רשומת payment חדשה:
INSERT INTO payments (
  user_id,
  amount,
  status,
  payment_type,
  description,
  provider,
  provider_payment_id,
  paid_at
) VALUES (
  'user-uuid',
  '149.00',
  'completed',
  'recurring',
  'חיוב חודשי אוטומטי - 24/12/2024',
  'payplus',
  'recurring-12345',
  NOW()
);
```

### **שלב 3: חיובים חודשיים נוספים**

כל חודש, PayPlus ממשיך לחייב אוטומטית:
- 24/01/2025 → ₪149
- 24/02/2025 → ₪149
- 24/03/2025 → ₪149
- ...

**והמערכת מעדכנת אוטומטית את ה-DB כל פעם! 🔄**

---

## 🧪 **בדיקות שכדאי לעשות:**

### **בדיקה 1: Webhook Endpoint**

```bash
curl https://clearpoint.co.il/api/webhooks/payplus

# צפוי:
{
  "message": "Payplus webhook endpoint is active",
  "timestamp": "2024-11-24T12:00:00.000Z"
}
```

### **בדיקה 2: יצירת חשבונית**

```bash
# ב-Browser Console בדף האדמין:
fetch('/api/admin/create-invoice', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'USER_ID_HERE',
    items: [
      {
        item_type: 'nvr',
        item_name: 'מחשב NVR 8CH',
        item_description: 'מחשב מקצועי לניהול מצלמות',
        quantity: 1,
        unit_price: 800,
        total_price: 800
      }
    ],
    notes: 'בדיקה',
    customerName: 'בדיקה',
    customerEmail: '[email protected]'
  })
})
.then(r => r.json())
.then(console.log);
```

### **בדיקה 3: בדיקת DB אחרי תשלום**

```sql
-- ראה את התשלום האחרון
SELECT 
  p.id,
  p.amount,
  p.status,
  p.payment_type,
  p.provider,
  p.provider_payment_id,
  p.paid_at,
  u.full_name as customer_name
FROM payments p
LEFT JOIN users u ON p.user_id = u.id
ORDER BY p.created_at DESC
LIMIT 5;

-- ראה מנויים פעילים
SELECT 
  s.id,
  u.full_name,
  pl.name_he as plan_name,
  s.amount,
  s.custom_price,
  s.status,
  s.next_billing_date,
  s.provider_subscription_id
FROM subscriptions s
LEFT JOIN users u ON s.user_id = u.id
LEFT JOIN plans pl ON s.plan_id = pl.id
WHERE s.status = 'active'
ORDER BY s.created_at DESC;
```

---

## ✅ **Checklist לפני Production:**

```
[ ] API Keys מוגדרים ב-.env.local
[ ] PAYPLUS_USE_MOCK=false (לא במצב בדיקה!)
[ ] Webhook מוגדר ב-PayPlus Dashboard
[ ] GET /api/webhooks/payplus עובד
[ ] יצירת חשבונית עובדת
[ ] דף חשבונית מציג "PayPlus" (לא "Grow")
[ ] תשלום בדיקה עבר בהצלחה
[ ] Webhook התקבל ועדכן את ה-DB
[ ] מנוי חודשי נוצר בהצלחה
[ ] הכל עובד! 🎉
```

---

## 🐛 **Debug Tips:**

### אם Webhook לא מגיע:

```bash
# 1. בדוק ב-PayPlus Dashboard:
# Settings → Webhooks → Logs

# 2. בדוק שהשרת נגיש:
curl https://clearpoint.co.il/api/webhooks/payplus

# 3. ראה Logs בטרמינל:
npm run dev
# צפה בהדפסות כשמבצעים תשלום

# 4. Debug ידני:
# src/app/api/webhooks/payplus/route.ts
console.log("📦 Webhook payload:", JSON.stringify(payload, null, 2));
```

### אם התשלום לא מתעדכן ב-DB:

```sql
-- ראה את הלוגים
SELECT * FROM payments 
WHERE provider_transaction_id = 'TRANSACTION_ID_FROM_PAYPLUS'
ORDER BY created_at DESC;

-- אם אין רשומה - Webhook לא הגיע!
-- אם status = 'pending' - Webhook הגיע אבל נכשל עדכון
```

---

**בהצלחה! 🚀**

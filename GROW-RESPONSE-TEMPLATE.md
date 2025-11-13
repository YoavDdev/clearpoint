# תשובה ל-Grow - הבהרת דרישות טכניות

---

## תודה על התשובה המהירה!

אני חושב שלא הסברתי את הצורך שלי בצורה ברורה מספיק.

---

## הצורך העסקי שלי:

אני מפעיל **מערכת CRM** למעקב אחר לקוחות שירות מצלמות אבטחה בענן.

יש לי **שני סוגי תשלומים** שצריכים להתבצע **באופן אוטומטי**:

---

### 1️⃣ תשלום התקנה (חד-פעמי)

**תיאור:**
- כאשר מגיע לקוח חדש, אני יוצר לו **חשבונית התקנה מפורטת**
- החשבונית כוללת פריטים שונים:
  - NVR (מקליט)
  - מצלמות (כמות משתנה)
  - POE Switch
  - כבלים
  - עבודת התקנה
  - אביזרים נוספים

**מה אני צריך מהמערכת:**
- ✅ יצירת Payment Link **באופן אוטומטי** דרך **API**
- ✅ שליחת הפריטים וסכומים ל-Grow
- ✅ קבלת URL חזרה
- ✅ שליחת ה-URL ללקוח דרך המערכת שלי (SMS/Email)
- ✅ Webhook notification כאשר הלקוח משלם

**למה Payment Link ידני לא מתאים:**
- יש לי עשרות לקוחות חדשים בחודש
- כל חשבונית שונה (פריטים ומחירים משתנים)
- אני לא יכול להיכנס ידנית לפאנל Grow בכל פעם

---

### 2️⃣ מנוי חודשי (Recurring Subscription)

**תיאור:**
- אחרי ההתקנה, הלקוח מקבל **מנוי חודשי** לשירות הענן
- המחיר: ₪149-₪189 לחודש (תלוי בתוכנית)
- המנוי ממשיך **אוטומטית** עד שהלקוח מבטל

**מה אני צריך מהמערכת:**
- ✅ יצירת Recurring Subscription **באופן אוטומטי** דרך **API**
- ✅ התשלום הראשון - הלקוח משלם דרך Payment Link
- ✅ Grow שומר את פרטי הכרטיס
- ✅ **חיוב אוטומטי** כל חודש (ללא התערבות!)
- ✅ Webhook notification לכל חיוב חודשי
- ✅ עדכון אוטומטי במערכת שלי

**למה הו"ק ידני לא מתאים:**
- יש לי מאות מנויים פעילים
- אני לא יכול להגדיר הו"ק ידנית לכל לקוח
- אני צריך שהמערכת תטפל בזה אוטומטית

---

## הפתרון הטכני שאני מחפש:

### דרישות טכניות:

1. **REST API Access:**
   - ✅ יכולת ליצור Payment Links דרך API
   - ✅ יכולת ליצור Recurring Subscriptions דרך API
   - ✅ שליחת metadata (מזהה לקוח, מזהה חשבונית)

2. **Webhook Notifications:**
   - ✅ עדכון כאשר תשלום הצליח/נכשל
   - ✅ עדכון כאשר חיוב חודשי בוצע
   - ✅ עדכון כאשר מנוי בוטל

3. **Recurring Payments:**
   - ✅ שמירת פרטי כרטיס אשראי
   - ✅ חיוב אוטומטי חודשי
   - ✅ ניהול מחזור חיובים

4. **Sandbox/Test Environment:**
   - ✅ סביבת בדיקה לפני production

---

## השאלות שלי:

### API & Integration:
1. ✅ האם Grow תומך ב-REST API לכל הפעולות האלו?
2. ✅ איפה אפשר למצוא את התיעוד המלא של ה-API?
3. ✅ מה ה-endpoints הזמינים?

### Payment Links:
4. ✅ אפשר ליצור Payment Links דרך API עם פריטים מפורטים?
5. ✅ הלינק תקף לכמה זמן?
6. ✅ אפשר לשלוח metadata (customer_id, invoice_id)?

### Recurring Payments:
7. ✅ איך מגדירים Recurring Subscription דרך API?
8. ✅ מה קורה אם חיוב חודשי נכשל?
9. ✅ האם הלקוח מקבל התראה לפני כל חיוב?
10. ✅ איך מבטלים מנוי דרך API?

### Webhooks:
11. ✅ איך מגדירים Webhook URL?
12. ✅ אילו אירועים נשלחים?
13. ✅ מה המבנה של ה-payload?
14. ✅ יש חתימה דיגיטלית לאימות?

### Testing:
15. ✅ יש סביבת Sandbox?
16. ✅ אפשר לבדוק לפני שמתחילים לשלם את ה-₪500+מע"מ?

### Pricing:
17. ✅ העלות של ₪500+מע"מ חלה גם בתקופת הטסטים?
18. ✅ יש הנחה לעסקים חדשים בשנה הראשונה?

---

## דוגמה טכנית למה שאני צריך:

### תרחיש 1: יצירת חשבונית התקנה

```javascript
// API Call שאני רוצה לעשות מהמערכת שלי:
POST https://api.grow.co.il/create-payment
{
  "pageCode": "MY_PAGE_CODE",
  "apiKey": "MY_API_KEY",
  "action": "createProcess",
  
  "sum": "2500.00",
  "currency": "ILS",
  "description": "התקנה - לקוח יוסי כהן",
  
  "items": [
    { "name": "NVR 16 ערוצים", "quantity": 1, "price": 1200 },
    { "name": "מצלמה 5MP", "quantity": 4, "price": 450 },
    { "name": "POE Switch 8 ערוצים", "quantity": 1, "price": 600 },
    { "name": "כבלים 100 מטר", "quantity": 1, "price": 150 },
    { "name": "עבודת התקנה", "quantity": 1, "price": 100 }
  ],
  
  "customerId": "user_12345",
  "invoiceId": "INV-2025-001",
  
  "fullName": "יוסי כהן",
  "email": "yossi@example.com",
  "phone": "0501234567",
  
  "notifyUrl": "https://my-crm.com/webhook/grow",
  "successUrl": "https://my-crm.com/payment/success",
  "cancelUrl": "https://my-crm.com/payment/cancel"
}

// מה אני מצפה לקבל חזרה:
{
  "status": "1",
  "data": {
    "pageUrl": "https://payment.grow.co.il/process/ABC123",
    "processId": "PRC123456",
    "transactionId": "TRX789012"
  }
}
```

### תרחיש 2: יצירת מנוי חודשי

```javascript
// API Call למנוי חוזר:
POST https://api.grow.co.il/create-recurring
{
  "pageCode": "MY_PAGE_CODE",
  "apiKey": "MY_API_KEY",
  "action": "createProcess",
  
  "sum": "149.00",
  "currency": "ILS",
  "description": "מנוי חודשי Wi-Fi Cloud - יוסי כהן",
  
  "isRecurring": 1,
  "recurringCycle": 1,  // 1 = חודשי
  "recurringStartDate": "2025-11-09",
  
  "customerId": "user_12345",
  "subscriptionId": "SUB-2025-001",
  
  "fullName": "יוסי כהן",
  "email": "yossi@example.com",
  "phone": "0501234567",
  
  "notifyUrl": "https://my-crm.com/webhook/grow"
}
```

---

## סיכום:

אני לא מחפש פתרון ידני דרך הפאנל.

אני צריך **אינטגרציה מלאה דרך API** שמאפשרת:
- ✅ אוטומציה מלאה
- ✅ חיובים חוזרים אוטומטיים
- ✅ Webhook notifications
- ✅ ניהול מאות לקוחות

האם Grow תומך בזה?
איפה אפשר למצוא את התיעוד הטכני המלא?

תודה רבה!

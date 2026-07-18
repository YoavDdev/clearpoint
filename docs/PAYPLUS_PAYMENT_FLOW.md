# PayPlus Payment Flow — ניתוח מלא ותוכנית עבודה

> מסמך זה מתאר את מצב מערכת התשלומים הנוכחי, מה עובד, מה שבור, ומה צריך לבנות.  
> נוצר: 2026-07-18  

---

## 1. ארכיטקטורת המערכת

```
┌───────────────────────────────────────────────────────────────────┐
│                         ADMIN PANEL                               │
│                                                                   │
│  /admin/requests       → אישור בקשות + שליחת לינק תשלום התקנה    │
│  /admin/customers/[id] → צפייה בלקוח + לינק להוראות קבע          │
│  /admin/recurring-payments → צפייה/סנכרון/השהיה/מחיקה של הו"ק    │
│  /admin/invoices       → ניהול חשבוניות                           │
└───────────────────────┬───────────────────────────────────────────┘
                        │
         ┌──────────────┼──────────────┐
         ▼              ▼              ▼
┌─────────────┐  ┌────────────┐  ┌──────────────┐
│ Supabase DB │  │ PayPlus    │  │ Cron Jobs    │
│             │  │ REST API   │  │              │
│ - users     │  │            │  │ sync-payplus │
│ - payments  │  │ - Customer │  │ -recurring   │
│ - invoices  │  │ - Payment  │  │              │
│ - recurring │  │ - Recurring│  │ auto-monitor │
│   _payments │  │ - Webhook  │  │              │
└─────────────┘  └─────┬──────┘  └──────────────┘
                        │
                        ▼
              ┌──────────────────┐
              │  Webhook Handler │
              │ /api/webhooks/   │
              │    payplus       │
              └──────────────────┘
```

---

## 2. קבצי קוד רלוונטיים

### Backend — PayPlus Integration
| קובץ | תפקיד |
|------|--------|
| `src/lib/payplus.ts` | כל ה-API functions (1340 שורות, 18 פונקציות) |
| `src/lib/payplusClient.ts` | PayPlusClient class — recurring status, charges, cancel |
| `src/app/api/webhooks/payplus/route.ts` | Webhook handler — תשלומים חד-פעמיים בלבד |
| `src/app/api/cron/sync-payplus-recurring/route.ts` | Cron sync — סנכרון הוראות קבע + יצירת קבלות |

### Backend — Admin API
| קובץ | תפקיד |
|------|--------|
| `src/app/api/admin/users/create-with-payment/route.ts` | יצירת user + customer + תשלום התקנה |
| `src/app/api/admin/recurring-payments/create/route.ts` | יצירת הוראת קבע (Payment Page) |
| `src/app/api/admin/recurring-payments/list/route.ts` | רשימת הוראות קבע |
| `src/app/api/admin/recurring-payments/toggle-valid/route.ts` | השהיה/הפעלה |
| `src/app/api/admin/recurring-payments/delete/route.ts` | מחיקה |
| `src/app/api/admin/recurring-payments/sync-from-payplus/route.ts` | סנכרון ידני |
| `src/app/api/admin/recurring-payments/[id]/renew-card/route.ts` | חידוש כרטיס |
| `src/app/api/admin/recurring-payments/[id]/charges/route.ts` | היסטוריית חיובים |

### Backend — User Access Control
| קובץ | תפקיד |
|------|--------|
| `src/app/api/user/cameras/route.ts` | בדיקת מנוי → גישה למצלמות |
| `src/app/api/user/footage/route.ts` | בדיקת מנוי → גישה להקלטות |

### Frontend — Admin
| קובץ | תפקיד |
|------|--------|
| `src/app/admin/requests/page.tsx` | אישור בקשות + שליחת לינק תשלום |
| `src/app/admin/recurring-payments/page.tsx` | ניהול הוראות קבע |
| `src/app/admin/customers/[id]/page.tsx` | צפייה בלקוח |

### Frontend — User
| קובץ | תפקיד |
|------|--------|
| `src/app/dashboard/subscription/page.tsx` | מצב מנוי (placeholder — TODO) |
| `src/app/dashboard/invoices/page.tsx` | חשבוניות |
| `src/app/dashboard/payments/page.tsx` | ❌ notFound() — לא מיושם |

### DB Schema
| טבלה | תיאור |
|------|--------|
| `recurring_payments` | הוראות קבע — `is_active`, `is_valid`, `recurring_uid` |
| `payments` | תשלומים — חד-פעמיים + recurring |
| `invoices` | חשבוניות/קבלות |
| `invoice_items` | פריטי חשבונית |

---

## 3. Flows קיימים — מה עובד

### Flow A: לקוח חדש → תשלום התקנה ✅ (עובד)
```
1. לקוח ממלא טופס באתר → subscription_request נוצר
2. Admin נכנס ל-/admin/requests
3. Admin לוחץ "שלח לינק תשלום" → בוחר תוכנית (SIM/WiFi)
4. API: /api/admin/users/create-with-payment
   a. יוצר User ב-Supabase (status: pending_payment)
   b. יוצר Customer ב-PayPlus (customer_uid נשמר)
   c. יוצר payment record ב-DB (status: pending)
   d. יוצר PayPlus Payment Page (תשלום חד-פעמי = setup_price)
   e. מחזיר payment URL ל-Admin
5. Admin שולח לינק ללקוח (ידני — אין שליחת SMS/אימייל אוטומטית)
6. לקוח משלם → PayPlus callback → /api/webhooks/payplus
7. Webhook:
   a. מוצא payment record לפי cField1 (user_id)
   b. מעדכן payment.status = 'completed'
   c. מעדכן invoice.status = 'paid' (אם קיימת)
   d. שולח אימייל קבלה ללקוח
   e. שומר customer_uid על ה-user
```

**⚠️ בעיה**: אחרי שהלקוח משלם התקנה, **אין יצירה אוטומטית של הוראת קבע**.  
ה-Admin צריך ליצור את ההו"ק בנפרד.

### Flow B: יצירת הוראת קבע ✅ (קוד קיים, לא ברור אם עובד)
```
1. Admin API: /api/admin/recurring-payments/create
   a. מקבל user_id, plan_id, amount, start_date
   b. מוצא/יוצר customer ב-PayPlus
   c. יוצר PayPlus Payment Page עם charge_method=4 (recurring)
   d. שומר recurring_payment ב-DB עם status=pending
   e. מחזיר payment_url ל-Admin
2. Admin שולח לינק ללקוח
3. לקוח מזין כרטיס ב-Payment Page
4. PayPlus יוצר את הוראת הקבע ← recurring_uid
```

**🔴 בעיה #1**: ה-Admin page לא מציג כפתור "צור הוראת קבע חדשה".  
   אין UI ליצירה — רק לצפייה, סנכרון, השהיה, מחיקה.

**🔴 בעיה #2**: אחרי שהלקוח משלים את ה-Payment Page,  
   אין webhook/callback שמעדכן את ה-`recurring_uid` ו-`status` ב-DB.  
   ה-recurring_payment נשאר `status: pending` עם `recurring_uid: null`.

**🔴 בעיה #3**: דף success `/recurring-payment-success` לא קיים (404).

### Flow C: סנכרון הוראות קבע ✅ (עובד — אבל חלקי)
```
1. Cron job: /api/cron/sync-payplus-recurring (כל כמה שעות)
   a. קורא GET /RecurringPayments/View מ-PayPlus
   b. לכל הוראת קבע — מחפש user לפי email
   c. upsert ל-recurring_payments (is_active, is_valid, last_charge_date)
   d. deactivates records שנעלמו מ-PayPlus
   e. לכל הו"ק פעילה — בודק last_payment_date
   f. אם יש חיוב חדש החודש — יוצר payment + invoice + שולח אימייל
```

**✅ עובד**: סנכרון + יצירת קבלות חודשיות.  
**❌ חסר**: בדיקת Failures endpoint.  
**❌ חסר**: כשתשלום נכשל, `is_valid` נשאר `true`.

### Flow D: גישת לקוח ✅ (עובד)
```
1. User API: /api/user/cameras
   a. Admin → גישה מלאה תמיד
   b. בודק recurring_payments: is_active=true AND is_valid=true
   c. SIM + אין מנוי → חסום לגמרי (אין אינטרנט)
   d. WiFi + אין מנוי → live view בלבד (אין הקלטות)
   e. מנוי פעיל → גישה מלאה

2. User API: /api/user/footage
   a. בודק recurring_payments: is_active=true AND is_valid=true
   b. אין מנוי → 403 "נדרש מנוי לגישה להקלטות"
```

---

## 4. בעיות שזוהו — לפי חומרה

### 🔴 קריטי

| # | בעיה | מיקום | השלכות |
|---|------|-------|--------|
| P1 | **אין UI ליצירת הו"ק מה-admin** | `admin/recurring-payments/page.tsx` | Admin חייב ליצור ב-PayPlus ישירות |
| P2 | **אין webhook לתשלומים חוזרים** | `webhooks/payplus/route.ts` | כש-PayPlus מחייב כל חודש, הwebhook לא יודע לטפל |
| P3 | **כשלון תשלום חוזר לא חוסם גישה** | `cron/sync-payplus-recurring` | לקוח עם כרטיס שנדחה ממשיך לקבל שירות |
| P4 | **recurring_uid לא מתעדכן אחרי Payment Page** | `recurring-payments/create/route.ts` | ה-DB מראה `recurring_uid: null` + `status: pending` |
| P5 | **דף `/recurring-payment-success` לא קיים** | missing | לקוח רואה 404 אחרי שמזין כרטיס |

### 🟡 חשוב

| # | בעיה | מיקום | השלכות |
|---|------|-------|--------|
| P6 | **אין אימייל ללקוח על תשלום חוזר שנכשל** | לא קיים | לקוח לא יודע שהכרטיס נדחה |
| P7 | **subscription page הוא placeholder** | `dashboard/subscription/page.tsx` | שם + מחיר hardcoded, TODO בקוד |
| P8 | **payments page לא מיושם** | `dashboard/payments/page.tsx` | `notFound()` — דף ריק |
| P9 | **אין יצירת הו"ק אוטומטית אחרי תשלום התקנה** | `create-with-payment` | Admin צריך 2 פעולות נפרדות |
| P10 | **Admin לא יכול לשלוח לינק חידוש כרטיס מה-UI** | `recurring-payments/page.tsx` | API קיים, אין כפתור |

### 🟢 שיפור

| # | בעיה | מיקום | השלכות |
|---|------|-------|--------|
| P11 | **אין שליחת SMS/אימייל אוטומטית של לינק תשלום** | `create-with-payment` | Admin צריך לשלוח ידנית |
| P12 | **Console.log verbose ב-payplus.ts** | `src/lib/payplus.ts` | כל API call מדפיס ~10 שורות |

---

## 5. PayPlus API Endpoints — מה בשימוש ומה חסר

### ✅ בשימוש:
| Endpoint | שימוש |
|----------|-------|
| `POST /PaymentPages/GenerateLink` | יצירת לינק תשלום (חד-פעמי + recurring) |
| `GET /RecurringPayments/View` | רשימת כל הוראות קבע (cron sync) |
| `GET /RecurringPayments/{uid}/ViewRecurring` | פרטי הו"ק ספציפית |
| `GET /RecurringPayments/{uid}/ViewRecurringCharge` | רשימת חיובים |
| `POST /RecurringPayments/{uid}/Valid` | השהיה/הפעלה |
| `POST /RecurringPayments/CancelRecurring/{uid}` | ביטול |
| `POST /RecurringPayments/CreditCardRenewal/{uid}` | חידוש כרטיס |
| `POST /Customers/Add` | יצירת לקוח |
| `POST /Customers/Update/{uid}` | עדכון לקוח |
| `POST /Customers/Remove/{uid}` | מחיקת לקוח |

### ❌ חסר (חייבים להוסיף):
| Endpoint | שימוש נדרש |
|----------|------------|
| `GET /RecurringPaymentsReports/Failures` | **זיהוי תשלומים שנכשלו** |

### ℹ️ קיים ב-PayPlus, לא נדרש כרגע:
| Endpoint | הערה |
|----------|------|
| `POST /RecurringPayments/Add` | יצירת הו"ק ישירה (ללא Payment Page) — דורש card_token |
| `POST /RecurringPayments/Update/{uid}` | עדכון הו"ק (סכום, תאריך) |
| `POST /RecurringPayments/DeleteRecurring/{uid}` | מחיקת הו"ק |
| `GET /RecurringPaymentsReports/Charged` | דו"ח חיובים מוצלחים |
| `GET /RecurringPaymentsReports/Future` | דו"ח חיובים עתידיים |

---

## 6. תוכנית עבודה — סדר ביצוע

### שלב 1: תיקון Flow יצירת הו"ק (P1, P4, P5)
**מטרה**: Admin יכול ליצור הו"ק מה-UI, ואחרי שהלקוח מזין כרטיס הכל מתעדכן.

- [ ] **1.1** הוספת כפתור "צור הוראת קבע" ב-`/admin/recurring-payments`
- [ ] **1.2** Modal/טופס: בחירת לקוח, תוכנית, סכום, תאריך התחלה
- [ ] **1.3** יצירת דף `/recurring-payment-success` (landing page אחרי שהלקוח מזין כרטיס)
- [ ] **1.4** עדכון ה-webhook לטפל ב-recurring payment creation callback
  - כש-PayPlus שולח callback אחרי שלקוח מזין כרטיס, צריך:
  - לעדכן `recurring_uid` על ה-record
  - לשנות status ל-`active`
  - לעדכן `is_active=true`, `is_valid=true`

### שלב 2: זיהוי כשלונות + חסימת גישה (P3, P6)
**מטרה**: כשתשלום חוזר נכשל, הלקוח מאבד גישה ומקבל אימייל.

- [ ] **2.1** הוספת method `getRecurringFailures()` ל-`payplusClient.ts`
  - `GET /RecurringPaymentsReports/Failures?terminal_uid=xxx&currency_code=ILS`
- [ ] **2.2** הוספת שלב ב-cron sync: אחרי sync, בדוק Failures
  - מצא recurring_uid שנכשלו
  - עדכן `is_valid = false` ב-DB
- [ ] **2.3** שליחת אימייל ללקוח: "התשלום נכשל — עדכן כרטיס"
  - כולל לינק חידוש כרטיס (Credit Card Renewal)
- [ ] **2.4** הוספת עמודה "כשלונות" בטבלת recurring-payments של ה-admin

### שלב 3: Flow אוטומטי שלם (P9)
**מטרה**: Admin עושה פעולה אחת → הכל נוצר.

- [ ] **3.1** אפשרות: אחרי אישור בקשה ותשלום התקנה, ליצור גם הו"ק באותו flow
  - או: webhook של תשלום ההתקנה יוצר אוטומטית הו"ק
- [ ] **3.2** הו"ק = Payment Page עם `charge_method=4` + `charge_default=1` (חייב מיד)

### שלב 4: Dashboard לקוח (P7, P8)
**מטרה**: הלקוח רואה מידע אמיתי.

- [ ] **4.1** תיקון subscription page — API ייעודי במקום placeholder
- [ ] **4.2** מימוש payments page — היסטוריית תשלומים
- [ ] **4.3** לינק "עדכן כרטיס" בדף subscription (אם הו"ק active)

### שלב 5: שיפורים (P10, P11, P12)
- [ ] **5.1** כפתור "שלח לינק חידוש כרטיס" בUI של admin
- [ ] **5.2** שליחת SMS/אימייל אוטומטית עם לינק תשלום
- [ ] **5.3** ניקוי console.log verbose ב-payplus.ts

---

## 7. DB Schema — recurring_payments

```sql
CREATE TABLE recurring_payments (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  plan_id TEXT,
  
  -- PayPlus identifiers
  recurring_uid TEXT,        -- UID מ-PayPlus (null עד שהלקוח מזין כרטיס)
  customer_uid TEXT,         -- Customer UID ב-PayPlus
  card_token TEXT,           -- Token של כרטיס (לא תמיד זמין)
  
  -- Recurring settings
  recurring_type INTEGER,    -- 0=daily, 1=weekly, 2=monthly
  recurring_range INTEGER,   -- כל כמה (1=כל חודש)
  number_of_charges INTEGER, -- 0=unlimited
  
  -- Dates
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  last_charge_date TIMESTAMPTZ,
  next_charge_date TIMESTAMPTZ,
  
  -- Payment
  amount DECIMAL(10,2),
  currency_code TEXT DEFAULT 'ILS',
  items JSONB DEFAULT '[]',
  
  -- Status
  is_active BOOLEAN DEFAULT true,   -- הו"ק לא בוטלה
  is_valid BOOLEAN DEFAULT true,    -- PayPlus מחייב/לא מחייב
  
  -- Extra
  extra_info TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

### Access Control Logic:
```
is_active=true AND is_valid=true  → מנוי פעיל → גישה מלאה
is_active=true AND is_valid=false → מנוי מושהה → WiFi=live only, SIM=חסום
is_active=false                   → מנוי מבוטל → WiFi=live only, SIM=חסום
```

---

## 8. PayPlus API — Reference מהיר

### Authentication
```
Headers:
  api-key: {PAYPLUS_API_KEY}
  secret-key: {PAYPLUS_SECRET_KEY}
```

### Webhook Verification
```
Header 'hash' = HMAC-SHA256(body, secret_key) → base64
Header 'user-agent' = 'PayPlus'
```

### Environment Variables
```env
PAYPLUS_API_KEY=xxx
PAYPLUS_SECRET_KEY=xxx
PAYPLUS_PAYMENT_PAGE_UID=xxx
PAYPLUS_TERMINAL_UID=xxx
PAYPLUS_CASHIER_UID=xxx
PAYPLUS_USE_MOCK=false
PAYPLUS_FORCE_PRODUCTION=true
```

### URLs
```
Production: https://restapi.payplus.co.il/api/v1.0
Staging:    https://restapidev.payplus.co.il/api/v1.0
Docs:       https://docs.payplus.co.il/reference
```

---

*מסמך זה משמש כבסיס לעבודה. נעדכן אותו בכל שלב שמסתיים.*

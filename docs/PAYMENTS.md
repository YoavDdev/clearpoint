# Clearpoint Security — Payment System

<!--
purpose: Complete documentation of the PayPlus payment integration
audience: Engineers, operations, billing support
when_to_read: When working on payments, debugging billing issues, or onboarding new engineers
verified_date: 2026-07-18
-->

---

## 1. Overview

| Property | Value |
|----------|-------|
| **Payment Provider** | [PayPlus](https://www.payplus.co.il/) |
| **API Docs** | https://docs.payplus.co.il/reference/introduction |
| **Base URL (Production)** | `https://restapi.payplus.co.il/api/v1.0` |
| **Base URL (Staging)** | `https://restapidev.payplus.co.il/api/v1.0` |
| **Currency** | ILS (Israeli Shekel) |
| **Payment Types** | One-time (hardware/installation), Recurring (monthly subscription) |
| **Webhook** | `POST /api/webhooks/payplus` |
| **Cron Sync** | `GET /api/cron/sync-payplus-recurring` (daily 04:00 UTC) |

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Clearpoint Admin Dashboard                     │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐ │
│  │ Create User  │  │ Create       │  │ Recurring Payments    │ │
│  │ & Payment    │  │ Invoice      │  │ Management            │ │
│  └──────┬───────┘  └──────┬───────┘  └───────────┬───────────┘ │
└─────────┼──────────────────┼──────────────────────┼─────────────┘
          │                  │                      │
          ▼                  ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                        PayPlus API                                │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐ │
│  │ GenerateLink │  │ Customers    │  │ RecurringPayments     │ │
│  │ (Payment     │  │ Add/Update   │  │ View/Cancel           │ │
│  │  Page)       │  │              │  │                       │ │
│  └──────┬───────┘  └──────────────┘  └───────────────────────┘ │
└─────────┼───────────────────────────────────────────────────────┘
          │
          │  Customer completes payment
          ▼
┌─────────────────────────────────────────────────────────────────┐
│  Webhook: POST /api/webhooks/payplus                             │
│                                                                   │
│  1. Verify HMAC-SHA256 signature                                 │
│  2. Parse payment data                                           │
│  3. Update payments.status → completed/failed                    │
│  4. Save customer_uid on user                                    │
│  5. If invoice linked → mark paid + send receipt email           │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Environment Variables

| Variable | Purpose | Required |
|----------|---------|----------|
| `PAYPLUS_API_KEY` | API authentication key | ✅ |
| `PAYPLUS_SECRET_KEY` | Secret key for auth + webhook HMAC | ✅ |
| `PAYPLUS_PAYMENT_PAGE_UID` | Default payment page template ID | ✅ |
| `PAYPLUS_TERMINAL_UID` | Terminal identifier for recurring API | ✅ |
| `PAYPLUS_CASHIER_UID` | Cashier identifier | Optional |
| `PAYPLUS_USE_MOCK` | `true` to use mock API in development | Dev only |
| `PAYPLUS_FORCE_PRODUCTION` | `true` to force production URL in dev | Optional |
| `PAYPLUS_API_URL` | Override base URL | Optional |
| `NEXT_PUBLIC_BASE_URL` | App URL for callbacks | ✅ |
| `CRON_SECRET` | Bearer token for cron authorization | ✅ |

---

## 4. Payment Flows

### 4.1 One-Time Payment (Installation/Hardware)

**Trigger**: Admin creates user from subscription request  
**Route**: `POST /api/admin/create-user-and-payment`  
**Alternative**: `POST /api/payments/create-one-time` (user-initiated)

```
Admin clicks "Send Payment Link"
    │
    ▼
1. Create user in Supabase Auth + users table
2. Create PayPlus customer (get customer_uid)
3. Insert payment record (status: pending)
4. Call PayPlus GenerateLink API
5. Save processId + pageUrl on payment
6. Return payment link to admin
    │
    ▼
Admin sends link to customer (copy/WhatsApp)
    │
    ▼
Customer completes payment on PayPlus page
    │
    ▼
PayPlus calls webhook → status: completed
```

**Key fields in PayPlus payload**:
```typescript
{
  payment_page_uid: PAYPLUS_PAYMENT_PAGE_UID,
  amount: plan.setup_price,
  currency_code: 'ILS',
  customer: { customer_uid, customer_name, email },
  refURL_callback: '/api/webhooks/payplus',
  refURL_success: '/payment-success?payment_id=...',
  more_info: 'userId|field2|field3', // Metadata via cField1
  items: [{ name, quantity, price }],
}
```

### 4.2 Recurring Payment (Monthly Subscription)

**Trigger**: Admin sets up recurring for customer  
**Route**: `POST /api/admin/recurring-payments/create`

```
Admin fills recurring payment form
    │
    ▼
1. Verify/create PayPlus customer (customer_uid)
2. Call PayPlus GenerateLink with charge_method: 4
3. Insert recurring_payments record (status: pending)
4. Return payment page URL
    │
    ▼
Admin sends link to customer
    │
    ▼
Customer enters card details on PayPlus page
    │
    ▼
PayPlus creates recurring payment automatically
Card is charged monthly on start_date
```

**Key recurring parameters** (fixed 2026-07-19):
```typescript
{
  charge_method: 3,  // 3 = Recurring Payments

  // ⚠️ MUST be nested inside recurring_settings (PayPlus API requirement)
  recurring_settings: {
    instant_first_payment: true,
    recurring_type: 2,              // 0=daily, 1=weekly, 2=monthly
    recurring_range: 1,             // every 1 month
    number_of_charges: 0,           // 0 = unlimited
    start_date_on_payment_date: true,
    successful_invoice: true,
    customer_failure_email: true,
    send_customer_success_email: true,
  },
}
```

> **⚠️ Known Bug (fixed):** Before 2026-07-19, recurring params were sent as flat fields,
> causing `recurring-payment-settings-are-missing` error. The fix was nesting them inside
> `recurring_settings`. See `src/lib/payplus.ts:createRecurringPaymentPage()`.

### 4.3 Invoice Payment

**Trigger**: Admin creates invoice/quote for customer  
**Route**: `POST /api/admin/create-invoice`

```
Admin creates invoice with line items
    │
    ▼
1. Generate invoice number (YYYY-####) via RPC
2. Insert invoice + invoice_items
3. Insert payment record (status: pending)
4. Call PayPlus GenerateLink
5. Link payment ↔ invoice (payment.invoice_id)
6. Return payment URL
    │
    ▼
Customer pays → webhook → invoice marked paid
    │
    ▼
Auto-send receipt email to customer
```

**Document types**: `invoice` | `quote`

---

## 5. Webhook Processing

**Endpoint**: `POST /api/webhooks/payplus`

### 5.1 Signature Verification

```typescript
// PayPlus sends:
// Header: hash = HMAC-SHA256(body, SECRET_KEY) in base64
// Header: User-Agent = 'PayPlus'

const calculatedHash = crypto
  .createHmac('sha256', PAYPLUS_SECRET_KEY)
  .update(JSON.stringify(body))
  .digest('base64');

isValid = calculatedHash === receivedHash;
```

### 5.2 Webhook Flow

1. **Parse payload** — supports both JSON and URL-encoded
2. **Verify signature** — HMAC-SHA256 with secret key
3. **Parse data** — `parseWebhookData()` extracts normalized fields
4. **Find payment** — by `cField1` (payment ID) or `provider_transaction_id`
5. **Update payment** — set status to `completed` or `failed`, save `paid_at`
6. **Save customer_uid** — on user record for future payments
7. **If invoice linked** — mark invoice as paid, send receipt email

### 5.3 Webhook Payload Format

PayPlus can send in multiple formats:
```typescript
// Flat format
{ transaction_uid, amount, status_code: '000', ... }

// Nested format  
{ transaction: { uid, amount, status_code }, data: { card_information: {...} } }
```

**Status codes**: `'000'` = success, anything else = failure

---

## 6. Recurring Payments Sync (Cron)

**Route**: `GET /api/cron/sync-payplus-recurring`  
**Schedule**: Daily at 04:00 UTC (via Vercel Cron)  
**Auth**: `Bearer ${CRON_SECRET}` header  
**Max duration**: 60 seconds

### 6.1 Sync Process

```
1. Fetch all recurring payments from PayPlus API
   GET /RecurringPayments/View?terminal_uid=...
       │
       ▼
2. For each payment:
   - Match to user by email
   - Upsert into recurring_payments table
   - Track active/inactive status
       │
       ▼
3. Deactivate orphaned records
   (exist in DB but not in PayPlus)
       │
       ▼
4. Auto-generate recurring receipts:
   - Check last_payment_date from PayPlus
   - If charged this month → create payment + invoice
   - Idempotency: check recurring_uid + month
   - Send receipt email
```

### 6.2 Receipt Auto-Generation

For each active recurring payment:
1. **Query PayPlus** — `getRecurringStatus(uid)` → get `last_payment_date`
2. **Month check** — only create receipt if `paidMonth === currentMonth`
3. **Idempotency** — skip if `payments.metadata` already has `{recurring_uid, recurring_month}`
4. **Create payment** — type: `recurring`, status: `completed`
5. **Create invoice** — with generated number, billing snapshot, issuer snapshot
6. **Send email** — receipt with invoice link

### 6.3 Pagination & Timeout

- Processes up to `receipts_limit` (default 50) recurring payments per run
- Stops early if execution exceeds 45 seconds (Vercel timeout safety)
- `receiptsHasMore` flag signals if another invocation is needed
- Supports cursor-based pagination via `receipts_cursor` query param

---

## 7. Customer Management

### 7.1 Customer Lifecycle

```
User created (no customer_uid)
    │
    ├─→ Admin creates user+payment → createPayPlusCustomer()
    │   └─→ customer_uid saved on users table
    │
    ├─→ Admin edits user → updatePayPlusCustomer()
    │   └─→ Syncs name, phone, address, VAT to PayPlus
    │
    └─→ Webhook returns customer_uid → saved on user
```

### 7.2 PayPlus Customer API

| Function | Endpoint | Purpose |
|----------|----------|---------|
| `createPayPlusCustomer()` | `POST /Customers/Add` | Create new customer |
| `updatePayPlusCustomer()` | `POST /Customers/Update/{uid}` | Update details |
| `removePayPlusCustomer()` | `POST /Customers/Remove/{uid}` | Delete customer |

### 7.3 Customer Fields

```typescript
{
  email,                 // Required
  customer_name,         // Required
  vat_number,            // ע.מ / ח.פ
  customer_number,       // Internal: user_id
  phone,
  business_address,
  business_city,
  business_postal_code,
  communication_email,   // Separate billing email
}
```

---

## 8. Database Tables

### 8.1 `payments`

| Column | Type | Purpose |
|--------|------|---------|
| `id` | uuid | Primary key |
| `user_id` | uuid | FK → users |
| `payment_type` | text | `one_time` / `recurring` |
| `amount` | numeric | Payment amount |
| `currency` | text | `ILS` |
| `status` | text | `pending` / `completed` / `failed` |
| `payment_provider` | text | `payplus` |
| `provider_transaction_id` | text | PayPlus transaction UID |
| `provider_payment_url` | text | Payment page URL |
| `invoice_id` | uuid | FK → invoices |
| `paid_at` | timestamptz | When payment completed |
| `description` | text | Hebrew description |
| `items` | jsonb | Line items array |
| `metadata` | jsonb | `{ plan_id, recurring_uid, recurring_month }` |

### 8.2 `recurring_payments`

| Column | Type | Purpose |
|--------|------|---------|
| `id` | uuid | Primary key |
| `user_id` | uuid | FK → users |
| `plan_id` | uuid | FK → plans (nullable) |
| `recurring_uid` | text | PayPlus recurring UID |
| `customer_uid` | text | PayPlus customer UID |
| `recurring_type` | int | 0=daily, 1=weekly, 2=monthly |
| `recurring_range` | int | Interval (e.g., 1 = every month) |
| `number_of_charges` | int | 0 = unlimited |
| `amount` | numeric | Monthly charge amount |
| `start_date` | timestamptz | First charge date |
| `last_charge_date` | timestamptz | Last successful charge |
| `next_charge_date` | timestamptz | Next scheduled charge |
| `is_active` | boolean | Active in system |
| `is_valid` | boolean | Valid in PayPlus |
| `status` | text | `pending` / `active` / `cancelled` |
| `metadata` | jsonb | Extra info, payment page URL |
| `notes` | text | Admin notes |

### 8.3 `invoices`

| Column | Type | Purpose |
|--------|------|---------|
| `id` | uuid | Primary key |
| `user_id` | uuid | FK → users |
| `invoice_number` | text | Format: `YYYY-####` |
| `document_type` | text | `invoice` / `quote` |
| `status` | text | `draft` / `sent` / `paid` / `cancelled` |
| `total_amount` | numeric | Total |
| `currency` | text | `ILS` |
| `payment_id` | uuid | FK → payments |
| `has_subscription` | boolean | Is recurring invoice |
| `monthly_price` | numeric | Monthly amount (recurring) |
| `paid_at` | timestamptz | When paid |
| `email_sent_at` | timestamptz | When receipt emailed |
| `billing_snapshot` | jsonb | Frozen billing info at creation |
| `issuer_snapshot` | jsonb | Frozen issuer info at creation |
| `valid_until` | timestamptz | Quote expiration |

### 8.4 `invoice_items`

| Column | Type | Purpose |
|--------|------|---------|
| `id` | uuid | Primary key |
| `invoice_id` | uuid | FK → invoices |
| `item_type` | text | `hardware` / `installation` / `subscription` |
| `item_name` | text | Hebrew item name |
| `item_description` | text | Details |
| `quantity` | int | Count |
| `unit_price` | numeric | Price per unit |
| `total_price` | numeric | quantity × unit_price |
| `sort_order` | int | Display order |

---

## 9. API Endpoints Reference

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/payments/create-one-time` | POST | User | User-initiated one-time payment |
| `/api/admin/create-user-and-payment` | POST | Admin | Create user + send payment link |
| `/api/admin/recurring-payments/create` | POST | Admin | Set up recurring subscription |
| `/api/admin/create-invoice` | POST | Admin | Create invoice/quote + payment link |
| `/api/webhooks/payplus` | POST | PayPlus (HMAC) | Payment result callback |
| `/api/cron/sync-payplus-recurring` | GET | CRON_SECRET | Sync recurring payments + auto-receipts |

---

## 10. Source Files

| File | Purpose |
|------|---------|
| `src/lib/payplus.ts` | Core PayPlus API functions (1340 lines) |
| `src/lib/payplusClient.ts` | PayPlus client class for recurring status checks |
| `src/lib/issuer.ts` | Issuer snapshot for invoices |
| `src/lib/email.ts` | Email sending (receipts, invoices) |
| `src/app/api/webhooks/payplus/route.ts` | Webhook handler |
| `src/app/api/cron/sync-payplus-recurring/route.ts` | Daily recurring sync (750 lines) |
| `src/app/api/payments/create-one-time/route.ts` | User payment creation |
| `src/app/api/admin/create-user-and-payment/route.ts` | Admin user+payment flow |
| `src/app/api/admin/recurring-payments/create/route.ts` | Admin recurring setup |
| `src/app/api/admin/create-invoice/route.ts` | Invoice/quote creation |
| `src/app/api/admin-edit-user/route.ts` | User edit (syncs to PayPlus customer) |

---

## 11. `payplus.ts` — Exported Functions

| Function | Purpose |
|----------|---------|
| `createOneTimePayment()` | Generate payment page link for one-time charge |
| `createRecurringPaymentPage()` | Generate payment page with recurring params |
| `viewRecurringPayment()` | Get single recurring payment details |
| `listAllRecurringPayments()` | List all recurring from PayPlus |
| `cancelRecurringPayment()` | Cancel a recurring payment |
| `createRecurringPayment()` | Direct recurring creation (token-based) |
| `updateRecurringPayment()` | Update recurring payment |
| `deleteRecurringPayment()` | Delete recurring payment |
| `toggleRecurringValid()` | Toggle is_valid status |
| `getCustomerCards()` | Get saved cards for customer |
| `getRecurringPaymentDetails()` | Get detailed recurring info |
| `getRecurringCharges()` | Get charge history |
| `sendCardRenewalNotification()` | Notify about card expiry |
| `createPayPlusCustomer()` | Create customer in PayPlus |
| `updatePayPlusCustomer()` | Update customer details |
| `removePayPlusCustomer()` | Delete customer |
| `verifyWebhookSignature()` | HMAC-SHA256 webhook verification |
| `parseWebhookData()` | Normalize webhook payload |
| `getPaymentStatus()` | Check payment status |
| `calculateNextBillingDate()` | Calculate next charge date |
| `formatAmount()` | Format ILS amount |

---

## 12. `payplusClient.ts` — PayPlusClient Class

Singleton class for recurring payment status checks (used by cron sync):

| Method | Purpose |
|--------|---------|
| `getRecurringStatus()` | Full recurring payment status from PayPlus |
| `getRecurringLastChargeDate()` | Get last charge date (fallback to charges list) |
| `getRecurringChargesDebug()` | Debug helper for manual cron runs |
| `cancelRecurring()` | Cancel a recurring payment |

---

## 13. Payment Statuses

### Payment Record Lifecycle

```
pending → completed  (webhook success, status_code='000')
pending → failed     (webhook failure, status_code≠'000')
```

### Recurring Payment Lifecycle

```
pending → active     (customer completes card entry on payment page)
active  → cancelled  (admin cancels / PayPlus suspension)
```

### Invoice Lifecycle

```
draft → sent → paid      (payment completed via webhook)
draft → sent → pending   (payment failed, remains awaiting)
quote → expired/accepted  (quote flow)
```

---

## 14. Mock Mode (Development)

When `PAYPLUS_USE_MOCK=true`:
- All PayPlus API calls return mock data
- Payment links point to `localhost:3000/mock-recurring-payment`
- No real charges are made
- Customer creation returns fake `customer_uid`

**Note**: Mock mode does NOT simulate webhooks. Test webhook flow separately.

---

## 15. Key Design Decisions

1. **No subscriptions table** — Subscription status derived from `recurring_payments.is_active + is_valid` and `users.subscription_active` flag
2. **Customer UID synced lazily** — Created on first payment or user edit, not on user creation
3. **Receipts auto-generated** — Monthly receipts created by cron sync, not by webhook
4. **Idempotent receipts** — `metadata.recurring_uid + recurring_month` prevents duplicates
5. **Billing snapshot** — Invoice freezes customer billing info at creation time
6. **Two PayPlus clients** — `payplus.ts` (functions) and `payplusClient.ts` (class) coexist
7. **Webhook dual lookup** — Finds payment by `cField1` (our payment ID) or by `provider_transaction_id`
8. **charge_method: 3** — Uses PayPlus recurring mode via payment page (customer enters card)
9. **recurring_settings nested** — PayPlus requires recurring params inside a `recurring_settings` object (not flat)

---

## 16. Troubleshooting

### Webhook Not Arriving

1. Check PayPlus dashboard for webhook delivery logs
2. Verify `NEXT_PUBLIC_BASE_URL` is correct production URL
3. Confirm `PAYPLUS_SECRET_KEY` matches for HMAC validation
4. Check Vercel function logs for 401/500 errors

### Recurring Payment Not Syncing

1. Run cron manually: `GET /api/cron/sync-payplus-recurring` with Bearer token
2. Check if user email in PayPlus matches `users.email` in DB
3. Verify `PAYPLUS_TERMINAL_UID` is correct
4. Check `last_payment_date` format from PayPlus (DD/MM/YYYY or ISO)

### Payment Link Not Working

1. Verify `PAYPLUS_PAYMENT_PAGE_UID` is correct
2. Check PayPlus account has enough funds/active status
3. Verify customer_uid exists in PayPlus (if passed)
4. Check Vercel function logs for PayPlus API response

### Invoice Not Marked Paid

1. Confirm `payment.invoice_id` is set before webhook fires
2. Check webhook processed successfully (no 500 error)
3. Verify invoice exists in DB with matching ID
4. Manual fix: update `invoices.status = 'paid'` and `paid_at`

---

---

## 17. How-To Guide — מדריך מעשי

### 17.1 יצירת הוראת קבע ללקוח חדש

1. **לך ל** `/admin/recurring-payments`
2. **לחץ** "צור הוראת קבע" (כפתור ירוק)
3. **מלא את הטופס:**
   - בחר לקוח מהרשימה
   - בחר תוכנית (הסכום ימולא אוטומטית)
   - תאריך התחלה (DD/MM/YYYY) — ברירת מחדל: היום
4. **לחץ** "צור" → תקבל **לינק תשלום**
5. **שלח** את הלינק ללקוח (WhatsApp / אימייל)
6. הלקוח מזין כרטיס ב-PayPlus → הו"ק נוצרת אוטומטית
7. **לחץ** "סנכרון מ-PayPlus" לעדכון הסטטוס ב-DB

> **💡 טיפ:** אחרי שהלקוח משלם, הסטטוס נשאר "ממתין" עד שתעשה סנכרון.
> ה-Cron עושה סנכרון אוטומטי כל יום ב-04:00 UTC.

### 17.2 סנכרון ידני מ-PayPlus

1. **לך ל** `/admin/recurring-payments`
2. **לחץ** "סנכרון מ-PayPlus"
3. זה ימשוך את כל ההוראות קבע מ-PayPlus ויעדכן:
   - `recurring_uid`, `is_active`, `is_valid`
   - `last_charge_date`
   - יצור קבלות חודשיות אוטומטית

### 17.3 ביטול הוראת קבע

1. **לך ל** `/admin/recurring-payments`
2. מצא את ההו"ק בטבלה
3. **לחץ** על כפתור "מחק" (אייקון פח)
4. זה ישלח `POST /RecurringPayments/CancelRecurring/{uid}` ל-PayPlus

### 17.4 השהיית / הפעלת הוראת קבע

1. **לחץ** על כפתור ההשהיה/הפעלה בשורה
2. זה מעדכן `is_valid` ב-DB
3. לקוח מושהה:
   - **WiFi**: רואה live בלבד (אין הקלטות)
   - **SIM**: חסום לגמרי

### 17.5 חידוש כרטיס אשראי

1. מצא את ההו"ק בטבלה
2. **לחץ** על אייקון "חידוש כרטיס"
3. זה שולח ל-PayPlus בקשה ליצירת לינק חידוש
4. הלינק נשלח ללקוח באימייל

### 17.6 בדיקת תשלומים שנכשלו

- ה-Cron sync בודק אוטומטית את `GET /RecurringPaymentsReports/Failures`
- הוראות קבע עם כשלון מסומנות `is_valid: false`
- הלקוח מקבל אימייל אוטומטית
- בנוסף: אם `last_charge_date` ישן מ-45 יום → ההו"ק מסומנת כלא תקינה

### 17.7 Debugging — בדיקה ב-Postman

**Headers:**
```
Content-Type: application/json
api-key: {PAYPLUS_API_KEY}
secret-key: {PAYPLUS_SECRET_KEY}
```

**צפייה בכל הוראות קבע:**
```
GET https://restapi.payplus.co.il/api/v1.0/RecurringPayments/View?terminal_uid={TERMINAL_UID}
```

**צפייה בהו"ק ספציפית:**
```
GET https://restapi.payplus.co.il/api/v1.0/RecurringPayments/{recurring_uid}/ViewRecurring?terminal_uid={TERMINAL_UID}
```

**יצירת לינק תשלום:**
```
POST https://restapi.payplus.co.il/api/v1.0/PaymentPages/generateLink
Body: { payment_page_uid, amount, charge_method: 3, recurring_settings: {...} }
```

### 17.8 Environment Variables — מה צריך להגדיר

```env
# חובה
PAYPLUS_API_KEY=xxx                    # מפתח API מ-PayPlus
PAYPLUS_SECRET_KEY=xxx                 # מפתח סודי (גם ל-webhook HMAC)
PAYPLUS_PAYMENT_PAGE_UID=xxx           # UID של דף תשלום ברירת מחדל
PAYPLUS_TERMINAL_UID=xxx               # מזהה טרמינל (להו"ק)
NEXT_PUBLIC_BASE_URL=https://...       # URL של האפליקציה (ל-webhooks)
CRON_SECRET=xxx                        # Token לאימות cron

# אופציונלי
PAYPLUS_CASHIER_UID=xxx               # מזהה קופה
PAYPLUS_USE_MOCK=true                  # מצב פיתוח — ללא חיובים אמיתיים
PAYPLUS_FORCE_PRODUCTION=true          # שימוש ב-production URL גם ב-dev
```

---

*Document verified against source code on 2026-07-19. Includes recurring_settings fix.*

# Business Rules — Clearpoint Security

<!--
purpose: Document subscription plans, pricing model, payment flows, billing logic, and business constraints
audience: All engineers, AI assistants, product owners
when_to_read: Before modifying plans, pricing, payment flows, or subscription logic
prerequisites: DATABASE.md (billing tables), API_REFERENCE.md (payment endpoints)
related_docs:
  - DATABASE.md (plans, recurring_payments, payments, invoices tables)
  - API_REFERENCE.md (billing endpoints)
  - TECHNICAL_DEBT.md (TD-1: ghost subscriptions table)
source_of_truth_for: Plan definitions, pricing model, payment flows, subscription lifecycle
confidence: Verified — traced from code + database schema
last_verified: 2026-07-17
owner: Engineering Lead
-->

---

## 1. Subscription Plans

### 1.1 Plan Structure

Plans are stored in the `plans` table with TEXT primary keys (e.g., `'sim'`, `'wifi'`).

| Column | Purpose |
|--------|---------|
| `name` / `name_he` | English / Hebrew display name |
| `connection_type` | `'sim'`, `'wifi_cloud'`, `'wifi'` — determines hardware and bandwidth model |
| `monthly_price` | Monthly subscription cost (ILS, INTEGER) |
| `setup_price` | One-time installation fee (ILS, default 0) |
| `retention_days` | How many days of VOD footage the customer can access |
| `data_allowance_gb` | SIM data cap (NULL for wifi plans) |
| `camera_limit` | Max cameras per plan (default 4) |
| `live_enabled` | Whether live streaming is available |
| `cloud_enabled` | Whether cloud features are available |
| `is_active` | Whether plan is offered to new customers |

### 1.2 Connection Types

| Type | Description | Bandwidth | Data Cap |
|------|-------------|-----------|----------|
| `sim` | Cellular SIM in Mini PC | 4G LTE | `data_allowance_gb` limited |
| `wifi_cloud` | Customer's WiFi + cloud recording | Customer's ISP | Unlimited |
| `wifi` | Customer's WiFi (basic) | Customer's ISP | Unlimited |

### 1.3 Pricing Calculator (Hardcoded)

**File**: `src/app/api/calculate-price/route.ts`

Internal pricing used for admin cost/profit calculation:

| Plan | Cost (ILS) | Customer Price (ILS) | Profit |
|------|-----------|---------------------|--------|
| Basic | 79.17 | 115 | ~36 |
| Standard | 99.84 | 140 | ~40 |
| Pro | 120.51 | 165 | ~45 |
| ProPlus | 141.18 | 185 | ~44 |

- **Extra camera**: ₪63/month (cost: ₪20.67)
- **Installation fee**: ₪100 one-time

> **Note**: These hardcoded values may diverge from `plans` table data. The calculator is used for admin estimation only — actual billing uses `plans.monthly_price` and `recurring_payments.amount`.

### 1.4 Plan Assignment

- Each user has `users.plan_id` → FK to `plans.id`
- Optional `users.custom_price` overrides `plans.monthly_price`
- Optional `users.plan_duration_days` overrides `plans.retention_days`
- `users.setup_paid` tracks one-time installation payment status

---

## 2. Customer Lifecycle

### 2.1 Acquisition Flow

```
1. Customer visits /subscribe
2. Fills form (name, email, phone, address, preferred date, plan)
3. POST /api/public/subscribe-request → subscription_requests table
   Status: "new" 🟣

4. Admin sees request in /admin/requests
5. Admin clicks "שלח לינק תשלום" (Send Payment Link)
6. POST /api/admin/create-user-and-payment
   → Creates user in auth.users + public.users
   → Creates PayPlus customer
   → Creates payment record (status: pending)
   → Generates PayPlus payment link
   Status: "payment_link_sent" 🔵

7. Admin sends payment link to customer (manual)
8. Customer pays via PayPlus payment page
9. PayPlus webhook → POST /api/webhooks/payplus
   → Updates payment status to "completed"
   Status: "paid" 💰

10. Admin installs hardware at customer site
11. Admin marks as handled
    Status: "handled" ✅
```

### 2.2 Subscription Request Statuses

| Status | Hebrew | Meaning |
|--------|--------|---------|
| `new` | חדש 🟣 | Fresh request, not yet handled |
| `payment_link_sent` | לינק נשלח 🔵 | Payment link generated and shared |
| `paid` | שולם 💰 | Customer completed payment |
| `handled` | מותקן ✅ | Hardware installed, service active |
| `deleted` | נמחק 🚫 | Request cancelled/rejected |

---

## 3. Payment System

### 3.1 Payment Provider: PayPlus

**Integration file**: `src/lib/payplus.ts` + `src/lib/payplusClient.ts`

| Feature | Status |
|---------|--------|
| One-time payments | ✅ Active |
| Recurring (monthly charge) | ✅ Active |
| Payment page (hosted) | ✅ Active |
| Webhook verification | ✅ Active |
| Customer management | ✅ Active |
| Mock mode for development | ✅ Available (`PAYPLUS_USE_MOCK=true`) |

**API endpoints used**:
- `POST /PaymentPages/GenerateLink` — create payment page
- `GET /RecurringPayments/{uid}/ViewRecurring` — check recurring status
- `POST /Transactions/CreateRecurring` — create recurring charge
- `GET /RecurringPayments/{uid}/Charges/ChargesList` — charge history

### 3.2 Payment Types

| Type | Table | Provider | Flow |
|------|-------|----------|------|
| One-time (hardware) | `payments` | PayPlus | Customer pays via link → webhook confirms |
| Recurring (monthly) | `recurring_payments` | PayPlus | Admin creates → card token stored → auto-charged |

### 3.3 One-Time Payment Flow

```
POST /api/payments/create-one-time
  │
  ├── Authenticate user
  ├── Fetch user + plan details
  ├── Calculate total from items
  ├── INSERT payments (status: 'pending')
  ├── Call PayPlus createOneTimePayment()
  │   └── Returns pageUrl for customer redirect
  ├── UPDATE payments with provider_payment_id
  └── Return paymentUrl to frontend

Customer pays on PayPlus hosted page
  │
  └── PayPlus webhook → POST /api/webhooks/payplus
      ├── Verify signature (hash header)
      ├── Parse payment data
      └── UPDATE payments (status: 'completed')
```

### 3.4 Recurring Payment Model

Recurring payments are managed in `recurring_payments` table, linked to PayPlus:

| Field | Purpose |
|-------|---------|
| `recurring_uid` | PayPlus recurring payment ID |
| `customer_uid` | PayPlus customer ID |
| `card_token` | Stored card token for charges |
| `amount` | Monthly charge amount (ILS) |
| `is_active` | Whether subscription is active |
| `is_valid` | Whether payment method is valid |
| `next_charge_date` | Next scheduled charge |
| `last_charge_date` | Last successful charge |
| `failed_attempts` | Consecutive failed charge count |
| `last_failure_reason` | Last charge failure message |

**Admin operations**:
- Create recurring payment with PayPlus payment page
- Sync status from PayPlus
- Toggle is_valid flag manually
- Renew card token (generate new payment page)
- View charge history
- Delete recurring payment

### 3.5 Subscription Active Check

**⚠️ Important**: The system checks for active subscriptions in VOD/camera routes using this pattern:

```typescript
// 1. Try subscriptions table (ALWAYS FAILS — table doesn't exist)
const { data: sub } = await supabase.from("subscriptions")...

// 2. Fallback to recurring_payments
const { data: rp } = await supabase.from("recurring_payments")
  .eq("user_id", user.id)
  .eq("is_active", true)
  .eq("is_valid", true)
  .single();

// 3. Admin bypasses all checks
if (user.role === 'admin') → access granted
```

See `TECHNICAL_DEBT.md` TD-1 and TD-10 for details on this pattern.

---

## 4. Invoicing System

### 4.1 Document Types

| Type | Hebrew | Purpose |
|------|--------|---------|
| `invoice` | חשבונית | Standard invoice with payment link |
| `quote` | הצעת מחיר | Price quote, convertible to invoice |
| `receipt` | קבלה | Payment confirmation |

### 4.2 Invoice Workflow

```
Admin creates invoice/quote
  POST /api/admin/create-invoice
  │
  ├── documentType = 'invoice' or 'quote'
  ├── Calculates total from line items
  ├── Generates document number (document_number_counters)
  ├── Saves issuer snapshot (company details)
  ├── If invoice: creates PayPlus payment link
  └── INSERT invoices + invoice_items

Quote flow:
  Admin creates quote → sends to customer
  Customer approves: POST /api/quote/approve
  Admin converts: POST /api/admin/convert-quote-to-invoice
  → Creates payment link, updates document type

Email delivery:
  POST /api/admin/send-invoice-email → sends PDF/link to customer
```

### 4.3 Document Numbering

Sequential numbering via `document_number_counters` table:
- Separate counters per document type (invoice, quote, receipt)
- Auto-incremented on document creation
- Format: prefix + sequential number

---

## 5. VOD Access & Retention

### 5.1 Retention Rules

- `plans.retention_days` — default retention for the plan
- `users.plan_duration_days` — optional per-user override (CHECK: must be 14 or NULL)
- Effective retention: `user.plan_duration_days ?? plan.retention_days`

### 5.2 VOD Access Authorization

When a user requests footage (`/api/user-footage`, `/api/vod/signed-url`):

1. **Admin**: Full access, no restrictions
2. **Customer**: Must have active subscription (`recurring_payments.is_active = true`)
3. **Retention filter**: Footage older than retention_days is excluded from results
4. **Camera ownership**: User can only access cameras where `cameras.user_email = user.email`

### 5.3 VOD Signed URLs

Footage is stored on BunnyCDN. Access requires a signed URL:
- Generated via `POST /api/vod/signed-url`
- Uses `BUNNY_TOKEN_KEY` for URL signing
- Time-limited access

---

## 6. Customer Onboarding Checklist

From admin's perspective, full onboarding requires:

| Step | System Action | Table |
|------|---------------|-------|
| 1. Receive signup request | `subscription_requests` INSERT | `subscription_requests` |
| 2. Create user account | Supabase Auth + `users` INSERT | `auth.users`, `users` |
| 3. Assign plan | Set `users.plan_id` | `users` |
| 4. Collect payment (hardware) | Create one-time payment | `payments` |
| 5. Setup recurring billing | Create PayPlus recurring | `recurring_payments` |
| 6. Create Mini PC record | INSERT into `mini_pcs` | `mini_pcs` |
| 7. Generate device token | Create token hash | `mini_pc_tokens` |
| 8. Create camera records | INSERT cameras with user linkage | `cameras` |
| 9. Install hardware on-site | Physical installation | — |
| 10. Verify health reporting | Check Mini PC + camera health | `mini_pc_health`, `camera_health` |

---

## 7. Key Business Constraints

| Constraint | Implementation |
|------------|----------------|
| Max cameras per plan | `plans.camera_limit` (default 4) |
| SIM data cap | `plans.data_allowance_gb` (NULL = unlimited) |
| VOD retention period | `plans.retention_days`, overridable per user |
| One active device token per Mini PC | Unique partial index on `mini_pc_tokens` |
| Users must be admin-created | `authorize()` rejects unknown users (PGRST116) |
| Payment currency | ILS only (hardcoded in payment flows) |
| Admin-only user creation | No self-registration; `/subscribe` creates request, not account |

---

## 8. External Service Dependencies

| Service | Purpose | Env Var |
|---------|---------|---------|
| **PayPlus** | Payment processing (one-time + recurring) | `PAYPLUS_API_KEY`, `PAYPLUS_SECRET_KEY` |
| **Resend** | Email notifications (alerts, invoices) | `RESEND_API_KEY`, `RESEND_FROM_EMAIL` |
| **BunnyCDN** | VOD file storage + signed URL delivery | `BUNNY_TOKEN_KEY` |
| **Supabase** | Database, Auth, Storage | `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| **Cloudflared** | Mini PC tunnel (SSH + HLS access) | Configured on device |

---

*Document verified against source code on 2026-07-17.*

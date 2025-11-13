# 🔄 PayPlus Migration Plan

## Overview
Migrating from Grow payment provider to PayPlus. PayPlus library is already built and compatible.

---

## ✅ Already Complete

### PayPlus Library (`src/lib/payplus.ts`)
- ✅ One-time payments
- ✅ Recurring subscriptions  
- ✅ Subscription cancellation
- ✅ Webhook handling
- ✅ Signature verification
- ✅ Mock mode for testing

### Webhook Handler (`/api/webhooks/payplus/`)
- ✅ Payment status updates
- ✅ Recurring payment processing
- ✅ Database synchronization

---

## 🔄 APIs to Migrate

### 1. Admin Payment Creation
**Files to update:**

#### `/api/admin/create-user-and-payment/route.ts`
- Current: Uses `grow.createPayment()`
- Change to: `payplus.createOneTimePayment()`
- Purpose: Send payment link to new customers

#### `/api/admin/create-invoice/route.ts`
- Current: Uses `grow.createPayment()`
- Change to: `payplus.createOneTimePayment()`  
- Purpose: Create installation invoices

#### `/api/admin/regenerate-payment-link/route.ts`
- Current: Uses `grow.createPayment()`
- Change to: `payplus.createOneTimePayment()`
- Purpose: Regenerate failed payment links

#### `/api/admin/create-complete-payment/route.ts`
- Current: Uses `grow.createPayment()`
- Change to: `payplus.createOneTimePayment()`
- Purpose: Complete payment creation

---

### 2. Subscription Management

#### `/api/admin/activate-subscription/route.ts`
- Current: Uses `grow.createRecurringPayment()`
- Change to: `payplus.createRecurringSubscription()`
- Purpose: Start monthly billing

#### `/api/admin/cancel-subscription/route.ts`
- Current: Uses `grow.cancelSubscription()`
- Change to: `payplus.cancelSubscription()`
- Purpose: Stop recurring billing

---

### 3. Public Payment APIs

#### `/api/payments/create-one-time/route.ts`
- Current: Uses `grow.createPayment()`
- Change to: `payplus.createOneTimePayment()`
- Purpose: Customer-initiated one-time payments

#### `/api/payments/create-subscription/route.ts`
- Current: Uses `grow.createRecurringPayment()`
- Change to: `payplus.createRecurringSubscription()`
- Purpose: Customer-initiated subscriptions

---

### 4. Webhook Migration

#### Current: `/api/webhooks/grow/route.ts`
- **Action**: Redirect to `/api/webhooks/payplus/` or delete

#### Already Working: `/api/webhooks/payplus/route.ts`
- ✅ Ready to receive PayPlus webhooks

---

## 🗑️ Files to Delete After Migration

1. `src/lib/grow.ts` - Grow payment library
2. `/api/webhooks/grow/route.ts` - Grow webhook handler
3. `/api/payments/webhook/grow/route.ts` - Duplicate Grow webhook
4. `/api/mock-grow/` - Mock Grow API (if exists)

---

## ⚙️ Environment Variables Needed

Update `.env` with PayPlus credentials:

```env
# PayPlus Configuration
PAYPLUS_API_KEY=your_api_key_here
PAYPLUS_SECRET_KEY=your_secret_key_here
PAYPLUS_PAYMENT_PAGE_UID=your_page_uid_here
PAYPLUS_API_URL=https://restapi.payplus.co.il/api/v1.0

# For development testing
PAYPLUS_USE_MOCK=false
```

---

## 🧪 Testing Checklist

### Before Going Live:
- [ ] Test one-time payment creation
- [ ] Test subscription creation
- [ ] Test subscription cancellation
- [ ] Test webhook signature verification
- [ ] Test webhook payment processing
- [ ] Test failed payment handling
- [ ] Verify database updates work correctly
- [ ] Test with real PayPlus sandbox account

### After Migration:
- [ ] Monitor webhook logs for errors
- [ ] Verify all payments are tracked
- [ ] Check subscription renewals work
- [ ] Test cancellation flow

---

## 📝 Migration Steps Order

1. ✅ PayPlus library exists and ready
2. 🔄 Update payment creation APIs (8 files)
3. 🔄 Update subscription management APIs (2 files)
4. 🧪 Test all flows thoroughly
5. ⚙️ Configure production PayPlus credentials
6. 🗑️ Delete Grow code (4+ files)
7. 🚀 Deploy to production

---

## ⚡ Quick Reference

### Import Changes

**Before:**
```typescript
import { createPayment } from '@/lib/grow';
```

**After:**
```typescript
import { createOneTimePayment } from '@/lib/payplus';
```

### Function Call Changes

**Before:**
```typescript
const result = await createPayment({
  amount: 1000,
  customer_name: "John",
  // ...
});
```

**After:**
```typescript
const result = await createOneTimePayment({
  sum: 1000,
  customer_name: "John",
  // ... (similar parameters)
});
```

---

## 🆘 Rollback Plan

If issues arise:
1. Keep Grow code in git history
2. Can quickly revert changes
3. Switch back environment variables
4. Re-deploy previous version

---

Status: 🟡 Ready to Start Migration
Next: Update first API route and test

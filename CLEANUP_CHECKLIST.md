# 🧹 Pre-Deployment Code Cleanup Checklist

## Status Legend
- ⏳ **TO REVIEW** - Needs verification
- ✅ **KEEP** - Confirmed in use
- ❌ **DELETE** - Safe to remove
- ⚠️ **REVIEW NEEDED** - Requires your decision

---

## 1. TEST & DEVELOPMENT PAGES

### Test Pages (TO DELETE)
- ⏳ `/app/test/page.tsx` - Test page
- ⏳ `/app/test-payment/page.tsx` - Payment test page
- ⏳ `/app/test-payments/page.tsx` - Payment test page (duplicate?)
- ⏳ `/app/mock-payment-page/page.tsx` - Mock payment testing
- ⏳ `/app/admin/test-email-delay/page.tsx` - Email delay testing

### Test API Routes (TO DELETE)
- ⏳ `/app/api/test-route/route.ts` - Test route
- ⏳ `/app/api/mock-grow/create-payment/route.ts` - Mock payment API
- ⏳ `/app/api/debug-constraint/route.ts` - Debug route
- ⏳ `/app/api/admin/test-monitoring/route.ts` - Monitoring test

---

## 2. BACKUP & TEMPORARY FILES

### Files to Delete
- ⏳ `/app/admin/settings/page.tsx.backup` - Backup file

---

## 3. POTENTIALLY UNUSED PAGES

### Public Pages
- ⏳ `/app/about/page.tsx` - About page (is this used?)
- ⏳ `/app/services/page.tsx` - Services page (is this used?)
- ⏳ `/app/billing/page.tsx` - Billing page (duplicate of subscription?)
- ⏳ `/app/403/page.tsx` - 403 error page (is this used?)
- ⏳ `/app/thanks/page.tsx` - Thank you page (after what action?)

---

## 4. DUPLICATE/OLD COMPONENTS

### To Review
- ⏳ `FootageTimelinePlayer.tsx` - Old timeline player (replaced by ProfessionalClipTimeline?)
- ⏳ `SimpleCameraPlayer.tsx` - Simple player (still used?)
- ⏳ `SimpleDateTabs.tsx` - Date tabs (replaced?)
- ⏳ `CameraCard.tsx` - Camera card (replaced by SurveillanceCameraView?)
- ⏳ `ClientSidebar.tsx` - Client sidebar (duplicate of DashboardSidebar?)
- ⏳ `Sidebar.tsx` - Generic sidebar (which one is used?)
- ⏳ `DashboardTopBar.tsx` - Top bar (still used in new design?)
- ⏳ `ModernNavbar.tsx` vs `ConditionalNavbar.tsx` - Which navbar is active?
- ⏳ `EasyTimePicker.tsx` - Time picker (still used?)
- ⏳ `DownloadRequestForm.tsx` - Download form (still used?)

### Dashboard Components Subfolder
- ⏳ `/components/dashboard/DownloadCard.tsx` - Download card
- ⏳ `/components/dashboard/PlanCard.tsx` - Plan card (page deleted)
- ⏳ `/components/dashboard/SupportCard.tsx` - Support card

---

## 5. API ROUTES TO REVIEW

### Possibly Duplicate Admin Routes
- ⏳ `/api/admin-all-cameras/route.ts` vs `/api/admin/diagnostics/cameras/route.ts`
- ⏳ `/api/admin-create-camera/route.ts` - Old API pattern
- ⏳ `/api/admin-create-user/route.ts` vs `/api/admin/create-user-and-payment/route.ts`
- ⏳ `/api/admin-delete-camera/route.ts` - Old API pattern
- ⏳ `/api/admin-delete-user/route.ts` - Old API pattern
- ⏳ `/api/admin-edit-user/route.ts` - Old API pattern
- ⏳ `/api/admin-fetch-cameras/route.ts` - Old API pattern
- ⏳ `/api/admin-get-support/route.ts` - Old API pattern
- ⏳ `/api/admin-get-users/route.ts` - Old API pattern
- ⏳ `/api/admin-handle-support/route.ts` - Old API pattern
- ⏳ `/api/admin-mark-support/route.ts` - Old API pattern
- ⏳ `/api/admin-invite-user/route.ts` - Old API pattern

### Diagnostic/Debug Routes (Production Decision)
- ⏳ `/api/admin/diagnostics/*` - Multiple diagnostic endpoints (keep for production troubleshooting?)
- ⏳ `/api/admin/cleanup/route.ts` - Cleanup utility
- ⏳ `/api/admin/cleanup-duplicate-alerts/route.ts` - Alert cleanup
- ⏳ `/api/admin/alerts/delete-all/route.ts` - Delete all alerts
- ⏳ `/api/admin/alerts/delete-resolved/route.ts` - Delete resolved alerts

### Payment Routes
- ⏳ `/api/calculate-price/route.ts` - Calculate price (still used?)
- ⏳ `/api/webhooks/payplus/route.ts` - PayPlus webhook (using Grow instead?)

---

## 6. LIB/LIBS FOLDERS

### Duplicate Library Folders
- ⏳ `/src/lib/` - Library folder
- ⏳ `/src/libs/` - Another library folder (typo? consolidate?)

---

## 7. UNUSED CONTEXTS

### To Review
- ⏳ `/src/contexts/` - Check what contexts exist and if they're used

---

## 8. SCRIPTS FOLDER

### To Review
- ⏳ `/src/scripts/` - What scripts are here? Still needed?

---

## 🎯 NEXT STEPS

1. **Phase 1**: Remove obvious test/development files
2. **Phase 2**: Review and decide on potentially unused pages
3. **Phase 3**: Consolidate duplicate components
4. **Phase 4**: Clean up API routes
5. **Phase 5**: Remove commented code and unused imports
6. **Phase 6**: Final testing

---

## ⚠️ IMPORTANT NOTES

- **DO NOT delete until verified**
- **Test after each deletion**
- **Keep git commits separate for easy rollback**
- **Document what each file was used for**


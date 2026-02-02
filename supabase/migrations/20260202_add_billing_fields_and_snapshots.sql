-- Add billing fields to users + billing snapshot to invoices (for exempt dealer document flow)
-- Migration created: 2026-02-02

-- 1) Users: store billing defaults (admin-managed)
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS customer_type TEXT DEFAULT 'private' CHECK (customer_type IN ('private', 'business')),
ADD COLUMN IF NOT EXISTS company_name TEXT;

COMMENT ON COLUMN public.users.customer_type IS 'Billing customer type: private or business (admin-managed)';
COMMENT ON COLUMN public.users.company_name IS 'Company/business name for billing documents (if customer_type=business)';

-- 2) Invoices: store immutable snapshot of billing details used when issuing the document
ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS billing_snapshot JSONB,
ADD COLUMN IF NOT EXISTS issuer_snapshot JSONB;

COMMENT ON COLUMN public.invoices.billing_snapshot IS 'Immutable billing details snapshot (private/business, company, vat_number, address, city, etc.) used for this document';
COMMENT ON COLUMN public.invoices.issuer_snapshot IS 'Immutable issuer details snapshot (ClearPoint / exempt dealer settings) used for this document';

CREATE INDEX IF NOT EXISTS idx_invoices_billing_snapshot_gin ON public.invoices USING GIN (billing_snapshot);

-- Fix payments ↔ invoices linkage

-- 1) Ensure payments has provider_payment_url (used by API code)
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS provider_payment_url text;

-- 2) Convert payments.invoice_id from text to uuid safely
DO $$
BEGIN
  -- If invoice_id is still text, migrate it to a proper uuid column.
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'payments'
      AND column_name = 'invoice_id'
      AND data_type = 'text'
  ) THEN
    -- Preserve legacy column
    ALTER TABLE public.payments RENAME COLUMN invoice_id TO invoice_id_text;

    -- New uuid column
    ALTER TABLE public.payments ADD COLUMN invoice_id uuid;

    -- Backfill where possible (only cast valid uuid strings)
    UPDATE public.payments
    SET invoice_id = invoice_id_text::uuid
    WHERE invoice_id_text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  END IF;
END $$;

-- 3) Add FK + index for the new payments.invoice_id
ALTER TABLE public.payments
DROP CONSTRAINT IF EXISTS payments_invoice_id_fkey;

ALTER TABLE public.payments
ADD CONSTRAINT payments_invoice_id_fkey
FOREIGN KEY (invoice_id)
REFERENCES public.invoices (id)
ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON public.payments (invoice_id);

-- 4) Backfill invoices.payment_id (use latest payment for each invoice)
WITH latest_payment AS (
  SELECT DISTINCT ON (p.invoice_id)
    p.invoice_id,
    p.id AS payment_id
  FROM public.payments p
  WHERE p.invoice_id IS NOT NULL
  ORDER BY p.invoice_id, p.created_at DESC, p.id DESC
)
UPDATE public.invoices i
SET payment_id = lp.payment_id
FROM latest_payment lp
WHERE i.id = lp.invoice_id
  AND i.payment_id IS NULL;

-- 5) (Optional but helpful) FK from invoices.payment_id → payments.id
-- This enforces that when invoices.payment_id is set, it must reference a real payment.
ALTER TABLE public.invoices
DROP CONSTRAINT IF EXISTS invoices_payment_id_fkey;

ALTER TABLE public.invoices
ADD CONSTRAINT invoices_payment_id_fkey
FOREIGN KEY (payment_id)
REFERENCES public.payments (id)
ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_payment_id ON public.invoices (payment_id);

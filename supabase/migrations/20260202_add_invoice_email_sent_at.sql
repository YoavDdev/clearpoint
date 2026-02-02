-- Track automatic invoice/receipt email dispatch (idempotency)
ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_invoices_email_sent_at ON public.invoices (email_sent_at);

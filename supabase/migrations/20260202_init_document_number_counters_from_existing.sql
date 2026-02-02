-- Initialize document_number_counters from existing invoices
-- Prevents first-run collisions when switching to separate numbering series.

INSERT INTO public.document_number_counters (year, document_type, last_number, updated_at)
SELECT
  LEFT(i.invoice_number, 4)::int AS year,
  i.document_type,
  MAX(RIGHT(i.invoice_number, 4)::int) AS last_number,
  now() AS updated_at
FROM public.invoices i
WHERE
  i.document_type IN ('quote', 'invoice')
  AND i.invoice_number ~ '^\d{4}-\d{4}$'
GROUP BY LEFT(i.invoice_number, 4)::int, i.document_type
ON CONFLICT (year, document_type)
DO UPDATE SET
  last_number = GREATEST(public.document_number_counters.last_number, EXCLUDED.last_number),
  updated_at = now();

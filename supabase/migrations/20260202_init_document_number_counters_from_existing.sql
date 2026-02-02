-- Initialize document_number_counters from existing invoices
-- Prevents first-run collisions when switching to separate numbering series.

INSERT INTO public.document_number_counters (year, document_type, last_number, updated_at)
SELECT
  (
    CASE
      WHEN i.invoice_number ~ '^Q-\d{4}-\d{4}$' THEN SUBSTRING(i.invoice_number FROM 3 FOR 4)::int
      ELSE SUBSTRING(i.invoice_number FROM 1 FOR 4)::int
    END
  ) AS year,
  i.document_type,
  MAX(
    CASE
      WHEN i.invoice_number ~ '^\d{4}-\d{4}$' THEN RIGHT(i.invoice_number, 4)::int
      WHEN i.invoice_number ~ '^Q-\d{4}-\d{4}$' THEN RIGHT(i.invoice_number, 4)::int
      ELSE NULL
    END
  ) AS last_number,
  now() AS updated_at
FROM public.invoices i
WHERE
  i.document_type IN ('quote', 'invoice')
  AND (
    i.invoice_number ~ '^\d{4}-\d{4}$'
    OR i.invoice_number ~ '^Q-\d{4}-\d{4}$'
  )
GROUP BY
  (
    CASE
      WHEN i.invoice_number ~ '^Q-\d{4}-\d{4}$' THEN SUBSTRING(i.invoice_number FROM 3 FOR 4)::int
      ELSE SUBSTRING(i.invoice_number FROM 1 FOR 4)::int
    END
  ),
  i.document_type
ON CONFLICT (year, document_type)
DO UPDATE SET
  last_number = GREATEST(public.document_number_counters.last_number, EXCLUDED.last_number),
  updated_at = now();

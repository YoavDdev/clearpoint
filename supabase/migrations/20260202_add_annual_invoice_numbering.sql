-- Annual atomic invoice numbering: YYYY-0001 (resets every year)

-- 1) Counter table
CREATE TABLE IF NOT EXISTS public.invoice_number_counters (
  year integer PRIMARY KEY,
  last_number integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2) Atomic generator function
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_year integer;
  v_next integer;
BEGIN
  v_year := EXTRACT(YEAR FROM now())::integer;

  INSERT INTO public.invoice_number_counters (year, last_number)
  VALUES (v_year, 1)
  ON CONFLICT (year)
  DO UPDATE SET
    last_number = public.invoice_number_counters.last_number + 1,
    updated_at = now()
  RETURNING last_number INTO v_next;

  RETURN v_year::text || '-' || LPAD(v_next::text, 4, '0');
END;
$$;

ALTER FUNCTION public.generate_invoice_number()
SET search_path = public, pg_temp;

CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_invoice_number_unique
ON public.invoices (invoice_number);

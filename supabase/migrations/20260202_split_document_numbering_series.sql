-- Split document numbering series by document_type (quote vs invoice)
-- Both use annual format YYYY-0001 but maintain separate counters.

-- 1) New counters table (separate from invoice_number_counters)
CREATE TABLE IF NOT EXISTS public.document_number_counters (
  year integer NOT NULL,
  document_type text NOT NULL CHECK (document_type IN ('quote', 'invoice')),
  last_number integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (year, document_type)
);

-- 2) Atomic generator with series per document_type
CREATE OR REPLACE FUNCTION public.generate_document_number(p_document_type text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_year integer;
  v_next integer;
  v_doc_type text;
BEGIN
  v_doc_type := COALESCE(p_document_type, 'invoice');

  IF v_doc_type NOT IN ('quote', 'invoice') THEN
    RAISE EXCEPTION 'Invalid document type: %', v_doc_type;
  END IF;

  v_year := EXTRACT(YEAR FROM now())::integer;

  INSERT INTO public.document_number_counters (year, document_type, last_number)
  VALUES (v_year, v_doc_type, 1)
  ON CONFLICT (year, document_type)
  DO UPDATE SET
    last_number = public.document_number_counters.last_number + 1,
    updated_at = now()
  RETURNING last_number INTO v_next;

  RETURN v_year::text || '-' || LPAD(v_next::text, 4, '0');
END;
$$;

ALTER FUNCTION public.generate_document_number(text)
SET search_path = public, pg_temp;

-- 3) Backward compatible wrappers
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT public.generate_document_number('invoice');
$$;

ALTER FUNCTION public.generate_invoice_number()
SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.generate_quote_number()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT public.generate_document_number('quote');
$$;

ALTER FUNCTION public.generate_quote_number()
SET search_path = public, pg_temp;

-- 4) Uniqueness: allow same number across types but unique within type
DROP INDEX IF EXISTS public.idx_invoices_invoice_number_unique;

CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_document_type_invoice_number_unique
ON public.invoices (document_type, invoice_number);

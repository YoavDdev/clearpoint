-- Quote numbering prefix: Q-YYYY-0001 (separate from receipts)
-- Receipts (invoice) remain: YYYY-0001

CREATE OR REPLACE FUNCTION public.generate_document_number(p_document_type text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_year integer;
  v_next integer;
  v_doc_type text;
  v_prefix text;
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

  v_prefix := CASE WHEN v_doc_type = 'quote' THEN 'Q-' ELSE '' END;

  RETURN v_prefix || v_year::text || '-' || LPAD(v_next::text, 4, '0');
END;
$$;

ALTER FUNCTION public.generate_document_number(text)
SET search_path = public, pg_temp;

-- Keep wrappers (no-op, but ensures signature exists and search_path is correct)
ALTER FUNCTION public.generate_invoice_number()
SET search_path = public, pg_temp;

ALTER FUNCTION public.generate_quote_number()
SET search_path = public, pg_temp;

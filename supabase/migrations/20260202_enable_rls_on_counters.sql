-- Enable RLS on counters tables to satisfy Supabase linter and prevent PostgREST access

-- invoice_number_counters (legacy table)
ALTER TABLE public.invoice_number_counters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all" ON public.invoice_number_counters;
CREATE POLICY "service_role_all" ON public.invoice_number_counters
FOR ALL TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "deny_anon_authenticated" ON public.invoice_number_counters;
CREATE POLICY "deny_anon_authenticated" ON public.invoice_number_counters
FOR ALL TO anon, authenticated
USING (false)
WITH CHECK (false);

-- document_number_counters (current table)
ALTER TABLE public.document_number_counters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all" ON public.document_number_counters;
CREATE POLICY "service_role_all" ON public.document_number_counters
FOR ALL TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "deny_anon_authenticated" ON public.document_number_counters;
CREATE POLICY "deny_anon_authenticated" ON public.document_number_counters
FOR ALL TO anon, authenticated
USING (false)
WITH CHECK (false);

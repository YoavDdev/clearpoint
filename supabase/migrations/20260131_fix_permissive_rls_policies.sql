DROP POLICY IF EXISTS "Admin full access to notifications" ON public.admin_notifications;
CREATE POLICY "Admin full access to notifications"
ON public.admin_notifications
FOR ALL
TO authenticated
USING ((auth.jwt() ->> 'role') = 'admin')
WITH CHECK ((auth.jwt() ->> 'role') = 'admin');

DROP POLICY IF EXISTS "Allow updates to stream status" ON public.cameras;

DROP POLICY IF EXISTS "Allow health inserts/updates" ON public.device_health;
CREATE POLICY "Allow health inserts/updates"
ON public.device_health
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Admin full access invoice_items" ON public.invoice_items;
CREATE POLICY "Admin full access invoice_items"
ON public.invoice_items
FOR ALL
TO authenticated
USING ((auth.jwt() ->> 'role') = 'admin')
WITH CHECK ((auth.jwt() ->> 'role') = 'admin');

DROP POLICY IF EXISTS "Users view own invoice items" ON public.invoice_items;
CREATE POLICY "Users view own invoice items"
ON public.invoice_items
FOR SELECT
TO authenticated
USING (
  invoice_id IN (
    SELECT invoices.id
    FROM public.invoices
    WHERE invoices.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Admin full access invoices" ON public.invoices;
CREATE POLICY "Admin full access invoices"
ON public.invoices
FOR ALL
TO authenticated
USING ((auth.jwt() ->> 'role') = 'admin')
WITH CHECK ((auth.jwt() ->> 'role') = 'admin');

DROP POLICY IF EXISTS "Users can approve or reject their quotes" ON public.invoices;
CREATE POLICY "Users can approve or reject their quotes"
ON public.invoices
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id
  AND document_type = 'quote'
  AND status = 'quote_sent'
)
WITH CHECK (
  auth.uid() = user_id
  AND document_type = 'quote'
  AND status = 'quote_sent'
);

DROP POLICY IF EXISTS "Users can view their own quotes" ON public.invoices;
CREATE POLICY "Users can view their own quotes"
ON public.invoices
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users view own invoices" ON public.invoices;
CREATE POLICY "Users view own invoices"
ON public.invoices
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admin full access item_templates" ON public.item_templates;
CREATE POLICY "Admin full access item_templates"
ON public.item_templates
FOR ALL
TO authenticated
USING ((auth.jwt() ->> 'role') = 'admin')
WITH CHECK ((auth.jwt() ->> 'role') = 'admin');

DROP POLICY IF EXISTS "Admin can manage all alerts" ON public.system_alerts;
CREATE POLICY "Admin can manage all alerts"
ON public.system_alerts
FOR ALL
TO authenticated
USING ((auth.jwt() ->> 'role') = 'admin')
WITH CHECK ((auth.jwt() ->> 'role') = 'admin');

DROP POLICY IF EXISTS "Enable all access for service role" ON public.system_alerts;

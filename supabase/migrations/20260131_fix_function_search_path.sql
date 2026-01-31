ALTER FUNCTION public.check_subscription_access(p_user_id uuid)
SET search_path = public, pg_temp;

ALTER FUNCTION public.check_subscription_health(sub_id uuid)
SET search_path = public, pg_temp;

ALTER FUNCTION public.find_expiring_trials()
SET search_path = public, pg_temp;

ALTER FUNCTION public.find_paused_to_resume()
SET search_path = public, pg_temp;

ALTER FUNCTION public.find_subscriptions_needing_sync()
SET search_path = public, pg_temp;

ALTER FUNCTION public.find_subscriptions_to_cancel()
SET search_path = public, pg_temp;

ALTER FUNCTION public.generate_invoice_number()
SET search_path = public, pg_temp;

ALTER FUNCTION public.get_mini_pc_id(p_user_id uuid, p_hostname text)
SET search_path = public, pg_temp;

ALTER FUNCTION public.update_admin_notifications_updated_at()
SET search_path = public, pg_temp;

ALTER FUNCTION public.update_invoice_updated_at()
SET search_path = public, pg_temp;

ALTER FUNCTION public.update_next_payment_date()
SET search_path = public, pg_temp;

ALTER FUNCTION public.update_recurring_payments_updated_at()
SET search_path = public, pg_temp;

ALTER FUNCTION public.update_updated_at_column()
SET search_path = public, pg_temp;

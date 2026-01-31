CREATE OR REPLACE VIEW public.recent_payments
WITH (security_invoker = true)
AS
 SELECT p.id,
    p.user_id,
    p.payment_type,
    p.amount,
    p.currency,
    p.status,
    p.payment_provider,
    p.provider_payment_id,
    p.provider_transaction_id,
    p.description,
    p.items,
    p.invoice_id,
    p.invoice_number,
    p.invoice_url,
    p.receipt_url,
    p.created_at,
    p.paid_at,
    p.updated_at,
    p.metadata,
    p.notes,
    u.email,
    u.full_name,
    u.phone
   FROM payments p
     JOIN users u ON p.user_id = u.id
  ORDER BY p.created_at DESC
 LIMIT 100;

CREATE OR REPLACE VIEW public.admin_monitoring_hierarchy
WITH (security_invoker = true)
AS
 SELECT u.id AS user_id,
    u.full_name AS customer_name,
    u.email AS customer_email,
    u.plan_id,
    mp.id AS mini_pc_id,
    mp.device_name AS mini_pc_name,
    mp.hostname,
    mp.ip_address,
    mp.last_seen_at AS mini_pc_last_seen,
    mph.overall_status AS mini_pc_status,
    mph.cpu_temp_celsius,
    mph.cpu_usage_pct,
    mph.ram_usage_pct,
    mph.disk_root_pct,
    mph.uptime_seconds,
    mph.internet_connected,
    mph.last_checked AS mini_pc_last_checked,
    count(c.id) AS camera_count,
    count(
        CASE
            WHEN ch.stream_status = 'ok'::text THEN 1
            ELSE NULL::integer
        END) AS cameras_healthy,
    count(
        CASE
            WHEN ch.stream_status = ANY (ARRAY['error'::text, 'missing'::text]) THEN 1
            ELSE NULL::integer
        END) AS cameras_error
   FROM users u
     LEFT JOIN mini_pcs mp ON u.id = mp.user_id
     LEFT JOIN mini_pc_health mph ON mp.id = mph.mini_pc_id AND mph.created_at = (( SELECT max(mph2.created_at) AS max
           FROM mini_pc_health mph2
          WHERE mph2.mini_pc_id = mp.id))
     LEFT JOIN cameras c ON mp.id = c.mini_pc_id
     LEFT JOIN camera_health ch ON c.id = ch.camera_id AND ch.created_at = (( SELECT max(ch2.created_at) AS max
           FROM camera_health ch2
          WHERE ch2.camera_id = c.id))
  GROUP BY u.id, u.full_name, u.email, u.plan_id, mp.id, mp.device_name, mp.hostname, mp.ip_address, mp.last_seen_at, mph.overall_status, mph.cpu_temp_celsius, mph.cpu_usage_pct, mph.ram_usage_pct, mph.disk_root_pct, mph.uptime_seconds, mph.internet_connected, mph.last_checked;

REVOKE ALL ON public.recent_payments FROM PUBLIC;
REVOKE ALL ON public.recent_payments FROM anon;
REVOKE ALL ON public.recent_payments FROM authenticated;
GRANT SELECT ON public.recent_payments TO service_role;

REVOKE ALL ON public.admin_monitoring_hierarchy FROM PUBLIC;
REVOKE ALL ON public.admin_monitoring_hierarchy FROM anon;
REVOKE ALL ON public.admin_monitoring_hierarchy FROM authenticated;
GRANT SELECT ON public.admin_monitoring_hierarchy TO service_role;

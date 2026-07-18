-- ============================================================================
-- RLS Policies for Clearpoint Security
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- 
-- WHY: All API routes use service_role key (bypasses RLS), but the anon key
-- is exposed in the frontend. Without RLS, anyone with the anon key can
-- read/write any table directly via PostgREST.
--
-- STRATEGY:
-- 1. Enable RLS on ALL tables
-- 2. Deny all access via anon key (no policies = deny by default)
-- 3. Allow authenticated users to read only their own data
-- 4. service_role continues to bypass RLS (no change to backend)
-- ============================================================================

-- ─── STEP 1: Enable RLS on all application tables ───────────────────────────

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE cameras ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE vod_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE camera_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE mini_pc_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE mini_pcs ENABLE ROW LEVEL SECURITY;
ALTER TABLE mini_pc_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_number_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;
-- admin_monitoring_hierarchy is a VIEW (not a table), RLS not applicable
-- recent_payments is a VIEW (not a table), RLS not applicable

-- ─── STEP 2: Public tables (anon can INSERT only) ───────────────────────────

-- subscription_requests: public form can submit requests
CREATE POLICY "anon_insert_subscription_requests"
  ON subscription_requests
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- support_requests: logged-in users can submit support (via frontend)
CREATE POLICY "authenticated_insert_support"
  ON support_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ─── STEP 3: Authenticated user policies (dashboard access) ────────────────

-- Users can read their own profile
CREATE POLICY "users_select_own"
  ON users
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Users can read their own cameras
CREATE POLICY "cameras_select_own"
  ON cameras
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can read their own alerts
CREATE POLICY "alerts_select_own"
  ON alerts
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can read their own VOD files
CREATE POLICY "vod_files_select_own"
  ON vod_files
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can read their own payments
CREATE POLICY "payments_select_own"
  ON payments
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can read their own invoices
CREATE POLICY "invoices_select_own"
  ON invoices
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can read invoice items for their invoices
CREATE POLICY "invoice_items_select_own"
  ON invoice_items
  FOR SELECT
  TO authenticated
  USING (
    invoice_id IN (
      SELECT id FROM invoices WHERE user_id = auth.uid()
    )
  );

-- Users can read their own recurring payments
CREATE POLICY "recurring_payments_select_own"
  ON recurring_payments
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can read their own support requests
CREATE POLICY "support_requests_select_own"
  ON support_requests
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Plans are public read (needed for subscribe page)
CREATE POLICY "plans_select_all"
  ON plans
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Users can read their own alert rules
CREATE POLICY "alert_rules_select_own"
  ON alert_rules
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can manage their own alert rules
CREATE POLICY "alert_rules_insert_own"
  ON alert_rules
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "alert_rules_update_own"
  ON alert_rules
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "alert_rules_delete_own"
  ON alert_rules
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ─── STEP 4: Tables with NO user-facing access (admin-only via service_role) ─
-- These have RLS enabled but NO policies = deny all via anon/authenticated.
-- Only service_role (backend) can access them:
--   - mini_pcs
--   - mini_pc_tokens
--   - mini_pc_health
--   - camera_health
--   - system_logs
--   - system_alerts
--   - system_settings
--   - audit_log
--   - item_templates
--   - document_number_counters
--   - admin_notifications

-- ─── VERIFICATION ───────────────────────────────────────────────────────────
-- After running, verify in Dashboard → Authentication → Policies
-- All tables should show "RLS enabled" with green checkmark.
-- Test: Try reading `users` table with anon key — should return empty array.

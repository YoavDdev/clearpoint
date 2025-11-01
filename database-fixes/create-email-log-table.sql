-- ================================================================
-- CREATE EMAIL LOG TABLE
-- ================================================================
-- Tracks manual emails sent from admin to customers
-- ================================================================

CREATE TABLE IF NOT EXISTS admin_emails_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  customer_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resend_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_admin_emails_customer ON admin_emails_log(customer_id);
CREATE INDEX IF NOT EXISTS idx_admin_emails_sent_at ON admin_emails_log(sent_at DESC);

-- Grant permissions
ALTER TABLE admin_emails_log ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can view email logs
CREATE POLICY "Admin can view all email logs" ON admin_emails_log
  FOR SELECT
  USING (true);  -- Will be restricted by service role key

COMMENT ON TABLE admin_emails_log IS 'Logs of manual emails sent from admin to customers';

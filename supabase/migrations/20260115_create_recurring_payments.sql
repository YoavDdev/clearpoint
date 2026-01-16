-- Create recurring_payments table
CREATE TABLE IF NOT EXISTS recurring_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- User and Plan references
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id TEXT REFERENCES plans(id) ON DELETE SET NULL,
  
  -- PayPlus identifiers
  recurring_uid TEXT,
  customer_uid TEXT,
  card_token TEXT,
  
  -- Recurring settings
  recurring_type INTEGER NOT NULL DEFAULT 2, -- 0=daily, 1=weekly, 2=monthly
  recurring_range INTEGER NOT NULL DEFAULT 1, -- e.g., every 2 months
  number_of_charges INTEGER DEFAULT 0, -- 0 = unlimited
  
  -- Dates
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE,
  last_charge_date TIMESTAMP WITH TIME ZONE,
  next_charge_date TIMESTAMP WITH TIME ZONE,
  
  -- Payment details
  amount DECIMAL(10,2) NOT NULL,
  currency_code TEXT NOT NULL DEFAULT 'ILS',
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Status flags
  is_active BOOLEAN DEFAULT true,
  is_valid BOOLEAN DEFAULT true,
  
  -- Extra info
  extra_info TEXT,
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_recurring_payments_user_id ON recurring_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_payments_plan_id ON recurring_payments(plan_id);
CREATE INDEX IF NOT EXISTS idx_recurring_payments_recurring_uid ON recurring_payments(recurring_uid);
CREATE INDEX IF NOT EXISTS idx_recurring_payments_is_active ON recurring_payments(is_active);
CREATE INDEX IF NOT EXISTS idx_recurring_payments_next_charge ON recurring_payments(next_charge_date);

-- RLS Policies
ALTER TABLE recurring_payments ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Admins have full access to recurring payments"
  ON recurring_payments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.role = 'admin'
    )
  );

-- Users can view their own recurring payments
CREATE POLICY "Users can view their own recurring payments"
  ON recurring_payments
  FOR SELECT
  USING (user_id = auth.uid());

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_recurring_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER recurring_payments_updated_at
  BEFORE UPDATE ON recurring_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_recurring_payments_updated_at();

-- =============================================
-- Update payments table for PayPlus support
-- =============================================

-- הוספת עמודת provider (payplus או grow)
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS provider VARCHAR(50) DEFAULT 'payplus';

-- הוספת עמודות נוספות ל-PayPlus
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS provider_payment_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS provider_transaction_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- יצירת אינדקסים לביצועים
CREATE INDEX IF NOT EXISTS idx_payments_provider ON payments(provider);
CREATE INDEX IF NOT EXISTS idx_payments_provider_payment_id ON payments(provider_payment_id);
CREATE INDEX IF NOT EXISTS idx_payments_provider_transaction_id ON payments(provider_transaction_id);

-- עדכון רשומות קיימות (אם יש)
UPDATE payments 
SET provider = 'payplus' 
WHERE provider IS NULL;

-- הצגת המבנה המעודכן
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'payments' 
ORDER BY ordinal_position;

-- הוספת תמיכה במנוי חודשי בחשבוניות
-- Add subscription support to invoices table

-- הוספת עמודות למנוי חודשי
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS has_subscription boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS monthly_price numeric(10,2) DEFAULT NULL;

-- הוספת תגובות לעמודות
COMMENT ON COLUMN invoices.has_subscription IS 'האם החשבונית כוללת מנוי חודשי';
COMMENT ON COLUMN invoices.monthly_price IS 'מחיר המנוי החודשי (₪)';

-- הצגת עמודות החשבוניות המעודכנות
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'invoices' 
  AND column_name IN ('has_subscription', 'monthly_price')
ORDER BY ordinal_position;

-- ===============================================
-- מערכת חשבוניות מפורטת
-- ===============================================

-- טבלה ראשית: חשבוניות
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  invoice_number TEXT UNIQUE, -- מספר חשבונית אוטומטי
  status TEXT DEFAULT 'draft', -- draft, sent, paid, cancelled
  total_amount DECIMAL(10,2) DEFAULT 0,
  currency TEXT DEFAULT 'ILS',
  notes TEXT,
  payment_id UUID REFERENCES payments(id),
  payment_link TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_by UUID, -- מי מהאדמינים יצר
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- טבלה: פריטי חשבונית
CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL, -- 'nvr', 'camera', 'poe', 'labor', 'cable', 'other'
  item_name TEXT NOT NULL,
  item_description TEXT,
  quantity INTEGER DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL, -- quantity * unit_price
  camera_type TEXT, -- אם זה מצלמה: '2MP', '4MP', '5MP', etc.
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- טבלה: תבניות פריטים נפוצים (למהירות)
CREATE TABLE IF NOT EXISTS item_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_type TEXT NOT NULL,
  item_name TEXT NOT NULL,
  item_description TEXT,
  default_price DECIMAL(10,2) NOT NULL,
  camera_type TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- אינדקסים לביצועים
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_item_templates_type ON item_templates(item_type);

-- פונקציה ליצירת מספר חשבונית אוטומטי
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
  year_month TEXT;
  counter INTEGER;
  invoice_num TEXT;
BEGIN
  year_month := TO_CHAR(NOW(), 'YYYYMM');
  
  SELECT COUNT(*) + 1 INTO counter
  FROM invoices
  WHERE invoice_number LIKE year_month || '%';
  
  invoice_num := year_month || LPAD(counter::TEXT, 4, '0');
  
  RETURN invoice_num;
END;
$$ LANGUAGE plpgsql;

-- טריגר לעדכון updated_at אוטומטי
CREATE OR REPLACE FUNCTION update_invoice_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_invoice_timestamp
BEFORE UPDATE ON invoices
FOR EACH ROW
EXECUTE FUNCTION update_invoice_updated_at();

-- הוספת תבניות פריטים נפוצים
INSERT INTO item_templates (item_type, item_name, item_description, default_price, camera_type) VALUES
('nvr', 'מחשב NVR 8 ערוצים', 'מחשב הקלטה 8 ערוצים, דיסק 1TB', 800.00, NULL),
('nvr', 'מחשב NVR 16 ערוצים', 'מחשב הקלטה 16 ערוצים, דיסק 2TB', 1200.00, NULL),
('camera', 'מצלמת אבטחה 2MP', 'מצלמת כיפה פנימית/חיצונית', 350.00, '2MP'),
('camera', 'מצלמת אבטחה 4MP', 'מצלמת כיפה פנימית/חיצונית', 450.00, '4MP'),
('camera', 'מצלמת אבטחה 5MP', 'מצלמת כיפה פנימית/חיצונית', 550.00, '5MP'),
('poe', 'POE Switch 8 פורטים', 'מתג POE 8 פורטים 100W', 400.00, NULL),
('poe', 'POE Switch 16 פורטים', 'מתג POE 16 פורטים 200W', 700.00, NULL),
('cable', 'כבל רשת CAT6', 'כבל רשת מטר', 5.00, NULL),
('labor', 'עבודת התקנה', 'התקנה מקצועית כולל הגדרות', 500.00, NULL),
('other', 'אביזרים נלווים', 'ברגים, קופסאות חיבור וכו', 100.00, NULL)
ON CONFLICT DO NOTHING;

-- הוספת RLS (Row Level Security)
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_templates ENABLE ROW LEVEL SECURITY;

-- מדיניות: אדמינים יכולים הכל
CREATE POLICY "Admin full access invoices" ON invoices FOR ALL USING (true);
CREATE POLICY "Admin full access invoice_items" ON invoice_items FOR ALL USING (true);
CREATE POLICY "Admin full access item_templates" ON item_templates FOR ALL USING (true);

-- מדיניות: משתמשים רואים רק את החשבוניות שלהם
CREATE POLICY "Users view own invoices" ON invoices FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users view own invoice items" ON invoice_items FOR SELECT 
  USING (invoice_id IN (SELECT id FROM invoices WHERE user_id = auth.uid()));

COMMENT ON TABLE invoices IS 'חשבוניות ללקוחות עם פירוט מלא';
COMMENT ON TABLE invoice_items IS 'פריטים בודדים בחשבונית';
COMMENT ON TABLE item_templates IS 'תבניות פריטים נפוצים להוספה מהירה';

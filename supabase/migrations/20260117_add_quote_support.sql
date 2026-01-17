-- הוספת תמיכה בהצעות מחיר במערכת החשבוניות
-- Migration: Add quote support to invoices system

-- הוספת עמודות חדשות לטבלת invoices
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS document_type TEXT DEFAULT 'invoice' CHECK (document_type IN ('quote', 'invoice')),
ADD COLUMN IF NOT EXISTS quote_valid_until TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS converted_to_invoice_id UUID REFERENCES invoices(id);

-- עדכון הסטטוסים האפשריים (מורחב)
-- הסטטוסים החדשים:
-- quote_draft - הצעת מחיר בעריכה
-- quote_sent - הצעת מחיר נשלחה ללקוח
-- quote_approved - לקוח אישר את הצעת המחיר
-- quote_rejected - לקוח דחה את הצעת המחיר
-- draft - חשבונית בעריכה
-- sent - חשבונית נשלחה (ממתין לתשלום)
-- paid - חשבונית שולמה
-- cancelled - בוטל

-- הסרת ה-constraint הישן (אם קיים)
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check;

-- הוספת constraint חדש עם כל הסטטוסים
ALTER TABLE invoices 
ADD CONSTRAINT invoices_status_check 
CHECK (status IN (
  'quote_draft',
  'quote_sent', 
  'quote_approved',
  'quote_rejected',
  'draft',
  'sent',
  'paid',
  'cancelled'
));

-- אינדקסים לביצועים
CREATE INDEX IF NOT EXISTS idx_invoices_document_type ON invoices(document_type);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_user_document_type ON invoices(user_id, document_type);
CREATE INDEX IF NOT EXISTS idx_invoices_converted_to ON invoices(converted_to_invoice_id);

-- הערות לטבלה
COMMENT ON COLUMN invoices.document_type IS 'סוג המסמך: quote (הצעת מחיר) או invoice (חשבונית)';
COMMENT ON COLUMN invoices.quote_valid_until IS 'תוקף הצעת המחיר (רלוונטי רק להצעות מחיר)';
COMMENT ON COLUMN invoices.approved_at IS 'מתי הלקוח אישר את הצעת המחיר';
COMMENT ON COLUMN invoices.rejected_at IS 'מתי הלקוח דחה את הצעת המחיר';
COMMENT ON COLUMN invoices.rejection_reason IS 'סיבת הדחייה שהלקוח הזין';
COMMENT ON COLUMN invoices.converted_to_invoice_id IS 'אם הצעת מחיר הומרה לחשבונית - ID של החשבונית';

-- עדכון RLS policies (אם צריך)
-- מאפשר ללקוחות לראות את הצעות המחיר שלהם
DROP POLICY IF EXISTS "Users can view their own quotes" ON invoices;
CREATE POLICY "Users can view their own quotes" 
ON invoices FOR SELECT 
USING (auth.uid() = user_id);

-- מאפשר ללקוחות לעדכן את סטטוס הצעת המחיר שלהם (אישור/דחייה)
DROP POLICY IF EXISTS "Users can approve or reject their quotes" ON invoices;
CREATE POLICY "Users can approve or reject their quotes" 
ON invoices FOR UPDATE 
USING (
  auth.uid() = user_id 
  AND document_type = 'quote' 
  AND status = 'quote_sent'
);

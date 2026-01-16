-- Add business-related fields to users table for PayPlus Customers integration
-- Migration created: 2026-01-15

-- Add new columns
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS vat_number TEXT,
ADD COLUMN IF NOT EXISTS business_city TEXT,
ADD COLUMN IF NOT EXISTS business_postal_code TEXT,
ADD COLUMN IF NOT EXISTS business_country_iso TEXT DEFAULT 'IL',
ADD COLUMN IF NOT EXISTS subject_code TEXT,
ADD COLUMN IF NOT EXISTS communication_email TEXT,
ADD COLUMN IF NOT EXISTS contacts JSONB DEFAULT '[]'::jsonb;

-- Add comments for documentation
COMMENT ON COLUMN public.users.vat_number IS 'Customer or Company VAT number (ח.פ / ע.מ)';
COMMENT ON COLUMN public.users.business_city IS 'Business city';
COMMENT ON COLUMN public.users.business_postal_code IS 'Business postal code';
COMMENT ON COLUMN public.users.business_country_iso IS 'Business country code (ISO, default: IL)';
COMMENT ON COLUMN public.users.subject_code IS 'External customer number in other ERP systems';
COMMENT ON COLUMN public.users.communication_email IS 'Email for communication purposes (defaults to main email)';
COMMENT ON COLUMN public.users.contacts IS 'Contact details as JSON array (for multiple contacts)';

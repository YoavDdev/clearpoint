-- שינוי סטטוס המנוי מ-cancelled ל-active
UPDATE subscriptions
SET status = 'active',
    updated_at = now()
WHERE id = '0ea6cdbd-4d24-4f55-a7fe-693aaf4e0db0';

-- בדיקה שהשינוי עבר
SELECT id, user_id, status, amount, next_billing_date 
FROM subscriptions 
WHERE id = '0ea6cdbd-4d24-4f55-a7fe-693aaf4e0db0';

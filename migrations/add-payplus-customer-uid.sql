-- הוספת עמודה לשמירת PayPlus customer_uid
-- זה מאפשר לנו לזהות משתמשים ב-webhooks

-- הוסף עמודה ל-subscriptions
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS payplus_customer_uid TEXT;

-- הוסף אינדקס לחיפוש מהיר
CREATE INDEX IF NOT EXISTS idx_subscriptions_payplus_customer_uid 
ON subscriptions(payplus_customer_uid);

-- הוסף גם ל-users (אופציונלי)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS payplus_customer_uid TEXT;

CREATE INDEX IF NOT EXISTS idx_users_payplus_customer_uid 
ON users(payplus_customer_uid);

-- הערה: כשיוצרים recurring payment, שמור את ה-customer_uid שחוזר מ-PayPlus

-- בדיקה: האם יש תוכניות בטבלה?
SELECT * FROM plans;

-- אם הטבלה ריקה, זה הסקריפט שיוסיף את התוכניות:
-- (אל תריץ את זה אם כבר יש תוכניות!)

/*
INSERT INTO plans (id, name, name_he, connection_type, monthly_price, storage_days, data_limit, description, description_he)
VALUES 
  ('plan-a', 'Plan A - SIM Router', 'תוכנית A - SIM Router', 'sim_router', 299, 7, 500, 'SIM Router with 500GB monthly data and 7 days retention', 'ראוטר SIM עם 500GB לחודש ו-7 ימי שמירה'),
  ('plan-b', 'Plan B - WiFi Cloud', 'תוכנית B - WiFi Cloud', 'wifi_cloud', 399, 14, NULL, 'WiFi Cloud with unlimited data and 14 days retention', 'ענן WiFi עם גלישה ללא הגבלה ו-14 ימי שמירה')
ON CONFLICT (id) DO NOTHING;
*/

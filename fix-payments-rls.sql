-- תיקון RLS policies לטבלת payments
-- =====================================

-- מחק policies קיימות
DROP POLICY IF EXISTS "Users can view their own payments" ON payments;
DROP POLICY IF EXISTS "Admins can view all payments" ON payments;

-- צור policies חדשות עם הרשאות INSERT

-- משתמשים יכולים ליצור תשלומים משלהם
CREATE POLICY "Users can insert their own payments" 
  ON payments 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- משתמשים יכולים לראות את התשלומים שלהם
CREATE POLICY "Users can view their own payments" 
  ON payments 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- אדמינים יכולים לעשות הכל
CREATE POLICY "Admins can do everything with payments" 
  ON payments 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- בדוק שזה עובד
SELECT 'RLS policies updated successfully!' as status;

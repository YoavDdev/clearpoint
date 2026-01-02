# שדות לקוח ב-PayPlus API

## מה PayPlus תומך (לפי הדוקומנטציה):

### **customer object:**
```json
{
  "customer_name": "string",     // ✅ כבר שולחים
  "email": "string",              // ✅ כבר שולחים  
  "phone": "string",              // ✅ כבר שולחים
  "customer_id": "string",        // מזהה פנימי שלנו
  "address": "string",            // כתובת מלאה
  "city": "string",               // עיר
  "identification_number": "string" // ת.ז / ע.מ
}
```

### **מה נוסיף:**
1. ✅ `phone` - כבר קיים ב-users table
2. ➕ `address` - צריך להוסיף ל-users table
3. ➕ `city` - צריך להוסיף ל-users table  
4. ➕ `identification_number` - צריך להוסיף ל-users table (אופציונלי)

### **more_info fields:**
- יכול להכיל מידע נוסף כ-string מופרד ב-`|`
- נשתמש לשמירת: `payment_id|invoice_number|user_id`

## תוכנית יישום:

1. **הוסף עמודות ל-users:**
   - address (text, nullable)
   - city (text, nullable)
   - identification_number (text, nullable)

2. **עדכן InvoiceCreator:**
   - הוסף שדות לכתובת ועיר בטופס
   - העבר את המידע ל-API

3. **עדכן create-invoice API:**
   - קבל address, city מה-request
   - העבר ל-createOneTimePayment

4. **עדכן createOneTimePayment:**
   - שלח את כל השדות ל-PayPlus

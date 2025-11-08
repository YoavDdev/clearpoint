# 🧪 הגדרת סביבת Sandbox לטסטים

## 🎯 מה זו סביבת Sandbox?

Sandbox היא סביבת פיתוח שמאפשרת לך לבדוק תשלומים **בלי לחייב כסף אמיתי**.

---

## 🔧 הגדרה מהירה

### **שלב 1: עדכן את `.env.local`**

צור/ערוך את הקובץ `.env.local` בשורש הפרויקט:

```env
# Grow/Meshulam - Sandbox (טסט)
GROW_API_KEY=sandbox_test_key_here
GROW_USER_ID=test_user_id
GROW_PAGE_CODE=test_page_code
GROW_BASE_URL=https://sandbox.meshulam.co.il

# Base URL
NEXT_PUBLIC_BASE_URL=http://localhost:3001

# Supabase (אל תשנה)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### **שלב 2: הפעל מחדש את השרת**

```bash
# עצור את השרת (Ctrl+C)
# הפעל מחדש
npm run dev
```

---

## 📧 קבלת API Keys מ-Grow

### **אם עדיין אין לך חשבון:**

1. **הירשם לGrow:**
   - לך ל: https://grow.business/
   - לחץ "הרשמה"
   - מלא פרטים

2. **הפעל Sandbox:**
   - היכנס לפורטל
   - לך ל: הגדרות → API
   - בחר: "Sandbox Mode"
   - העתק את ה-Keys

3. **הדבק ב-.env.local:**
   ```env
   GROW_API_KEY=sandbox_xxxxxxxxxxxxx
   GROW_USER_ID=test_12345
   GROW_PAGE_CODE=ABC123
   ```

---

## 🧪 בדיקה שהכל עובד

### **1. פתח דף טסט:**

```
http://localhost:3001/test-payments
```

אמור לראות דף עם כרטיסי אשראי לטסט.

### **2. נסה תשלום:**

```bash
1. כנס ל: http://localhost:3001/admin/customers
2. בחר לקוח
3. צור חשבונית
4. פתח לינק תשלום
5. הכנס כרטיס מדף הטסט
6. שלם
7. ✅ אמור לראות "תשלום הושלם"
```

---

## 🔍 איך לדעת שאתה ב-Sandbox?

### **בקוד:**

```typescript
// בדוק את ה-URL
const isSandbox = process.env.GROW_BASE_URL?.includes('sandbox');
console.log('🧪 Sandbox mode:', isSandbox);
```

### **בפורטל Grow:**

- בפינה הימנית העליונה תראה: **"🧪 Sandbox"**
- צבע אדום/כתום
- כל העסקאות מסומנות "TEST"

---

## 💳 כרטיסי טסט - קיצורים

### **מצליח:**
```
4580 4580 4580 4580
12/25
123
```

### **נכשל:**
```
4580 0000 0000 0000
12/25
123
```

**רשימה מלאה:** `/test-payments` או `GROW-TEST-CARDS.md`

---

## 🚀 מעבר לפרודקשן

### **כשמוכן לעלות לאוויר:**

1. **קבל API Keys לפרודקשן:**
   ```
   פורטל Grow → הגדרות → API
   → Production Mode
   → העתק Keys
   ```

2. **עדכן `.env.local`:**
   ```env
   # Production
   GROW_API_KEY=live_xxxxxxxxxxxxx
   GROW_USER_ID=live_12345
   GROW_PAGE_CODE=XYZ789
   GROW_BASE_URL=https://secure.meshulam.co.il  # ← Production!
   ```

3. **ודא HTTPS:**
   ```env
   NEXT_PUBLIC_BASE_URL=https://yourdomain.com
   ```

4. **בנה ופרוס:**
   ```bash
   npm run build
   # או deploy לVercel/Netlify
   ```

---

## ⚠️ אזהרות חשובות

### **🚫 אל תעשה:**
- אל תשתמש בכרטיסי אשראי אמיתיים בסנדבוקס
- אל תשתמש בכרטיסי טסט בפרודקשן
- אל תשתף את ה-API Keys בפומבי

### **✅ כן תעשה:**
- השתמש רק בכרטיסי טסט בסנדבוקס
- שמור את ה-.env.local ב-.gitignore
- בדוק את כל התרחישים לפני פרודקשן

---

## 🆘 תקלות נפוצות

### **"API Key not found"**
```
פתרון:
1. וודא שה-.env.local קיים
2. הפעל מחדש את השרת
3. בדוק שהשם נכון: GROW_API_KEY (לא GROW_KEY)
```

### **"Invalid card number"**
```
פתרון:
1. וודא שאתה ב-Sandbox mode
2. השתמש בכרטיסים מהרשימה
3. הסר רווחים מהמספר
```

### **"Webhook not working"**
```
פתרון:
1. בדוק שהשרת רץ
2. בדוק את הURL ב-Grow
3. בדוק את הלוגים בטרמינל
```

---

## 📞 תמיכה

**Grow Support:**
- 📧 support@grow.business
- 📱 03-9999999
- 🌐 https://support.grow.business

**תיעוד:**
- 📚 https://docs.meshulam.co.il/

---

## 🎉 סיימת! זמן לטסטים!

```bash
# צעדים:
1. npm run dev
2. לך ל: http://localhost:3001/test-payments
3. העתק כרטיס טסט
4. צור חשבונית/מנוי
5. שלם עם הכרטיס
6. בדוק שהכל עובד

✅ מוכן!
```

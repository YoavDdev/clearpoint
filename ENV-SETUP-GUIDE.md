# 🔐 הגדרת משתני סביבה למערכת התשלומים

## קובץ `.env.local` - הוסף את המשתנים הבאים:

```bash
# =====================================================
# Grow (Meshulam) Payment Configuration
# =====================================================

# Grow API Settings
GROW_API_URL=https://secure.meshulam.co.il
GROW_PAGE_CODE=your_page_code_here
GROW_API_KEY=your_api_key_here
GROW_USER_ID=your_user_id_here

# =====================================================
# Application URLs
# =====================================================

# Base URL (for webhooks and redirects)
NEXT_PUBLIC_BASE_URL=http://localhost:3000  # פיתוח
# NEXT_PUBLIC_BASE_URL=https://clearpoint.co.il  # פרודקשן

# =====================================================
# Supabase Configuration
# =====================================================

# Supabase Service Role Key (for webhooks and admin operations)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Public keys (אלו כבר אמורים להיות קיימים)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here

# =====================================================
# Green Invoice Configuration (אופציונלי - לחשבוניות)
# =====================================================

GREEN_INVOICE_API_KEY=your_green_invoice_key_here
GREEN_INVOICE_SECRET=your_green_invoice_secret_here

```

---

## 📋 איך לקבל את הפרטים של Grow?

### שלב 1: הרשמה ל-Grow
1. גש ל: https://grow.business/join-us/
2. מלא פרטים ורשום את העסק
3. אשר את המייל

### שלב 2: התחברות לפאנל
1. גש ל: https://secure.meshulam.co.il/login
2. התחבר עם הפרטים שקיבלת

### שלב 3: קבלת ה-API Keys
1. **PAGE_CODE** - קוד עמוד:
   - לחץ על "הגדרות" → "עמודי תשלום"
   - תראה את קוד העמוד (Page Code)
   - העתק אותו

2. **API_KEY** - מפתח API:
   - לחץ על "הגדרות" → "API"
   - תראה את מפתח ה-API
   - העתק אותו

3. **USER_ID** - מזהה משתמש:
   - לחץ על "הגדרות" → "פרטי חשבון"
   - תראה את ה-User ID
   - העתק אותו

---

## 🔑 Supabase Service Role Key

1. גש ל-Supabase Dashboard
2. לחץ על Settings → API
3. גלול ל-"Service Role Key" (⚠️ **סודי מאוד!**)
4. העתק את המפתח

**⚠️ אזהרה:** מפתח זה נותן גישה מלאה למסד הנתונים!
אל תשתף אותו ואל תעלה אותו ל-Git!

---

## 📝 דוגמה מלאה (ערכים מזויפים):

```bash
# Grow
GROW_API_URL=https://secure.meshulam.co.il
GROW_PAGE_CODE=ABC123
GROW_API_KEY=sk_live_1234567890abcdef
GROW_USER_ID=user_9876543210

# App URLs
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Supabase
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## ✅ בדיקה שהכל עובד

לאחר הוספת המשתנים, הרץ:

```bash
npm run dev
```

ובדוק שאין שגיאות ב-console.

---

## 🔐 אבטחה חשובה!

1. ✅ ודא ש-`.env.local` נמצא ב-`.gitignore`
2. ✅ אל תשתף את המפתחות בשום מקום
3. ✅ בפרודקשן - שנה את `NEXT_PUBLIC_BASE_URL` ל-URL האמיתי
4. ✅ בפרודקשן - השתמש ב-Environment Variables של Vercel/Netlify

---

## 📚 קישורים שימושיים:

- **Grow Dashboard**: https://secure.meshulam.co.il
- **Grow Documentation**: https://docs.meshulam.co.il/
- **Green Invoice**: https://www.greeninvoice.co.il/
- **Supabase Dashboard**: https://app.supabase.com

---

## 🎯 השלב הבא:

לאחר הגדרת משתני הסביבה, נמשיך ל:
1. עדכון דף Subscribe עם כפתורי תשלום
2. יצירת דף היסטוריית תשלומים
3. יצירת דף ניהול מנוי


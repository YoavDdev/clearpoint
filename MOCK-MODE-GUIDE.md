# 🧪 מדריך Mock Mode - פיתוח ללא API של Grow

## 🎯 מה זה Mock Mode?

**Mock Mode** מאפשר לך לפתח ולבדוק את כל מערכת התשלומים **בלי צורך ב-API keys של Grow!**

המערכת תשתמש ב-API מזויף (סימולציה) שמדמה את התנהגות Grow.

---

## ✅ יתרונות:

- 🚀 **התחל לפתח מיד** - אין צורך לחכות ל-API keys
- 🧪 **בדיקות מהירות** - כל תהליך לוקח שניות
- 🎨 **פיתוח UI מלא** - תוכל לבנות את כל הממשק
- 🔄 **סימולציה של תשלומים** - מצליחים ונכשלים
- 💾 **הכל נשמר ב-DB** - כמו במציאות
- 🔌 **מעבר קל לפרודקשן** - פשוט תשנה משתנה אחד!

---

## 🔧 הפעלת Mock Mode

### שלב 1: הוסף ל-`.env.local`:

\`\`\`bash
# 🧪 Mock Mode for Development
GROW_USE_MOCK=true

# Base URL (נדרש!)
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Supabase (כרגיל)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# ⚠️ אלו לא נדרשים ב-Mock Mode!
# GROW_PAGE_CODE=...
# GROW_API_KEY=...
# GROW_USER_ID=...
\`\`\`

### שלב 2: הרץ את השרת

\`\`\`bash
npm run dev
\`\`\`

**זהו! Mock Mode פעיל! 🎉**

---

## 🎮 איך זה עובד?

### תהליך רגיל (עם Grow אמיתי):
\`\`\`
משתמש לוחץ "תשלום"
     ↓
API שלנו → Grow API
     ↓
Grow מחזיר URL תשלום
     ↓
לקוח מועבר לדף Grow
     ↓
משלם בדף של Grow
     ↓
Grow שולח webhook
     ↓
מערכת מעדכנת DB
\`\`\`

### תהליך ב-Mock Mode:
\`\`\`
משתמש לוחץ "תשלום"
     ↓
API שלנו → Mock API (שלנו!)
     ↓
Mock מחזיר URL מזויף
     ↓
לקוח מועבר לדף סימולציה שלנו
     ↓
בוחר "תשלום מצליח" או "נכשל"
     ↓
סימולציה של webhook
     ↓
מערכת מעדכנת DB
\`\`\`

**התוצאה זהה! הכל נשמר ב-DB כאילו זה אמיתי!**

---

## 🧪 בדיקת Mock Mode

### 1. גש לדף הבדיקה:
\`\`\`
http://localhost:3000/test-payment
\`\`\`

### 2. לחץ על "בדיקת תשלום חד-פעמי"

### 3. תועבר לדף Mock Payment:
\`\`\`
http://localhost:3000/mock-payment-page?amount=500&customer=...
\`\`\`

### 4. בחר:
- ✅ **תשלום מצליח** - יעדכן את ה-DB כ-completed
- ❌ **תשלום נכשל** - יעדכן את ה-DB כ-failed

### 5. תועבר חזרה לדשבורד

### 6. בדוק ב-Supabase:
- טבלת `payments` - התשלום נשמר!
- עם הסטטוס הנכון
- עם כל הפרטים

---

## 🔄 מעבר לפרודקשן (Grow אמיתי)

### כשתקבל API Keys אמיתיים:

#### 1. עדכן `.env.local`:
\`\`\`bash
# 🚫 כבה את Mock Mode
GROW_USE_MOCK=false

# ✅ הוסף API Keys אמיתיים
GROW_API_URL=https://secure.meshulam.co.il
GROW_PAGE_CODE=your_real_page_code
GROW_API_KEY=your_real_api_key
GROW_USER_ID=your_real_user_id

# שאר המשתנים נשארים
NEXT_PUBLIC_BASE_URL=http://localhost:3000
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
\`\`\`

#### 2. הפעל מחדש:
\`\`\`bash
npm run dev
\`\`\`

**זהו! עכשיו זה עובד עם Grow אמיתי! 🚀**

---

## 📊 השוואה

| תכונה | Mock Mode | Production (Grow) |
|-------|-----------|-------------------|
| צריך API Keys | ❌ לא | ✅ כן |
| זמן תגובה | ⚡ מיידי | 🌐 תלוי ברשת |
| תשלום אמיתי | ❌ לא | ✅ כן |
| בדיקות | ✅ מהיר | ⏱️ איטי |
| שמירה ב-DB | ✅ כן | ✅ כן |
| Webhooks | ✅ סימולציה | ✅ אמיתי |
| עלות | 💰 חינם | 💰 עמלות |

---

## 🎯 מה אפשר לבנות ב-Mock Mode?

### ✅ כל מה שקשור ל-UI:
- דף הרשמה/בקשה
- דף היסטוריית תשלומים
- דף ניהול מנוי
- דשבורד אדמין
- כפתורי תשלום
- טפסים
- הודעות

### ✅ כל מה שקשור ל-Logic:
- זרימת תשלום
- עדכון DB
- Webhook handling
- RLS policies
- Views
- סטטוסים

### ❌ מה לא אפשר לבדוק:
- תשלום אמיתי בכרטיס אשראי
- אינטגרציה עם בנק
- קבלות מס אמיתיות
- חשבוניות מס

**אבל - זה בדיוק מה שצריך לפיתוח! 🎨**

---

## 🐛 פתרון בעיות

### Mock Mode לא עובד?

#### בדוק ש:
1. ✅ `GROW_USE_MOCK=true` ב-`.env.local`
2. ✅ `NEXT_PUBLIC_BASE_URL` מוגדר
3. ✅ הרצת `npm run dev` אחרי שינוי ה-`.env`
4. ✅ אין שגיאות ב-console

### Mock Payment Page לא נפתח?

\`\`\`bash
# ודא שהקובץ קיים:
ls src/app/mock-payment-page/page.tsx

# ודא שה-API endpoint קיים:
ls src/app/api/mock-grow/create-payment/route.ts
\`\`\`

### DB לא מתעדכן?

- בדוק ש-Supabase Service Role Key תקין
- ודא ש-RLS policies הוגדרו
- בדוק logs ב-console

---

## 🎉 סיכום

### Mock Mode זה:
- ✅ **מושלם לפיתוח**
- ✅ **מהיר ונוח**
- ✅ **ללא תלות ב-Grow**
- ✅ **מעבר קל לפרודקשן**

### השתמש ב-Mock Mode ל:
- 🎨 בניית UI
- 🧪 בדיקות
- 🔧 Debug
- 📚 למידה

### עבור ל-Production כש:
- ✅ קיבלת API Keys
- ✅ ה-UI מוכן
- ✅ בדקת הכל
- ✅ מוכן ללקוחות אמיתיים

---

**עכשיו אפשר לפתח הכל ללא המתנה! 🚀**

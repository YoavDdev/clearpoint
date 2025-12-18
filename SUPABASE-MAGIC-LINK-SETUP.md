# 🔐 Supabase Magic Link Configuration

## הבעיה:
Magic links מ-Supabase לא עובדים כי הם לא מכוונים דרך callback route.

---

## ✅ הפתרון:

### 1️⃣ הגדרת URL Configuration

לך ל-**Supabase Dashboard → Authentication → URL Configuration**

**הגדר:**
```
Site URL:
http://localhost:3000

Redirect URLs (הוסף):
http://localhost:3000/auth/callback
http://localhost:3000/setup-password
http://localhost:3000/dashboard
```

---

### 2️⃣ הגדרת Magic Link Email Template

לך ל-**Supabase Dashboard → Authentication → Email Templates → Magic Link**

**שנה את התבנית:**

```html
<h2>Magic Link</h2>

<p>Click the link below to log in:</p>
<p><a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=magiclink&next=/setup-password">Log In</a></p>
```

**או בעברית:**
```html
<h2>קישור התחברות</h2>

<p>לחץ על הקישור כדי להיכנס למערכת:</p>
<p><a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=magiclink&next=/setup-password">התחבר למערכת</a></p>
```

---

### 3️⃣ הגדרת Recovery (Password Reset) Template

לך ל-**Email Templates → Reset Password**

```html
<h2>איפוס סיסמה</h2>

<p>לחץ על הקישור כדי לאפס את הסיסמה:</p>
<p><a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=recovery&next=/setup-password">אפס סיסמה</a></p>
```

---

### 4️⃣ הגדרת Invite (New User) Template

לך ל-**Email Templates → Invite User**

```html
<h2>הזמנה למערכת Clearpoint</h2>

<p>הוזמנת ליצור חשבון במערכת. לחץ על הקישור להגדרת סיסמה:</p>
<p><a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=invite&next=/setup-password">הגדר סיסמה</a></p>
```

---

## 🔄 איך זה עובד:

1. **משתמש לוחץ על קישור באימייל** →
2. **מגיע ל-`/auth/callback?token_hash=...&type=magiclink`** →
3. **Callback route מאמת את הטוקן** →
4. **יוצר session ב-Supabase** →
5. **מפנה ל-`/setup-password`** (או `/dashboard` אם סיסמה כבר קיימת) →
6. **משתמש מחובר!** ✅

---

## 🧪 בדיקה:

1. שמור את כל השינויים ב-Supabase Dashboard
2. שלח Magic Link חדש מהדשבורד
3. לחץ על הקישור באימייל
4. אמור להגיע ל-`/setup-password` עם session פעילה ✅

---

## ⚠️ חשוב:

- הקישורים הישנים לא יעבדו - צריך לשלוח חדשים
- ה-`{{ .TokenHash }}` חייב להיות בדיוק ככה (case sensitive)
- ה-`next` parameter קובע לאן להפנות אחרי האימות

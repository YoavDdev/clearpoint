# 🐛 Debug Guide - Subscription Manager

## בעיה: לא רואים תוכניות במודל הפעלת מנוי

### צעדים לאבחון:

#### 1. בדיקת טבלת plans ב-Supabase
```
✓ פתח Supabase Dashboard
✓ לך ל-SQL Editor
✓ הרץ: check-plans-table.sql
```

**מה לחפש:**
- האם יש תוכניות? (COUNT > 0)
- האם יש שדה `name_he`?
- האם יש שדה `plan_name`?

**אם אין תוכניות:**
```
✓ הרץ: create-default-plans.sql
```

---

#### 2. בדיקת Console בדפדפן
```
✓ פתח דף הלקוח: http://localhost:3001/admin/customers/[id]
✓ לחץ F12 או Cmd+Option+I (Mac)
✓ לך ל-Tab Console
✓ לחץ "הפעל מנוי חודשי"
```

**מה לחפש:**
- 🔴 האם יש שגיאות אדומות?
- 🔵 האם ה-API `/api/plans` נקרא?
- 📊 האם יש response עם plans?

**דוגמה לשגיאה:**
```
❌ Failed to fetch plans
❌ 404 Not Found
❌ CORS error
```

---

#### 3. בדיקת API ישירה
```
✓ פתח טאב חדש
✓ גש ל: http://localhost:3001/api/plans
```

**מה אתה אמור לראות:**
```json
{
  "success": true,
  "plans": [
    {
      "id": "uuid...",
      "name": "Plan A - SIM Cloud",
      "plan_name": "Plan A",
      "name_he": "חבילת SIM + ענן",
      "monthly_price": 149,
      "retention_days": 7,
      "connection_type": "sim"
    },
    {
      "id": "uuid...",
      "name": "Plan B - Wi-Fi Cloud",
      "plan_name": "Plan B",
      "name_he": "חבילת Wi-Fi + ענן",
      "monthly_price": 99,
      "retention_days": 14,
      "connection_type": "wifi"
    }
  ]
}
```

**אם רואים `"plans": []` (ריק):**
- → הטבלה ריקה, צריך להריץ create-default-plans.sql

**אם רואים שגיאה:**
```json
{
  "success": false,
  "error": "Failed to load plans"
}
```
- → בעיה בגישה ל-Supabase
- → בדוק .env variables

---

#### 4. בדיקת RLS Policies
```sql
-- הרץ ב-Supabase SQL Editor
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'plans';
```

**אם אין policies:**
```sql
-- הוסף policy לקריאה
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to plans"
ON plans FOR SELECT
TO public
USING (true);
```

---

## 📋 Checklist תיקון:

- [ ] יש תוכניות בטבלת plans
- [ ] API /api/plans מחזיר נתונים
- [ ] אין שגיאות ב-Console
- [ ] יש RLS policy לקריאה
- [ ] רענון דפדפן (Ctrl+Shift+R)

---

## 🆘 אם כלום לא עוזר:

**אפשרות 1: הוספת console.log לקומפוננטה**
```typescript
// בשורה 69 ב-SubscriptionManager.tsx
console.log("📦 Plans loaded:", plansData);
```

**אפשרות 2: בדיקת Network Tab**
```
F12 → Network → סנן "plans" → רענן דף
```

**אפשרות 3: אמור לי מה אתה רואה!**

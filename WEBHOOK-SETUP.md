# 🔗 הגדרת Webhook Testing עם ngrok

## מה זה Webhook ולמה צריך ngrok?

**Webhook** = PayPlus שולח אוטומטית עדכון לשרת שלנו כשתשלום מצליח/נכשל.

**הבעיה:** PayPlus לא יכול להגיע ל-`http://localhost:3000`  
**הפתרון:** ngrok יוצר URL ציבורי שמפנה ל-localhost שלנו

---

## שלב 1: התקנת ngrok

### Mac:
```bash
brew install ngrok
```

### או הורד ישירות:
```bash
# הורד מ: https://ngrok.com/download
# חלץ והעתק ל-/usr/local/bin
```

---

## שלב 2: הרצת ngrok

```bash
# בטרמינל חדש, הרץ:
ngrok http 3000
```

**תראה משהו כזה:**
```
Session Status                online
Account                       Free (Login for more features)
Version                       3.x.x
Region                        United States (us)
Latency                       -
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://abc123.ngrok.io -> http://localhost:3000
```

---

## שלב 3: עדכן .env.local

**העתק את ה-URL מ-ngrok (https://abc123.ngrok.io) ועדכן:**

```bash
# .env.local
NEXT_PUBLIC_BASE_URL=https://abc123.ngrok.io  # ← שנה לURL של ngrok
```

**חשוב:** 
- ⚠️ ה-URL משתנה בכל פעם שמפעילים את ngrok מחדש!
- 💡 אפשר לקבל URL קבוע עם חשבון בתשלום של ngrok

---

## שלב 4: אתחל את השרת

```bash
# עצור את השרת הקיים
Ctrl+C

# התחל מחדש
npm run dev
```

---

## שלב 5: צור תשלום טסט

```bash
# פתח בדפדפן:
http://localhost:3000/api/test-payplus

# תקבל לינק תשלום - פתח אותו ושלם
```

---

## שלב 6: בדוק שה-Webhook הגיע

### A. בדוק ב-ngrok Dashboard:
```
http://localhost:4040
```
תראה את כל הבקשות שהגיעו דרך ngrok.

### B. בדוק בקונסול של השרת:
```
🔔 Payplus Webhook received
✅ Webhook signature verified
💳 Payment status: completed
✅ Payment updated successfully
```

### C. בדוק ב-Database:
הסטטוס של התשלום צריך להתעדכן ל-`completed` ו-`paid_at` צריך להיות מלא.

---

## טיפים חשובים:

### 1. שמור את ngrok רץ
```bash
# השאר את הטרמינל עם ngrok פתוח!
# אם תסגור אותו, ה-webhook לא יעבוד
```

### 2. URL חדש בכל הפעלה
```bash
# אם תפעיל ngrok מחדש, תקבל URL חדש
# צריך לעדכן את .env.local ולאתחל שרת
```

### 3. בדיקה מהירה
```bash
# בדוק שה-webhook endpoint נגיש:
curl https://abc123.ngrok.io/api/webhooks/payplus
```

### 4. Production
```bash
# בפרודקשן, תשתמש ב-URL אמיתי:
NEXT_PUBLIC_BASE_URL=https://yourdomain.com
```

---

## Troubleshooting

### ngrok לא מתקין?
```bash
# נסה:
npm install -g ngrok
```

### השרת לא מקבל webhooks?
1. וודא ש-ngrok רץ
2. וודא שעדכנת את NEXT_PUBLIC_BASE_URL
3. אתחל את השרת
4. בדוק ב-http://localhost:4040 שהבקשה הגיעה

### PayPlus שולח 401 Unauthorized?
זה בסדר - אנחנו מאמתים signature. אם הקונסול אומר "Webhook signature verified" - זה עובד!

---

## אלטרנטיבות ל-ngrok:

1. **localtunnel**: `npx localtunnel --port 3000`
2. **Cloudflare Tunnel**: `cloudflared tunnel`
3. **Vercel Preview**: Deploy לסביבת preview

---

## מה הלאה?

אחרי שהגדרת את ngrok:
1. ✅ צור תשלום טסט
2. ✅ שלם עם כרטיס אמיתי (₪1)
3. ✅ ראה את ה-webhook מגיע
4. ✅ בדוק שה-DB מתעדכן
5. ✅ נסה גם תשלום שנכשל
6. ✅ בדוק שהמנוי החודשי נוצר

זהו! מערכת התשלומים שלך תעבוד בצורה מושלמת! 🎉

# Clearpoint Installer V2 — Design (Ubuntu 22.04 + Cloudflared + GUI)

## מטרת המסמך
מסמך זה מגדיר תכנון (Design Spec) עבור תהליך התקנה מודרני, פשוט, ו"מקצועי" למחשב הלקוח (Mini PC) עבור Clearpoint.

- **מטרה עסקית**: לאפשר התקנה בשטח ע"י טכנאי/מתקין חיצוני בצורה מהירה וברורה.
- **מטרה טכנית**: להפוך את ההתקנה ל"מוצר" (Wizard + שירותים) במקום רצף פקודות ידני.
- **הגבלה**: מסמך זה **לא משנה כלום בקוד הקיים**. הוא מפרט את היעד ואת התכנון לגרסה הבאה.

---

## Scope
### In-scope (בגרסת V2)
- Installer גרפי (Wizard) ל-Ubuntu 22.04.
- התקנה של תלותים נדרשים (FFmpeg / Cloudflared / שירותים / תיקיות / RAM disk) בצורה אוטומטית.
- הגדרת שירותים (systemd) כך שהמערכת תעלה לבד אחרי reboot.
- יצירת/ניהול Cloudflared tunnel + DNS בצורה מודרכת (כולל בדיקות).
- יצירת קונפיג מקומי מסודר במקום "קבצים מפוזרים".
- בדיקות בסיום התקנה (health checks) + מסך סיכום.

### Out-of-scope (בשלב זה)
- שינוי/כתיבה מחדש של הלוגיקה הקיימת ב-`scripts/utils/*`.
- ריפקטור מלא ל"Agent" אחד (זה יכול להיות V3).
- שינוי סכימת DB.

---

## הגדרת יעד UX (Installer GUI)
### שפה
- ברירת מחדל: **עברית** (RTL), עם אפשרות לאנגלית בעתיד.

### Flow של ה-Wizard
1. **Welcome**
   - הסבר קצר מה יותקן.
   - דרישת הרשאות sudo.

2. **פרטי לקוח**
   - שם לקוח / מזהה לקוח
   - `tunnel subdomain` (למשל `customername.clearpoint.co.il`)

3. **הגדרות מערכת**
   - האם להגדיר Auto-login (אופציונלי)
   - אימות שיש Ubuntu 22.04

4. **קבצי מצלמות (מוכנים מראש)**
   - ה-Installer לא מייצר קבצי מצלמה.
   - הקבצים `camera-*.sh` ו/או `camera-*.service` נוצרים מראש מתוך מערכת הניהול (`/admin/cameras`) ומועברים ל-USB.
   - ה-Installer מזהה/מאמת שנמצאו קבצי מצלמות ב-USB לפני המשך.

5. **חיבור ל-Cloudflare Tunnel**
   - Login (cloudflared tunnel login)
   - Create tunnel
   - יצירת config
   - התקנת cloudflared כ-service

6. **Install / Apply**
   - יצירת תיקיות
   - יצירת RAM disk `/mnt/ram-ts`
   - העתקת קבצי runtime
   - העתקת קבצי מצלמות מה-USB
   - יצירת systemd services
   - הגדרת CRON (אם נשארים עם cron ב-V2)

7. **Verification**
   - Live server עולה על `localhost:8080`
   - קבצי `stream.m3u8` נוצרים לכל מצלמה
   - cloudflared service פעיל
   - בדיקת URL חיצוני
   - uploader “dry run” (ללא העלאה/או עם TEST_MODE)

8. **Finish**
   - סיכום: URL, סטטוסים, איפה הלוגים
   - כפתור: “העתק כתובת”

---

## רכיבים (Components)
### 1) Runtime (בשטח)
ב-V2 ניתן להישאר עם המנגנון הקיים, אבל לארוז אותו בצורה מסודרת:

- `scripts/utils/live-server.js`
- `scripts/utils/uploadVods.ts`
- `scripts/utils/status-check.sh`
- `scripts/utils/disk-check.sh`
- `camera-*.sh`
- `camera-*.service` (אופציונלי)

> ההתקנה תשכפל/תמקם אותם במיקום אחיד ומוגדר, ותיצור שירותים/cron סביבם.

### 2) Installer GUI
אפליקציה שמריצה פעולות מערכת עם sudo, מנהלת state של ההתקנה, ומדווחת Progress.

אפשרויות טכנולוגיות (לבחירה בהמשך):
- **Electron** (GUI קל ומהיר לפיתוח; דורש bundling)
- **Tauri** (קל יותר, אבל מורכב יותר סביב Rust)
- **Python + GTK** (נפוץ בלינוקס; פחות "וובי")

המסמך לא מקבע טכנולוגיה—רק UX והתנהגות.

---

## מבנה קבצים מומלץ על המחשב
להחליף “פיזור” בסטנדרט:

- `/opt/clearpoint/`
  - `bin/`
  - `scripts/` (קבצים שלך)
  - `logs/`
- `/etc/clearpoint/config.yml`
- `/var/lib/clearpoint/` (state מקומי אם צריך)
- `/mnt/ram-ts` (tmpfs)

---

## קונפיג (Config) — `config.yml`
דוגמה (תכנון):

- `customer`:
  - `name`
  - `tunnel_subdomain`
- `cameras`:
  - `id` (camera uuid)
  - `name`
  - `rtsp_url`
  - `username`/`password` (אם נדרש)
- `paths`:
  - recordings_root
  - ram_ts_root
- `cloudflared`:
  - tunnel_name
  - credentials_path

ב-V2 ה-Installer לא מייצר `camera-*.sh` מתוך ה-config. קבצי המצלמות מסופקים מראש מה-Admin ומועתקים ל-USB.

---

## systemd services (תכנון)
מטרה: לא להיות תלויים ב"הרצה ידנית".

שירותים מוצעים:
- `clearpoint-cameras.target` (אופציונלי) לתיאום
- `clearpoint-live-server.service` (מריץ `node live-server.js`)
- `clearpoint-status-check.service` + `timer` (במקום cron) או להישאר עם cron ב-V2
- `clearpoint-uploader.service` + `timer` (במקום cron) או cron
- `cloudflared.service` (כפי שמסמך ההתקנה כבר מציע)

> ב-V2 אפשר להשאיר cron, אבל מומלץ לעבור ל-`systemd timers` בהמשך כדי לקבל ניטור/logging טובים.

---

## Cloudflared + DNS
### מה installer עושה
- `cloudflared tunnel login`
- יצירת tunnel בשם הלקוח
- כתיבת `/etc/cloudflared/config.yml`
- `cloudflared service install`

### DNS
ה-DNS record ב-Cloudflare דורש הרשאות API או פעולה ידנית.

אפשרויות:
- **V2 (פשוט):** המסך מציג למתקין מה להוסיף ב-DNS (Name/Target), עם copy buttons.
- **V3 (אוטומטי):** שימוש ב-Cloudflare API token כדי ליצור CNAME אוטומטית.

---

## אבטחה (Security) — החלטות מוצר
### מצב היום (Known)
חלק מהסקריפטים משתמשים במפתחות חזקים (למשל service role) או token קשיח.

### יעד V2 מינימלי (בלי שינוי קוד)
- ה-Installer צריך להבהיר במסך “Credentials” איפה נשמרים מפתחות ולמי יש גישה.
- לשמור הרשאות קבצים מחמירות (`chmod 600`) על קבצי config/credentials.

### יעד V3 מומלץ (שינוי ארכיטקטורה)
- להוציא לחלוטין service role מהמחשב של הלקוח.
- לעבור ל-device token מוגבל שמונפק מהשרת.

---

## בדיקות בסוף התקנה (Acceptance Tests)
- `systemctl is-active cloudflared`
- `curl -I http://localhost:8080/` (או בדיקת file listing)
- לכל מצלמה:
  - קיים `stream.m3u8`
  - ה-m3u8 מתעדכן (age < 60s)
- בדיקת גישה חיצונית:
  - `https://<subdomain>.clearpoint.co.il/.../stream.m3u8`
- לוגים:
  - `journalctl -u <service> -n 50` או לוג פיזי ב-`/opt/clearpoint/logs`

---

## מה צריך להכין לפני שמתחילים לממש (Prerequisites)
- החלטה על טכנולוגיית GUI (Electron/Tauri/GTK).
- החלטה על Packaging:
  - `.deb` או self-extracting installer.
- הגדרה סופית של schema ל-`config.yml`.

---

## Roadmap מוצע
### V2 (Installer בלבד, ללא שינוי קוד)
- Wizard GUI
- יצירת קונפיג
- העתקת קבצים קיימים למיקום סטנדרטי
- יצירת services/cron
- בדיקות סיום

### V3 (שדרוג מוצר)
- Edge agent אחד במקום 4 רכיבים
- systemd timers במקום cron
- security token מוגבל
- DNS אוטומטי (Cloudflare API)

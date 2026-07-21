# 📋 Clearpoint Security — מדריך התקנה מלא E2E

> **מסמך זה מכסה את כל תהליך ההתקנה מ-A עד Z.**
> מיועד למתקין (אתה או טכנאי אחרי הדרכה).
> עדכון אחרון: יולי 2026

---

## 🏠 הכנה בבית vs. עבודה בשטח

### בבית (ערב לפני / שעה לפני):
| # | פעולה | זמן |
|---|--------|------|
| 1 | התקנת Ubuntu על ה-Mini PC | 10 דק' |
| 2 | חיבור WiFi ביתי | 1 דק' |
| 3 | הרצת הסקריפט (עם IPs קבועים: 101-104) | 10 דק' |
| 4 | יצירת לקוח + מצלמות באדמין | 5 דק' |
| 5 | ודא RustDesk עובד + שמור ID | 1 דק' |
| 6 | כבה הכל, ארוז | — |

### בשטח (אצל הלקוח):
| # | פעולה | זמן |
|---|--------|------|
| 1 | מתקין מצלמות פיזית + כבלי רשת | 20-30 דק' |
| 2 | סריקת רשת + מציאת מצלמות | 1 דק' |
| 3 | מגדיר IPs קבועים למצלמות (101-104) | 5 דק' |
| 4 | מחבר: Mini PC + SIM Router + חשמל | 2 דק' |
| 5 | BIOS: Power On after AC loss (פעם אחת) | 2 דק' |
| 6 | ממתין 2 דקות → בודק מהטלפון | 2 דק' |
| | **סה"כ בשטח:** | **~35 דק'** |

### 💡 סטנדרט IPs (תמיד אותו דבר):
```
Mini PC:     DHCP (or 192.168.1.50)
SIM Router:  192.168.1.1 (gateway)
מצלמה 1:    192.168.1.101
מצלמה 2:    192.168.1.102
מצלמה 3:    192.168.1.103
מצלמה 4:    192.168.1.104
```

> ✅ כשמשתמשים באותם IPs תמיד — הסקריפטים שנוצרו בבית עובדים בשטח בלי שינוי!

### 🔍 סריקת רשת — מציאת מצלמות

מצלמות מקבלות IP אוטומטי (DHCP) כשמתחברות לראוטר. ה-IP **לא בהכרח** מה שכתוב בדף המפרט.

**שלב 1: סריקת הרשת** (מה-Mini PC):
```bash
sudo nmap -sn 192.168.1.0/24
```

תקבל רשימה של כל המכשירים ברשת, למשל:
```
192.168.1.1    — Router
192.168.1.96   — Unknown (זו המצלמה!)
192.168.1.244  — Mini PC
```

**שלב 2: גישה להגדרות המצלמה:**
```
http://192.168.1.96   (ה-IP שמצאת בסריקה)
```
- User: `admin` | Password: ריק או `admin`

**שלב 3: קיבוע IP קבוע (חובה!):**
1. בממשק המצלמה → **Network** / **TCP/IP**
2. שנה מ-**DHCP** ל-**Static**
3. הגדר:
   - IP: `192.168.1.101` (מצלמה 1), `192.168.1.102` (מצלמה 2) וכו'
   - Subnet: `255.255.255.0`
   - Gateway: `192.168.1.1`
   - DNS: `8.8.8.8`
4. **Save** → המצלמה תתנתק ותחזור ב-IP החדש

> ⚠️ **חשוב**: תמיד קבע IP קבוע במצלמה עצמה (לא דרך DHCP Reservation בראוטר) — ככה גם אם מחליפים ראוטר, המצלמה שומרת את ה-IP שלה.

> 💡 **טיפ**: אם יש כמה מצלמות — חבר אותן אחת אחת, סרוק, קבע IP, ואז חבר את הבאה. ככה לא מתבלבלים.

---

## 📦 מה צריך להביא להתקנה

### ציוד:
- [ ] Mini PC (Intel N150 / N100 / דומה עם Intel iGPU)
- [ ] כבל חשמל למיני PC
- [ ] USB Flash Drive (8GB+) עם Ubuntu Server
- [ ] מקלדת USB (רק להתקנה, אח"כ מוציאים)
- [ ] כבל HDMI + מסך (רק להתקנה, אח"כ מוציאים)
- [ ] כבל רשת (אם יש router קווי)
- [ ] SIM Router (אם אין WiFi/קו)
- [ ] מדבקה עם שם הלקוח (להדביק על ה-Mini PC)

### מידע שצריך לפני ההתקנה:
- [ ] שם הלקוח (כמו שמופיע במערכת)
- [ ] כתובות IP של המצלמות (בד"כ 192.168.1.101-104)
- [ ] שם משתמש + סיסמה של המצלמות (בד"כ admin/admin או admin/123456)
- [ ] RTSP path של המצלמות (בד"כ `/h264/ch1/main/av_stream` או `/stream`)
- [ ] Cloudflare Tunnel token (מ-Cloudflare Zero Trust dashboard)
- [ ] Device Token (מ-Admin Panel)

---

## 🔧 שלב 0: הכנה לפני יציאה לשטח (במשרד)

### 0.1 — הכנת USB Boot

> עושים **פעם אחת** — אותו USB משמש לכל ההתקנות.

1. הורד Ubuntu Server 24.04 LTS:
   ```
   https://ubuntu.com/download/server
   ```
2. כתוב ל-USB עם Rufus (Windows) או Etcher (Mac):
   ```
   Etcher → Select Image → Select USB → Flash!
   ```

### 0.2 — הוספת לקוח במערכת

1. כנס ל-**Admin Panel** → **לקוחות** → **הוסף לקוח חדש**
2. מלא: שם, טלפון, אימייל, תוכנית, כתובת
3. שמור ותעתיק את ה-`user_id`

### 0.3 — הוספת מצלמות במערכת

1. כנס ל-**Admin Panel** → **מצלמות** → **הוסף מצלמה חדשה**
2. לכל מצלמה:
   - **שם:** כניסה / חצר / חניה / מרפסת וכו'
   - **RTSP URL:** `rtsp://admin:123456@192.168.1.101:554/h264/ch1/main/av_stream`
   - **לקוח:** בחר את הלקוח
3. חזור על זה לכל מצלמה (בד"כ 4)
4. **הורד את סקריפטי המצלמות** (כפתור הירוק ליד כל מצלמה)

### 0.4 — הכנת Cloudflare Tunnel (חובה — בשביל צפייה בלייב מרחוק)

> ⚠️ **בלי Tunnel — הלקוח לא יוכל לראות מצלמות מהטלפון מחוץ לרשת המקומית!**

**שלב 1: יצירת Tunnel:**
1. כנס ל-[Cloudflare Zero Trust](https://one.dash.cloudflare.com/)
2. **Networks** → **Tunnels** → **Create a tunnel**
3. **Tunnel name**: `[שם-הלקוח]-[מיקום]` (למשל: `yehud-cemetery`)

**שלב 2: הגדרת סביבה:**
1. **Operating System**: בחר **Debian** (⚠️ לא Windows!)
2. **Architecture**: `64-bit`

**שלב 3: העתקת Token:**
1. בעמוד "Install and Run" תראה פקודה כמו:
   ```
   cloudflared service install eyJhIjoi...
   ```
2. **ה-Token הוא הטקסט שמתחיל ב-`eyJ`** — לחץ על כפתור ההעתקה 📋
3. שמור את ה-Token — תצטרך אותו בזמן ההתקנה!

**שלב 4: הגדרת Public Hostname:**
1. לחץ **Next** (למטה)
2. מלא:
   - **Subdomain**: `[שם-הלקוח]-[מיקום]` (למשל: `yehud-cemetery`)
   - **Domain**: `clearpoint.co.il`
   - **Service Type**: `HTTP`
   - **URL**: `localhost:8080`
3. לחץ **Save tunnel**

> 💡 **כתוב לעצמך** את ה-Token ואת ה-subdomain. ה-Token ארוך מאוד — שמור אותו בקובץ!
>
> דוגמה למבנה Token:
> ```
> eyJhIjoiZmY5ZD...NldWbSJ9
> ```

**תוצאה:** אחרי ההתקנה, הלייב יהיה זמין ב:
```
https://[subdomain].clearpoint.co.il
```
(למשל: `https://yehud-cemetery.clearpoint.co.il`)

### 0.5 — יצירת Device Token

> Device Token נוצר **אוטומטית** כשלוחצים "ייצא קובץ התקנה" ב-Admin Panel.
> אם מריצים ב-manual mode — העתק את ה-Device Token מתוך קובץ ה-config שייצאת.

---

## 🖥️ שלב 1: התקנת Ubuntu (10 דקות)

### 1.1 — BIOS Setup

> **חשוב!** צריך להגדיר פעם אחת.

1. הפעל את ה-Mini PC ולחץ **Del** או **F2** כדי להיכנס ל-BIOS
2. הגדר:
   - **Boot Order:** USB First
   - **Restore AC Power Loss:** `Power On` ← **קריטי!** (הדלקה אוטומטית אחרי הפסקת חשמל)
   - **Wake on LAN:** Enable (אופציונלי)
3. שמור וצא (Save & Exit)

### 1.2 — התקנת Ubuntu

1. הכנס USB ואתחל
2. בחר **Install Ubuntu Server**
3. הגדרות:
   - Language: **English**
   - Keyboard: **Hebrew** (או English, לא משנה)
   - Network: **חבר Ethernet** (אם יש) או **WiFi** (בחר רשת)
   - Storage: **Use entire disk** (מוחק Windows — זה בסדר!)
   - Profile:
     - Name: `clearpoint`
     - Server name: `clearpoint`
     - Username: `clearpoint`
     - Password: `[סיסמה חזקה — תרשום!]` ← **שמור את הסיסמה!**
   - SSH: **Install OpenSSH Server** ✅
   - Snaps: **לא צריך כלום**
4. חכה שההתקנה תסתיים → **Reboot** → הוצא USB

### 1.3 — כניסה ראשונה + RustDesk

**שלב 0: חיבור לאינטרנט:**
```bash
sudo nmcli device connect enp3s0
```

**אם SIM Router:** חבר את ה-SIM Router לחשמל, חבר כבל Ethernet מהנתב ל-Mini PC (פורט **LAN**, לא WAN!).

**אם WiFi:**
```bash
sudo nmcli dev wifi connect "NETWORK_NAME" password "WIFI_PASSWORD"
```

**ודא שיש אינטרנט:**
```bash
ping -c 3 8.8.8.8
```

**שלב 1: הורדת הקוד:**
```bash
sudo apt install git -y && git clone https://github.com/YoavDdev/clearpoint.git ~/clearpoint-setup
```

**שלב 2: התקנת RustDesk + חיבור לשרת:**
```bash
wget https://github.com/rustdesk/rustdesk/releases/download/1.3.9/rustdesk-1.3.9-x86_64.deb && sudo apt install -y ./rustdesk-1.3.9-x86_64.deb

rustdesk --config set-id-server 172.236.221.235
rustdesk --config set-relay-server 172.236.221.235
rustdesk --config set-key "0MXeVGCuc2qZAmGYKqjXav7NN+MAQLNFdf2XAMgSVMk="

rustdesk &
```

> 📝 **פרטי שרת RustDesk (פרטי):**
> - **ID Server / Relay**: `172.236.221.235`
> - **Public Key**: `0MXeVGCuc2qZAmGYKqjXav7NN+MAQLNFdf2XAMgSVMk=`

**שלב 3:** רשום את ה-RustDesk ID ← התחבר מרחוק מה-Mac ← המשך עבודה מרחוק!

> 💡 **מכאן אפשר להמשיך הכל דרך RustDesk** — כולל סריקת מצלמות, העברת config, והרצת ה-installer.

---

## ⚡ שלב 2: התקנת Clearpoint (5-10 דקות)

### 2.1 — הרץ את סקריפט ההתקנה

```bash
# One-liner (מוריד ומריץ):
curl -sL https://raw.githubusercontent.com/YoavDdev/clearpoint/main/installer/quick-install.sh | bash
```

**או ידנית:**
```bash
sudo apt update && sudo apt install -y git curl
git clone https://github.com/YoavDdev/clearpoint.git ~/clearpoint-setup
cd ~/clearpoint-setup/installer
bash clearpoint-linux-installer.sh
```

### 2.2 — מה הסקריפט שואל:

```
👤 User ID (from admin):          ← מהאדמין פאנל
🔑 Device Token:                   ← מהאדמין פאנל
🌐 Cloudflare Tunnel Token:        ← מ-Cloudflare Zero Trust

📹 Camera 1: entrance,192.168.1.101,admin,123456,/h264/ch1/main/av_stream
📹 Camera 2: yard,192.168.1.102,admin,123456,/h264/ch1/main/av_stream
📹 Camera 3: balcony,192.168.1.103,admin,123456,/h264/ch1/main/av_stream
📹 Camera 4: parking,192.168.1.104,admin,123456,/h264/ch1/main/av_stream
📹 Camera 5: done
```

### 2.3 — מה הסקריפט עושה (אוטומטי):

```
✅ מתקין: ffmpeg, nodejs, tsx, python3, intel-media-va-driver, vainfo
✅ מאמת: VAAPI GPU encoding
✅ יוצר: directory structure (recordings/{user_id}/footage/{camera_id}/)
✅ מעתיק: uploadVods.ts, live-server.js, detect.py, status-check.sh
✅ יוצר: .env (DEVICE_TOKEN, API_BASE)
✅ יוצר: camera scripts + systemd services (Restart=always, RuntimeMaxSec=86400)
✅ יוצר: Express live server service
✅ מגדיר: Cloudflare tunnel (with token)
✅ מגדיר: AI detection (YOLOv8 + OpenVINO)
✅ מגדיר: cron (upload */20, health */5, maintenance 3:30AM)
✅ מתקין: RustDesk
✅ מפעיל: all services
✅ מאמת: recordings, HLS, VAAPI
```

### 2.4 — בסוף ההתקנה תראה:

```
════════════════════════════════════════════
  ✅ Clearpoint Security — Ready!
════════════════════════════════════════════

  User ID:      14a644fe-3bbe-...
  Cameras:      4
  Services:     cameras + AI + live + tunnel
  VAAPI:        enabled (GPU transcoding)
  Auto-restart: after crash + daily (24h)
  Power loss:   auto-start (systemd)

  ⚠️  IMPORTANT — Do these manually:
  1. BIOS: Set 'Restore AC Power Loss' → Power On
  2. RustDesk: Run 'rustdesk' and save the ID
  3. Test phone: Open app → verify live + recordings
```

---

## 🛡️ שלב 3: הגדרות עמידות (2 דקות)

### 3.1 — Systemd Services (auto-restart)

```bash
# ודא שכל ה-services פועלים:
sudo systemctl status clearpoint-ai
sudo systemctl status camera-*
sudo systemctl status cloudflared

# הפעל אם לא:
sudo systemctl enable --now clearpoint-ai
sudo systemctl enable --now cloudflared
```

### 3.2 — CRON Jobs

```bash
# ודא ש-cron מוגדר:
crontab -l

# אמור לראות:
# */20 * * * * ... tsx uploadVods.ts ...
# */5  * * * * ... status-check.sh ...
# @reboot      ... start-clearpoint.sh ...
```

### 3.3 — RustDesk

```bash
# התקן RustDesk (אם לא הותקן):
wget https://github.com/rustdesk/rustdesk/releases/download/1.3.8/rustdesk-1.3.8-x86_64.deb
sudo dpkg -i rustdesk-*.deb
sudo apt install -f -y

# הפעל:
rustdesk &

# רשום את ה-ID! (מספר 9 ספרות)
```

**שמור את RustDesk ID + Password בטבלת הלקוחות!**

---

## ✅ שלב 4: אימות (5 דקות)

### 4.1 — בדיקות מהירות

```bash
# === 1. מצלמות מקליטות? ===
ls -la ~/clearpoint-recordings/*/footage/*/
# צריך לראות קבצי .mp4

# === 2. Live stream עובד? ===
ls /mnt/ram-ts/*/live/*/
# צריך לראות קבצי .m3u8 ו-.ts

# === 3. AI Detection רץ? ===
sudo systemctl status clearpoint-ai
# Active: active (running)

# === 4. VAAPI עובד? ===
LIBVA_DRIVER_NAME=iHD ffmpeg -hwaccel vaapi -hwaccel_device /dev/dri/renderD128 \
  -f lavfi -i testsrc=duration=1:size=320x240 -vf 'format=nv12,hwupload' \
  -c:v h264_vaapi -frames:v 1 -f null - 2>&1 | tail -1
# "1 frame successfully decoded, 1 frame successfully encoded"

# === 5. Tunnel עובד? ===
curl -s https://[שם-לקוח].clearpoint.co.il/health
# או בדוק מהטלפון

# === 6. Upload עובד? ===
tail -5 ~/vod-upload-log.txt
# צריך לראות "✅ Uploaded:"

# === 7. CPU Load סביר? ===
top -bn1 | head -5
# CPU < 50%, Load < 4
```

### 4.2 — בדיקה מהטלפון

1. פתח את **אפליקציית Clearpoint** בטלפון
2. וודא **Live stream** מציג את המצלמות
3. וודא **הקלטות** (VOD) מנגנות
4. וודא **התראות** מגיעות (עבור מול מצלמה)

### 4.3 — בדיקה מהאדמין

1. כנס ל-**Admin Panel** → **מצלמות**
2. וודא שכל המצלמות מראות **"תקין"** (ירוק)
3. וודא שה-health data מתעדכן

---

## 🔌 שלב 5: סיום בשטח (2 דקות)

1. **נתק** מסך + מקלדת
2. **הדבק** מדבקת שם לקוח על ה-Mini PC
3. **מקם** את ה-Mini PC ליד הנתב/Switch
4. **ודא** שכבלי חשמל + רשת מחוברים היטב
5. **צלם** את ה-setup הסופי (לתיעוד)

---

## 📊 טבלת לקוחות (רשום בגוגל שיטס / באדמין)

| שדה | ערך |
|------|------|
| שם לקוח | |
| User ID | |
| Device Token | |
| Mini PC IP | |
| RustDesk ID | |
| RustDesk Password | |
| Tunnel URL | |
| מצלמות IPs | |
| RTSP User/Pass | |
| סיסמת Ubuntu | |
| תאריך התקנה | |
| הערות | |

---

## 🔄 עדכונים למכשירים קיימים

### עדכון ידני (דרך RustDesk):

```bash
# התחבר דרך RustDesk, ואז:
cd ~/clearpoint-core
git pull origin main

# אם עדכנו scripts:
cd ~/clearpoint-scripts
# העתק קבצים מעודכנים

# הפעל מחדש services:
sudo systemctl restart clearpoint-ai
# אם שינינו camera scripts:
bash ~/start-clearpoint.sh
```

### עדכון אוטומטי (TODO — לבנות):

```bash
# cron יומי שבודק עדכונים מ-GitHub:
# 0 4 * * * bash ~/clearpoint-scripts/auto-update.sh >> ~/clearpoint-logs/update.log 2>&1
```

---

## 🆘 Troubleshooting — פתרון בעיות נפוצות

### "המצלמות לא מקליטות"
```bash
# בדוק שה-RTSP עובד:
ffprobe -v error -rtsp_transport tcp -i "rtsp://admin:123456@192.168.1.101:554/stream" 2>&1 | head -5

# אם שגיאה — בדוק IP, סיסמה, port
# אם עובד — בדוק systemd service:
sudo systemctl status camera-1
sudo journalctl -u camera-1 --no-pager -n 20
```

### "VODs לא מנגנים בטלפון"
```bash
# בדוק codec:
ffprobe -v error -select_streams v:0 -show_entries stream=codec_name -of csv=p=0 ~/clearpoint-recordings/*/footage/*/*.mp4 | head -5

# אם hevc — ודא ש-VAAPI עובד:
LIBVA_DRIVER_NAME=iHD vainfo 2>&1 | head -5

# הרץ upload ידנית:
rm -f /tmp/clearpoint-uploadVods.lock
cd ~/clearpoint-core && tsx uploadVods.ts 2>&1 | head -20
```

### "CPU גבוה מדי"
```bash
# מי אוכל CPU?
ps aux --sort=-%cpu | head -6

# אם AI — בדוק throttle:
grep "time.sleep" ~/clearpoint-ai/detect.py

# אם FFmpeg — ודא -c:v copy (לא libx264):
ps aux | grep ffmpeg | grep -v grep
```

### "אין אינטרנט"
```bash
ping -c 3 8.8.8.8
# אם עובד — DNS issue:
echo "nameserver 8.8.8.8" | sudo tee /etc/resolv.conf

# אם לא — בדוק כבל/SIM:
ip link show
nmcli dev status
```

### "מחשב לא עלה אחרי הפסקת חשמל"
- בדוק **BIOS → Restore AC Power Loss → Power On**
- אם לא מוגדר — צריך מקלדת + מסך לשנות

### "RustDesk לא מתחבר"
```bash
# ודא שרץ:
pgrep rustdesk || rustdesk &
# בדוק firewall:
sudo ufw status
# אם active — פתח ports:
sudo ufw allow 21115:21119/tcp
sudo ufw allow 21116/udp
```

---

## 📝 זמנים משוערים

| שלב | זמן |
|------|------|
| הכנה במשרד (לקוח + מצלמות באדמין) | 10 דק' |
| BIOS setup | 2 דק' |
| התקנת Ubuntu | 10 דק' |
| סקריפט התקנה | 5-10 דק' |
| הגדרות עמידות | 2 דק' |
| אימות | 5 דק' |
| סיום בשטח | 2 דק' |
| **סה"כ** | **~35-40 דק'** |

---

## 🔧 פתרון בעיות — מייל לא מגיע ללקוח

לפעמים שרתי מייל של ארגונים (עיריות, חברות) חוסמים את המיילים של Supabase.
אם לחצת "שלח קישור כניסה" ו**המייל לא הגיע** — בצע את הצעדים הבאים:

### אפשרות 1: הגדרת סיסמה ידנית (מומלץ)

1. פתח את ה-Admin panel בדפדפן
2. פתח Console (F12 → Console)
3. הריץ:
```javascript
fetch('/api/admin/set-user-password', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'USER_ID_HERE',
    password: 'PASSWORD_HERE'
  })
}).then(r => r.json()).then(console.log)
```
4. תקבל: `{success: true, email: '...', message: 'Password set for ...'}`
5. תן ללקוח את המייל + הסיסמה — ייכנס דרך `/login`

> **את ה-USER_ID** תמצא ב-URL של דף הלקוח, למשל:
> `/admin/customers/b0ffb6cc-560c-4165-ab5f-a628a9466e28`

### אפשרות 2: דרך Supabase Dashboard

1. לך ל-[Supabase Dashboard](https://supabase.com/dashboard) → Authentication → Users
2. חפש את המייל של הלקוח
3. לחץ על המשתמש → **Send magic link** או **Send password recovery**
4. אם גם זה לא מגיע — השתמש באפשרות 1

### סיבות נפוצות לחסימת מיילים:
- שרת מייל ארגוני (עירייה, חברה) חוסם שולחים לא מוכרים
- מייל נכנס לספאם/דואר זבל
- Supabase שולח מ-domain שלא ב-whitelist של הארגון

---

## ⚠️ דברים לזכור

1. **תמיד שמור סיסמאות** בטבלת הלקוחות
2. **BIOS: Power On after AC Loss** — קריטי! בלי זה המחשב לא ידלק אחרי הפסקת חשמל
3. **בדוק VAAPI** — בלי זה ה-VODs לא ינגנו בטלפון
4. **RustDesk ID** — בלי זה אין גישה מרחוק
5. **כתובות IP מצלמות קבועות** — ודא שהמצלמות מקבלות IP קבוע (static) בנתב
6. **SIM Router** — ודא שה-SIM פעיל ויש חבילת DATA מספיקה (~50GB/חודש)

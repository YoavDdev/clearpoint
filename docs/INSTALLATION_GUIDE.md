# 📋 Clearpoint Security — מדריך התקנה מלא E2E

> **מסמך זה מכסה את כל תהליך ההתקנה מ-A עד Z.**
> מיועד למתקין (אתה או טכנאי אחרי הדרכה).
> עדכון אחרון: יולי 2026

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

### 0.4 — הכנת Cloudflare Tunnel

1. כנס ל-[Cloudflare Zero Trust](https://one.dash.cloudflare.com/)
2. **Networks** → **Tunnels** → **Create a tunnel**
3. שם: `minipc-[שם-לקוח]`
4. בחר Connector: **Cloudflared**
5. העתק את ה-**Install Token** (שורה ארוכה שמתחילה ב-`eyJ...`)
6. הגדר **Public Hostname:**
   - Subdomain: `[שם-לקוח]` → Domain: `clearpoint.co.il`
   - Service: `http://localhost:8080`

### 0.5 — יצירת Device Token

1. **Admin Panel** → **מכשירים** (כשיהיה) או שמור ב-`.env`
2. צור device token ייחודי למכשיר

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

### 1.3 — כניסה ראשונה

```bash
# התחבר עם clearpoint / [הסיסמה שבחרת]
# ודא שיש אינטרנט:
ping -c 3 google.com
```

**אם SIM Router:** חבר את ה-SIM Router לחשמל, חבר כבל Ethernet מהנתב ל-Mini PC.

**אם WiFi:**
```bash
# חבר WiFi (אם לא עשית בהתקנה):
sudo nmcli dev wifi connect "NETWORK_NAME" password "WIFI_PASSWORD"
```

---

## ⚡ שלב 2: התקנת Clearpoint (5-10 דקות)

### 2.1 — הרץ את סקריפט ההתקנה

```bash
# הורד והרץ את הסקריפט:
curl -sL https://raw.githubusercontent.com/YoavDdev/clearpoint/main/installer/clearpoint-linux-installer.sh -o install.sh
chmod +x install.sh
sudo bash install.sh
```

> **הסקריפט ישאל:**
> - כתובות IP של מצלמות (מופרדות בפסיק): `192.168.1.101,192.168.1.102,192.168.1.103,192.168.1.104`
> - User ID (מהאדמין)
> - Device Token
> - Cloudflare Tunnel Token

### 2.2 — מה הסקריפט עושה (אוטומטי):

```
✅ מתקין: ffmpeg, nodejs, tsx, python3, intel-media-va-driver
✅ מתקין: OpenVINO, YOLOv8, RustDesk
✅ יוצר: camera scripts + systemd services
✅ מגדיר: RAM disk, cron jobs, AI detection
✅ מגדיר: Cloudflare tunnel
✅ מגדיר: Auto power-on services
✅ בודק: VAAPI, cameras, AI, tunnel
```

### 2.3 — העלאת סקריפטי מצלמות

**אם הסקריפט לא יצר אוטומטית** — העלה את הקבצים שהורדת מהאדמין:

```bash
# מהמחשב שלך, העתק עם SCP:
scp camera-*.sh clearpoint@[IP]:/home/clearpoint/clearpoint-scripts/

# או העתק מ-USB:
cp /media/clearpoint/USB/camera-*.sh ~/clearpoint-scripts/
chmod +x ~/clearpoint-scripts/camera-*.sh
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

## ⚠️ דברים לזכור

1. **תמיד שמור סיסמאות** בטבלת הלקוחות
2. **BIOS: Power On after AC Loss** — קריטי! בלי זה המחשב לא ידלק אחרי הפסקת חשמל
3. **בדוק VAAPI** — בלי זה ה-VODs לא ינגנו בטלפון
4. **RustDesk ID** — בלי זה אין גישה מרחוק
5. **כתובות IP מצלמות קבועות** — ודא שהמצלמות מקבלות IP קבוע (static) בנתב
6. **SIM Router** — ודא שה-SIM פעיל ויש חבילת DATA מספיקה (~50GB/חודש)

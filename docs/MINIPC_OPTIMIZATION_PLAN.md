# 🖥️ Mini-PC Optimization Plan

## 📊 ניתוח המצב הנוכחי

### מה רץ על ה-Mini-PC:
| תהליך | CPU Load | הערה |
|--------|----------|------|
| FFmpeg × N cameras | 🔴 **גבוה מאוד** | מקודד H.264 בתוכנה (`libx264`) |
| uploadVods.ts | 🔴 **גבוה** | `ensureH264()` מעביר H.265→H.264 |
| detect.py (YOLOv8) | 🟠 **בינוני-גבוה** | AI detection ברקע |
| status-check.sh | 🟢 נמוך | כל 5 דקות |
| live-server.js | 🟢 נמוך | Express static files |
| disk-check.sh | 🟢 זניח | פעם ביום |

### 🔴 בעיה מספר 1: FFmpeg מקודד בתוכנה

הבעיה הכי קריטית! **כל מצלמה** מריצה:
```bash
ffmpeg -c:v libx264 -preset veryfast -crf 23
```

זה אומר: FFmpeg **פותח** את ה-H.264/H.265 מהמצלמה, ואז **מקודד מחדש** ב-CPU.
עם 4 מצלמות × 1080p = **~80-90% CPU** רק על קידוד!

### 🔴 בעיה מספר 2: Transcoding ב-uploadVods

`ensureH264()` in `uploadVods.ts` בודקת כל קובץ — ואם הוא H.265, מקודדת מחדש.
זה יכול לקחת **10 דקות CPU מלא** לקובץ של 15 דקות.

### 🟠 בעיה מספר 3: Memory leaks → תקיעות

FFmpeg processes שרצים לנצח נוטים לצבור זיכרון.
אין מנגנון **restart מחזורי** — רק restart כשהסטרים תקוע.

### 🟠 בעיה מספר 4: MP4 browser compatibility

H.264 = עובד בכל דפדפן ✅
H.265 (HEVC) = רק Chrome 107+, Safari, Edge (לא Firefox!) ⚠️

---

## ✅ תוכנית שיפורים

### שלב 1: Copy במקום Encode (הכי קריטי — חוסך 80% CPU)

רוב מצלמות ה-IP כבר פולטות H.264. במקום לקודד מחדש:

**לפני:**
```bash
ffmpeg -rtsp_transport tcp -i "rtsp://..." \
  -c:v libx264 -preset veryfast -crf 23 \  # 🔴 מקודד מחדש!
  -c:a aac -ar 44100 -ac 2 \
  -f segment ...
```

**אחרי:**
```bash
ffmpeg -rtsp_transport tcp -i "rtsp://..." \
  -c:v copy \                               # ✅ מעתיק ישירות!
  -c:a aac -ar 44100 -ac 1 -b:a 64k \       # אודיו קל
  -movflags +faststart \
  -f segment -segment_time 900 -segment_format mp4 -reset_timestamps 1 \
  -strftime 1 "$OUTPUT_DIR/$CAMERA_ID_%Y-%m-%d_%H-%M-%S.mp4" \
  -c:v copy \                                # ✅ copy גם ל-HLS
  -f hls -hls_time 4 -hls_list_size 5 -hls_flags delete_segments \
  "$RAM_DIR/$CAMERA_ID.m3u8" \
  -y
```

**אם המצלמה פולטת H.265**, שתי אפשרויות:
1. **הגדר את המצלמה ל-H.264 מתפריט ההגדרות שלה** (מומלץ!)
2. אם אין אפשרות — נשתמש ב-VAAPI/QSV hardware encoding (אם ל-mini-PC יש Intel GPU)

### שלב 2: Auto-restart מחזורי (פותר תקיעות)

systemd service עם `RuntimeMaxSec=86400` — כל 24 שעות FFmpeg עושה restart:
```ini
[Service]
RuntimeMaxSec=86400
Restart=always
RestartSec=10
WatchdogSec=120
```

גם נוסיף watchdog script שבודק אם FFmpeg "תקוע" (לא מייצר קבצים חדשים).

### שלב 3: uploadVods — הסרת transcoding

אם נשתמש ב-`-c:v copy` ב-FFmpeg, הקבצים כבר יהיו H.264.
ה-`ensureH264()` הופך ל-check בלבד, בלי transcoding.

**עבור מצלמות H.265 שלא ניתן לשנות:**
- נעלה את הקובץ כ-H.265 ונתמוך בניגון בדפדפן (Chrome/Safari/Edge תומכים)
- fallback: transcoding בענן (לא על ה-mini-PC)

### שלב 4: Multi Mini-PC per customer

**מבנה נתונים:**
- `mini_pcs` table: `id, user_id, device_token, hostname, last_seen_at, status`
- כל mini-PC מקבל `device_token` ייחודי
- `cameras` table: `mini_pc_id` column

**זרימה:**
1. לקוח עם 2 אתרים → 2 mini-PCs → 2 device tokens
2. כל mini-PC מדווח health בנפרד
3. Dashboard מציג status per mini-PC

### שלב 5: Image / Easy Installation

**אפשרות A: USB Provisioning Script (מומלץ לשלב ראשון)**
הסקריפט הקיים כבר טוב! צריך רק:
1. להוסיף auto-detection של codec המצלמה
2. להפוך את ה-`.env` generation אוטומטי מ-Clearpoint API
3. להוסיף auto-restart configurations
4. להוסיף `unattended-upgrades` לעדכוני אבטחה

**אפשרות B: Cloud-init Image (לקוחות גדולים)**
- Ubuntu Server minimal + cloud-init
- ב-boot ראשון: שולף config מ-Clearpoint API לפי serial/hostname
- מתקין הכל אוטומטית
- zero-touch deployment

**אפשרות C: Docker (עתידי)**
- כל מצלמה = container
- docker-compose עם restart policies
- קל לעדכן/גרסן

---

## 📋 סדר עדיפויות

| # | משימה | השפעה | מאמץ | עדיפות |
|---|--------|--------|------|--------|
| 1 | `-c:v copy` בכל camera scripts | 🟢 **80% CPU חיסכון** | קטן | 🔴 P0 |
| 2 | systemd auto-restart (24h cycle) | 🟢 **פותר תקיעות** | קטן | 🔴 P0 |
| 3 | הסרת `ensureH264()` transcoding | 🟢 חיסכון CPU משמעותי | קטן | 🟠 P1 |
| 4 | Camera codec auto-detect בהתקנה | 🟢 מונע בעיות | בינוני | 🟠 P1 |
| 5 | Multi mini-PC DB support | 🟢 סקלביליות | בינוני | 🟡 P2 |
| 6 | Installer v2 (auto config from API) | 🟢 התקנה קלה | גדול | 🟡 P2 |

---

## 🔧 מה ה-Mini-PC שלך?

לפני שנתחיל, צריך לבדוק:
1. **איזה mini-PC** (מודל, מעבד, RAM)?
2. **כמה מצלמות** מחוברות?
3. **המצלמות פולטות H.264 או H.265?**
4. **יש Intel iGPU** (לחומרה encoding)?

```bash
# הרץ על ה-Mini-PC:
echo "=== CPU ===" && cat /proc/cpuinfo | grep "model name" | head -1
echo "=== RAM ===" && free -h | head -2
echo "=== GPU ===" && lspci | grep -i vga
echo "=== CPU Usage ===" && top -bn1 | head -5
echo "=== Camera Codec ===" && for f in ~/clearpoint-recordings/*.mp4; do echo "$f:"; ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,width,height -of csv=p=0 "$f" 2>/dev/null; break; done
```

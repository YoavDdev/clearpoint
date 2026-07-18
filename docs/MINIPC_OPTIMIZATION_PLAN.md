# 🖥️ Mini-PC Optimization — מצב נוכחי ותוכנית להתקנות הבאות

## ✅ מה בוצע (יולי 2026)

### תוצאות:
| מדד | לפני | אחרי |
|-----|-------|--------|
| **CPU** | 81.8% | **28.9%** |
| **System Load** | 11.10 | **3.39** |
| **קידוד VOD** | libx264 (174% CPU, 10 דקות) | **VAAPI GPU (~5% CPU, 47 שניות)** |
| **AI Detection** | 185% CPU (non-stop) | **123% CPU (throttled 2s)** |
| **ניגון VOD בטלפון** | ✅ | ✅ |

### שינויים שבוצעו:

#### 1. FFmpeg Recording — Stream Copy (`-c:v copy`)
הקלטות משתמשות ב-copy במקום re-encoding. חוסך ~80% CPU.
```bash
ffmpeg -rtsp_transport tcp -i "rtsp://..." \
  -c:v copy \                    # ← לא מקודד מחדש!
  -c:a aac -ar 44100 \
  -f segment -segment_time 900 -reset_timestamps 1 ...
```

#### 2. Upload — VAAPI Hardware Transcoding
`ensureH264()` ב-`uploadVods.ts` משתמשת ב-Intel GPU לקידוד H.265→H.264:
```bash
LIBVA_DRIVER_NAME=iHD ffmpeg \
  -hwaccel vaapi -hwaccel_device /dev/dri/renderD128 -hwaccel_output_format vaapi \
  -i "$INPUT" -c:v h264_vaapi -c:a copy -movflags +faststart -y "$OUTPUT"
```
- **Speed:** 19× real-time (קובץ 15 דקות = 47 שניות)
- **CPU:** ~5% (GPU עושה הכל)
- **Fallback:** אם VAAPI נכשל — מעלה as-is

#### 3. AI Detection — Throttle
- `time.sleep(2)` בין כל frame analysis
- Fire/Smoke model disabled (`.disabled` extension)
- מספיק לזיהוי אנשים/רכבים (אף אחד לא חולף ב-2 שניות)

#### 4. Cron — tsx במקום ts-node
- `ts-node` לא תומך ב-numeric separators (`300_000`)
- הוחלף ל-`tsx` (מבוסס esbuild, מהיר ותואם)

---

## 📦 דרישות להתקנה חדשה

### חבילות חובה:
```bash
sudo apt install -y ffmpeg intel-media-va-driver
sudo npm install -g tsx
```

### Environment Variable (VAAPI):
צריך להיות זמין ל-cron:
```bash
# ב-/etc/environment או ב-crontab:
LIBVA_DRIVER_NAME=iHD
```
> **הערה:** ה-`uploadVods.ts` מגדיר את זה inline בפקודת FFmpeg, אז לא חובה לשים באפשרות.

### בדיקת VAAPI:
```bash
# ודא שהדרייבר עובד:
LIBVA_DRIVER_NAME=iHD ffmpeg -hwaccel vaapi -hwaccel_device /dev/dri/renderD128 \
  -f lavfi -i testsrc=duration=1:size=320x240 -vf 'format=nv12,hwupload' \
  -c:v h264_vaapi -frames:v 1 -f null - 2>&1 | tail -3
```

---

## 🔧 Installer Checklist (להתקנות הבאות)

ה-installer (`clearpoint-linux-installer.sh`) כבר מעודכן עם:
- [x] `-c:v copy` בסקריפטי מצלמות
- [x] `intel-media-va-driver` בהתקנת חבילות
- [x] `tsx` במקום `ts-node`
- [x] `setup-cron.sh` עם `tsx`

### מה צריך לוודא ידנית בכל התקנה:
1. **VAAPI עובד** — הריצו את הבדיקה למעלה
2. **Codec מצלמה** — אם H.265, ה-VAAPI יטפל אוטומטית
3. **AI throttle** — `detect.py` צריך `time.sleep(2)` אחרי `heartbeat_frames += 1`
4. **Fire/Smoke model** — disabled by default (אם לא צריך)

---

## 🏗️ תוכנית עתידית

### P1 — קרוב:
| משימה | סטטוס |
|--------|--------|
| systemd auto-restart (24h cycle) | � Template מוכן, לא הופעל |
| daily-maintenance.sh cron | ✅ מוכן בקוד |
| Camera codec auto-detect | ⬜ TODO |

### P2 — עתידי:
| משימה | הערה |
|--------|--------|
| Multi Mini-PC per customer | DB table + device_token routing |
| Installer v2 (auto config from API) | Zero-touch deployment |
| Docker containerization | כל מצלמה = container |
| Cloud transcoding fallback | אם אין GPU |

---

## � חומרה נוכחית (Reference)

| פרט | ערך |
|------|------|
| **CPU** | Intel N150 (4 E-cores, Alder Lake-N) |
| **RAM** | 7.5GB |
| **GPU** | Intel Alder Lake-N iGPU (VAAPI) |
| **OS** | Ubuntu 24.04 |
| **מצלמות** | 4 (H.265/HEVC) |
| **חיבור** | SIM (bandwidth limited) |

---

## 🔄 Rollback Instructions

אם צריך לחזור אחורה:

```bash
# 1. החזר uploadVods.ts לגרסה ללא transcoding:
# שנה ensureH264() ל-return filePath ישירות

# 2. בטל AI throttle:
# מחק את time.sleep(2) מ-detect.py

# 3. הפעל Fire/Smoke model:
mv ~/clearpoint-ai/models/fire_smoke_fp16.xml.disabled ~/clearpoint-ai/models/fire_smoke_fp16.xml

# 4. חזור ל-ts-node (אם צריך):
crontab -l | sed 's|/usr/local/bin/tsx|/usr/local/bin/ts-node|' | crontab -
```

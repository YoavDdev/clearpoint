# 📷 Clearpoint Camera Setup Guide (Updated with Recommended Camera Config)

## 🧰 Step 1: Local Camera Installation (On Site)

1. Mount and power on the camera.
2. Connect it to the router (wired or Wi-Fi).
3. Access the camera web UI (usually at `http://192.168.1.X`).
4. Enable **RTSP** in the settings.
5. Set:
   - Username: `admin`
   - Password: `your_password`
   - RTSP Port: `554` (default)
   - Resolution: `1920x1080` (Main Stream)
   - Encoding Format: `H.265`
   - Frame Rate: `20–25 fps`
   - Bitrate Control: `Variable Bitrate` (CBR if needed)
   - Max Bitrate: `2048–4096 kbps`
   - I Frame Interval: `2–4 seconds`
   - Quality: `Good` (or `Standard` for LTE savings)
6. **Test with VLC**:
   ```
   rtsp://admin:<password>@192.168.1.X:554/<stream_path>
   ```
7. Confirm the stream works (even if it shows SD for now).

---

## 🧾 Step 2: Register Camera in Supabase

Create a new camera record using your admin panel or directly in Supabase:

- `name`: Example — "כניסה ראשית"
- `stream_path`: Full RTSP link (see below)
- `user_email`: The customer’s email
- `is_stream_active`: `true`

### 🔖 Example `stream_path`
```
rtsp://admin:123456@192.168.1.10:554/h264/ch1/main/av_stream
```

---

## 🌍 Step 3: Enable Remote Access (Optional)

If customer needs access from outside:

### 🔁 Option A: Static Public IP (SIM or ISP Router)
1. Log into router settings.
2. Forward external port `554` → internal camera IP port `554`.
3. Update stream path:
```
rtsp://admin:<password>@<PUBLIC_IP>:554/h264/ch1/main/av_stream
```

### 🌐 Option B: Use DDNS
- Register DDNS (e.g., No-IP or camera’s built-in DDNS)
- Format:
```
rtsp://admin:<password>@<yourname>.ddns.net:554/h264/ch1/main/av_stream
```

---

## 🎬 Step 4: Run FFmpeg for Streaming

From your server or local dev:

### 🔧 Template:
```bash
ffmpeg -i "<stream_path>" \
  -vf scale=1280:720 \
  -c:v libx264 -preset ultrafast -tune zerolatency \
  -c:a aac -ar 8000 -b:a 64k \
  -f hls -hls_time 2 -hls_list_size 3 -hls_flags delete_segments \
  ./public/stream/<camera_id>.m3u8
```

### 🔖 Example:
```bash
ffmpeg -i "rtsp://admin:123456@192.168.1.10:554/h264/ch1/main/av_stream" \
  -vf scale=1280:720 \
  -c:v libx264 -preset ultrafast -tune zerolatency \
  -c:a aac -ar 8000 -b:a 64k \
  -f hls -hls_time 2 -hls_list_size 3 -hls_flags delete_segments \
  ./public/stream/47c63248-6458-48b6-bc32-ccf435a1b3ce.m3u8
```

---

## 👤 What the Customer Sees

- Logs into `/dashboard`
- Sees only their assigned cameras
- Views clean, live HLS stream via browser

---

## ✅ Final Notes

- Always test RTSP in VLC before saving
- Power cycle the camera if resolution updates don’t apply
- Use `stream=1.sdp` or the full HD path like `/h264/ch1/main/av_stream`
- For better performance: record in H.265, stream live via FFmpeg in H.264
- Downscale to 720p if needed using `-vf scale=1280:720`

---

For support, use `/test/<camera_id>` to isolate stream issues quickly.

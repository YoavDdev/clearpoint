# 📦 Clearpoint Plan B – Full Cloud VOD (Wi-Fi) – Deep Explanation

## 🧭 Overview
Plan B is a cloud-based VOD solution designed for customers who have stable Wi-Fi at home or in their business. It enables 24/7 recording from 4 cameras, automatic upload to cloud storage, and easy playback via the Clearpoint dashboard.

---

## 🧱 On-Site Setup (Per Customer)
- **Hardware**: GMKtec Mini PC with 256GB NVMe SSD
- **Cameras**: Up to 4 IP cameras connected via RTSP
- **Recording Software**: FFmpeg running on the Mini PC

### 🔄 FFmpeg HLS Configuration
```bash
ffmpeg -rtsp_transport tcp -i rtsp://CAMERA_URL \
  -c:v copy -f hls \
  -hls_time 10 \
  -hls_list_size 0 \
  -hls_segment_filename "./recordings/cam01/2025-05-20/%H-%M-%S.ts" \
  ./recordings/cam01/2025-05-20/stream.m3u8
```

- Produces a `.ts` file every 10 seconds (~640KB each)
- ~8,640 `.ts` files per day per camera
- ~5.5 GB/day per camera → ~22 GB/day total (for 4 cameras)

---

## ☁️ Cloud Upload Logic (Every 15 Minutes)

A Node.js script runs every 15 minutes to:
1. Scan local `/recordings/` folder for new `.ts` files
2. Upload each file to Backblaze B2 using a structured path
3. Insert a metadata row into Supabase (`vod_files` table)
4. Delete the `.ts` file after upload

### 🗂️ B2 Folder Structure
```
vod/{user_id}/{camera_id}/{YYYY-MM-DD}/{HH-MM-SS}.ts
```

### 🔐 Supabase Metadata Schema
| Field       | Example                                               |
|-------------|--------------------------------------------------------|
| user_id     | xyz123                                                 |
| camera_id   | cam01                                                  |
| url         | https://cdn.clearpoint.com/vod/xyz123/cam01/...       |
| timestamp   | 2025-05-20T15:30:00Z                                   |
| duration    | 10                                                     |

---

## 🎥 User Experience
On the Clearpoint `/dashboard/footage` page:
1. User selects camera and date
2. App fetches all matching `vod_files` records from Supabase
3. Playback starts using secure Bunny.net streaming
4. Users can download clips or take snapshots

---

## 📊 Storage and Cost Planning
### Per Camera
- 5.5 GB/day at 720p, 10fps, H.265, 512kbps

### Per Customer (4 Cameras)
- ~22 GB/day
- 7-day retention = 154 GB
- 14-day retention = 308 GB

### 100 Customers
- 7-day plan: 15.4 TB → ~$77/month on Backblaze B2
- 14-day plan: 30.8 TB → ~$154/month on Backblaze B2

> Note: Uploads are free. CDN (Bunny.net) adds ~$10–15/month

---

## 🧼 End-of-Day Cleanup
- After each upload, the script deletes the `.ts` file
- `/recordings/...` stays clean and low-usage
- Only a few hours of footage remain locally as buffer

---

## ✅ Summary
| Feature              | Plan B – Full Cloud (Wi-Fi)       |
|----------------------|-----------------------------------|
| Cameras              | 4                                 |
| Storage Location     | Backblaze B2 + Bunny.net CDN      |
| Upload Mode          | Near-real-time, every 15 minutes  |
| Local Retention      | Short buffer (1–2 days max)       |
| Playback             | Web dashboard (per camera/date)   |
| Monthly Storage Cost | ~$0.005/GB                        |
| Best For             | Homes/businesses with fast Wi-Fi  |

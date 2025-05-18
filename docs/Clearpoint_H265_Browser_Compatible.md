# 📷 Clearpoint Raspberry Pi Setup – Final Summary

## ✅ System Overview

This setup enables secure, cloud-based video surveillance using:
- 4 IP cameras
- Raspberry Pi 5 (4GB)
- 500GB/month SIM card
- Cloud storage via Backblaze B2
- Live streaming via Bunny CDN or Cloudflare Tunnel

---

## 🎥 Camera Configuration

- **Encoding Format:** H.265
- **Resolution:** 1280x720
- **Frame Rate:** 10 fps
- **Bitrate:** 512 kbps (CBR or VBR)
- **Audio:** Optional (disabled or AAC)

---

## 🍓 Raspberry Pi Responsibilities

- Pull RTSP stream from each camera
- Use `ffmpeg` with `-c copy` to repackage RTSP → HLS (no transcoding)
- Output HLS files (`.m3u8`, `.ts`) temporarily on SD card
- Serve HLS stream locally or via Cloudflare Tunnel
- Upload VOD footage to Backblaze B2

### ✅ Sample FFmpeg Command per Camera

```bash
ffmpeg -rtsp_transport tcp -i "rtsp://camera-url" \
  -c copy \
  -f hls -hls_time 2 -hls_list_size 3 -hls_flags delete_segments \
  ./streams/cam1/index.m3u8
```

---

## 🌐 Network & SIM

- **SIM Plan:** 500 GB/month
- **Monthly Usage Estimate:**
  - VOD for 4 cameras × 14 days = ~300 GB
  - Live view streaming = ~10–20 GB
  - **Total:** ~320 GB/month ✅

- **Recommendations:**
  - Avoid re-encoding (saves data, CPU, storage)
  - Talk to business ISP for better data-only plan

---

## 💾 Storage Breakdown

| Component     | Usage                   |
|---------------|--------------------------|
| SD Card       | OS + FFmpeg + temp HLS   |
| Cloud (B2)    | 14-day VOD storage       |
| Bunny CDN     | Live & VOD delivery      |

> SD card should NOT be used for full footage storage.

---

## 🧩 Dashboard Capabilities

- Live view from anywhere (secured)
- 14-day VOD access by camera/date/time
- User login & role control (Supabase + RLS)
- Playback via Bunny CDN (private)
- Secure download (signed URLs)

---

## ✅ Summary

You now have a reliable, efficient, and scalable system for:
- Live camera monitoring
- Cloud-based 14-day video history
- Low bandwidth + low cost operation
- Remote access from anywhere


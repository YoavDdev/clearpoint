
# 📷 Clearpoint Default Camera Configuration (for All Installations)

This document defines the standard configuration for all IP cameras installed as part of the Clearpoint Security system. The goal is to optimize for low bandwidth and efficient storage, while maintaining sufficient image quality for reliable remote viewing and event tracking.

---

## ✅ Default Camera Settings

| Parameter          | Value        | Notes                                 |
|-------------------|--------------|---------------------------------------|
| Resolution         | 1280×720     | HD (sufficient clarity for most use) |
| Frame Rate (FPS)   | 10           | Lower frame rate saves bandwidth     |
| Encoding Format    | H.265        | Highly efficient video compression   |
| Bitrate Mode       | Variable     | Allows dynamic bitrate adjustments   |
| Max Bitrate        | 512 kbps     | Limits total data per stream         |
| I-Frame Interval   | 4 seconds    | Good balance for HLS streaming       |
| Quality            | Good         | Visual clarity with compression      |

---

## 🎯 Purpose

These settings ensure:
- ✅ Lower cloud storage consumption (~3–4GB per camera/day)
- ✅ Smoother performance over LTE/SIM routers
- ✅ More affordable monthly bandwidth costs (Backblaze + Bunny)
- ✅ Compatibility with FFmpeg → HLS → Bunny CDN workflow

---

## 🛠 Where to Apply

These settings should be configured:
- In the camera’s admin panel (usually under "Video Settings")
- During initial setup or pre-deployment staging
- After every firmware reset or factory restore

---

## 🔐 Notes

- Cameras with motion zones or higher detail requirements (e.g. entryways, license plates) may be configured with higher bitrate/resolution on a case-by-case basis.
- Always confirm the stream URL corresponds to H.265 (not H.264).
- Use `ffmpeg` to transcode H.265 → HLS with `libx264` for browser compatibility.


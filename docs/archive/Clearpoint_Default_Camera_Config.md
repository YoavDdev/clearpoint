
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

## 🤖 AI Detection – Camera Requirements

For reliable AI person/vehicle detection, the following camera settings are **critical**:

| Setting | Recommended | Why |
|---------|-------------|-----|
| Smart Codec (H.265+/Smart H.265) | **OFF** | Smart codecs reduce quality when no motion → AI misses detections |
| Resolution (sub-stream for AI) | 1280×720 | Good enough for YOLOv8, not too heavy for Mini PC |
| FPS | 10+ | AI analyzes 1 FPS but needs consistent frame delivery |
| Bitrate | Variable, 512+ kbps | Too low = blurry frames = missed detections |
| Camera Motion Detection | **Optional** | Not needed — AI runs its own detection on every frame |

### ⚠️ Smart Codec Warning

Many cameras (Hikvision H.265+, Dahua Smart H.265) have a "Smart Codec" feature that:
- **Reduces frame quality** when the camera thinks there's no motion
- **Lowers FPS** during "quiet" periods
- **Blurs static areas** to save bandwidth

This directly hurts AI detection — a person standing still may be blurred by the codec, causing YOLOv8 to miss them.

**Solution:** Disable Smart Codec in the camera admin panel:
- **Hikvision**: Video Settings → Video Encoding → H.265+ → **OFF** (use standard H.265)
- **Dahua**: Settings → Encode → Smart Codec → **OFF**
- **General**: Look for "Smart H.265", "H.265+", "Smart Encoding" and disable it

---

## 🔐 Notes

- Cameras with motion zones or higher detail requirements (e.g. entryways, license plates) may be configured with higher bitrate/resolution on a case-by-case basis.
- Always confirm the stream URL corresponds to H.265 (not H.264).
- Use `ffmpeg` to transcode H.265 → HLS with `libx264` for browser compatibility.


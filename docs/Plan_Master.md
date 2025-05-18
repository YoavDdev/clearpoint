# 📋 Clearpoint Subscription Plans – Master Reference

This document defines the official pricing, features, and structure for all Clearpoint security camera service plans.  
It is intended for internal use to support website development, billing, and feature integration.

---

## 🔧 Hardware Baseline (All Plans)

- GMKtec Mini PC (Intel N100, 8GB, 256GB SSD): ₪392
- 4 IP Cameras (H.265, 720p–1080p): ₪400–600
- Cables, mounts, POE switch: ₪150–200
- Installation Fee (one-time): ₪250–₪400
- Storage buffer: ~10 days local VOD (SSD-based)

---

## 🔵 Plan B – Full Cloud (Wi-Fi)

**Target:** Homes or businesses with unlimited Wi-Fi  
**Features:**
- Unlimited live access from anywhere
- Full cloud VOD upload (7 or 14 days)
- Download clips and snapshots
- Uses Backblaze B2 + Bunny CDN
- No bandwidth cap

**Monthly Cost Estimate:**
- Backblaze B2 (300GB): ₪6–8
- Bunny CDN: ₪10–15
- Support/overhead: ₪10

**💸 Price:**
- 7-day backup: ₪99
- 14-day backup: ₪119–129
- Profit: ₪70–100+

---

## 🟠 Plan A – Smart Cloud (SIM Router)

**Target:** Homes without Wi-Fi, remote locations  
**Features:**
- Includes 4G SIM router (500GB/month)
- Smart upload strategy (daily limit or on-demand)
- Live access from anywhere
- VOD cloud backup for 7 or 14 days
- Backup uploads delayed or filtered

**Monthly Cost Estimate:**
- SIM plan (1000GB): ₪59.90
- B2 storage (150GB): ₪3
- Bunny CDN: ₪5–10
- Support/overhead: ₪10

**💸 Price:**
- 7-day backup: ₪129
- 14-day backup: ₪149–159
- Profit: ₪40–75

---

## 🟤 Plan C – Local NVR Only

**Target:** Users who prefer privacy or don’t have internet  
**Features:**
- Local storage only (SSD)
- View via local Wi-Fi
- 7–14 day retention on-device
- Clearpoint dashboard (LAN access)
- Upgrade-ready to cloud

**Monthly Cost Estimate:**
- Support/maintenance: ₪10–15
- Hardware amortization: ₪25

**💸 Price:**
- 7-day local: ₪59
- 14-day local: ₪69
- Profit: ₪20–30

---

## ✅ Common to All Plans

- Clearpoint dashboard (Hebrew, responsive)
- Clip download + snapshot tools
- Role-based access control via Supabase
- Camera → Date → Time selection UI
- Powered by GMKtec Mini PC at site
- 4 camera support included in base price

---

## 🧠 Optional Annual Plan Discounts

- 7-day SIM plan annual: ₪1,390 (save ₪158)
- 14-day Cloud plan annual: ₪1,390 (save ₪158)
- Discounts apply on upfront payment only

---

## 📌 Notes

- Use plan structure for pricing page design
- React component layout will be based on this logic
- SIM plans must enforce upload limits (~5–7 GB/day)
- Local-only plans should support full dashboard offline via LAN
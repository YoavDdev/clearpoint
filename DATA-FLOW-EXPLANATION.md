# 📊 Complete Camera Monitoring Data Flow

## 🔄 How Data Flows Every 5 Minutes

```
┌──────────────────────────────────────────────────────────┐
│              MINI PC (at customer location)              │
│                 status-check.sh runs                     │
└──────────────────────────────────────────────────────────┘
                           ↓
        ┌──────────────────┴──────────────────┐
        ↓                                      ↓
┌────────────────┐                    ┌────────────────┐
│  MINI PC DATA  │                    │  CAMERA DATA   │
└────────────────┘                    └────────────────┘
        ↓                                      ↓
        ↓                                      ↓
┌────────────────┐                    ┌────────────────┐
│   DATABASE     │                    │   DATABASE     │
│ mini_pc_health │                    │ camera_health  │
└────────────────┘                    └────────────────┘
        ↓                                      ↓
        └──────────────────┬───────────────────┘
                           ↓
                  ┌────────────────┐
                  │  ADMIN PANEL   │
                  │  Diagnostics   │
                  └────────────────┘
```

---

## 🖥️ **MINI PC DATA** (System Health)

### **What Gets Collected:**

| Metric | Description | Example Value | Critical Threshold |
|--------|-------------|---------------|-------------------|
| **cpu_temp_celsius** | CPU temperature | 45°C | >80°C = Critical |
| **cpu_usage_pct** | CPU usage percentage | 15.3% | - |
| **ram_total_mb** | Total RAM | 8192 MB | - |
| **ram_used_mb** | Used RAM | 2048 MB | - |
| **ram_usage_pct** | RAM usage % | 25.0% | >90% = Critical |
| **disk_root_total_gb** | Total disk space | 500 GB | - |
| **disk_root_used_gb** | Used disk space | 125 GB | - |
| **disk_root_pct** | Disk usage % | 25% | >90% = Critical |
| **disk_ram_total_gb** | RAM disk total | 2 GB | - |
| **disk_ram_used_gb** | RAM disk used | 0.5 GB | - |
| **disk_ram_pct** | RAM disk usage % | 25% | - |
| **load_avg_1min** | 1-min load average | 0.45 | - |
| **load_avg_5min** | 5-min load average | 0.52 | - |
| **load_avg_15min** | 15-min load average | 0.48 | - |
| **uptime_seconds** | System uptime | 864000 (10 days) | - |
| **process_count** | Running processes | 142 | - |
| **internet_connected** | Internet status | true/false | false = Warning |
| **ping_gateway_ms** | Gateway ping time | 2 ms | - |
| **ping_internet_ms** | Internet ping time | 15 ms | - |
| **total_video_files** | Recorded videos | 5432 | - |
| **overall_status** | Mini PC status | healthy/warning/critical | - |
| **last_checked** | Last update time | 2025-10-31 23:12:08 | - |

### **Status Calculation Logic:**

```bash
if CPU > 80°C OR Disk > 90% OR RAM > 90% → Status: CRITICAL
else if No Internet → Status: WARNING
else if CPU > 70°C OR Disk > 75% → Status: WARNING
else → Status: HEALTHY
```

### **Where It's Stored:**

**Database Table:** `mini_pc_health`
- One record per Mini PC (updated via PATCH every 5 minutes)
- Contains all metrics above

---

## 📹 **CAMERA DATA** (Stream Health)

### **What Gets Collected:**

| Metric | Description | Example Value | Meaning |
|--------|-------------|---------------|---------|
| **camera_id** | Camera UUID | 82015c1c-84a4-4b7e-a9ce-ffc813255f85 | Unique ID |
| **mini_pc_id** | Parent Mini PC | abc-123-def | Which PC manages it |
| **stream_status** | Stream health | ok/stale/missing/error | Current state |
| **last_checked** | Last check time | 2025-10-31 23:12:02 | When checked |
| **log_message** | Status message | "Healthy" or error details | Human readable |

### **Stream Status Logic:**

```bash
# Check 1: Does m3u8 file exist?
if [ ! -f stream.m3u8 ]; then
  STATUS="missing"
  MESSAGE="No m3u8 file"
  → Camera offline, FFmpeg not running
  
# Check 2: Is m3u8 file fresh?
elif [ file_age > 60 seconds ]; then
  STATUS="stale"
  MESSAGE="Stream stale (96s)"
  → Camera stuck, not updating stream
  
# Check 3: All good
else
  STATUS="ok"
  MESSAGE="Healthy"
  → Camera working perfectly
fi
```

### **Where It's Stored:**

**Database Table:** `camera_health`
- One record per camera (updated via PATCH every 5 minutes)
- Contains stream status, last check time, log message

---

## 🔍 **YOUR ACTUAL DATA (yoavdra@gmail.com):**

### **Mini PC Status:**
```
✅ Status: Reporting correctly every 5 minutes
✅ Data: System metrics being collected
✅ Database: mini_pc_health table updated
```

### **Cameras Status:**

| Camera | stream_status | log_message | Admin Should Show |
|--------|---------------|-------------|-------------------|
| **מרפסת** | missing ❌ | "No m3u8 file" | 🔴 שגיאה (Error) |
| **חניה** | ok ✅ | "Healthy" | 🟢 תקין (Healthy) |
| **חצר** | ok ✅ | "Healthy" | 🟢 תקין (Healthy) |
| **כניסה** | ok ✅ | "Healthy" | 🟢 תקין (Healthy) |

---

## ✅ **VERIFICATION - Is Everything Working?**

Let me check each component:

### **1. Mini PC Health Reporting** ✅
- [x] Script collects 20+ system metrics
- [x] Updates `mini_pc_health` table every 5 minutes
- [x] Calculates overall status (healthy/warning/critical)
- [x] Monitors: CPU temp, RAM, disk, network, processes
- **STATUS: WORKING CORRECTLY**

### **2. Camera Health Reporting** ✅
- [x] Script checks each camera's stream.m3u8 file
- [x] Detects: missing, stale (>60s), or ok
- [x] Updates `camera_health` table every 5 minutes
- [x] Reports to database with timestamp
- **STATUS: WORKING CORRECTLY**

### **3. Database Storage** ✅
- [x] `mini_pc_health` table: Stores system metrics
- [x] `camera_health` table: Stores stream status
- [x] Relationships: mini_pc → cameras via `mini_pc_id`
- [x] Data retention: Latest record per device
- **STATUS: WORKING CORRECTLY**

### **4. Admin Panel Display** ⚠️ **FIXED NOW**
- [x] Reads from `camera_health` table
- [x] Shows: name, last check time, status
- [x] **BEFORE FIX:** Ignored "missing" status → showed תקין ❌
- [x] **AFTER FIX:** Detects "missing" → shows שגיאה ✅
- **STATUS: NOW WORKING CORRECTLY**

---

## 🐛 **What Was Broken (Now Fixed):**

### **Problem:** Camera "מרפסת"
```
Database has:  stream_status: "missing"
Admin showed:  🟢 תקין (Healthy) ← WRONG!
```

### **Root Cause:**
Admin diagnostics code checked for:
- ✅ stream_status === "error"
- ✅ stream_status === "stale"
- ❌ stream_status === "missing" ← NOT HANDLED!

### **The Fix:**
Added handling for `stream_status === "missing"`:
```typescript
else if (streamStatus === "missing") {
  issues.push(`זרם חסר - ${health.log_message || 'No stream file'}`);
  status = "error";
  severity = "critical";
}
```

---

## 📋 **Complete Status Flow Example:**

### **Camera "מרפסת" (Broken Camera):**

```
Step 1: Mini PC checks camera
  ↓
  Check: /mnt/ram-ts/USER_ID/live/d7d99961-6c65-4fda-b345-6fbbf08c0cb5/stream.m3u8
  Result: File NOT found
  ↓
Step 2: Report to database
  {
    "camera_id": "d7d99961-6c65-4fda-b345-6fbbf08c0cb5",
    "stream_status": "missing",
    "log_message": "No m3u8 file",
    "last_checked": "2025-10-31 23:12:08"
  }
  ↓
Step 3: Admin panel reads database
  Sees: stream_status = "missing"
  ↓
Step 4: Admin panel displays
  BEFORE: 🟢 תקין ← BUG!
  AFTER:  🔴 שגיאה: זרם חסר - No m3u8 file ← CORRECT!
```

---

## 🎯 **Summary:**

| Component | Status | Notes |
|-----------|--------|-------|
| **Mini PC Monitoring** | ✅ Working | Collects 20+ system metrics |
| **Camera Stream Monitoring** | ✅ Working | Checks m3u8 file freshness |
| **Database Updates** | ✅ Working | Updates every 5 minutes |
| **Admin Panel (Before Fix)** | ❌ Bug | Ignored "missing" status |
| **Admin Panel (After Fix)** | ✅ Working | Now shows all statuses correctly |

---

## 🔧 **Why Camera "מרפסת" is Broken:**

The camera shows `"No m3u8 file"` which means:
1. FFmpeg process is NOT running for this camera
2. OR FFmpeg is running but failed to create HLS stream
3. OR Camera RTSP stream is not reachable

**To fix manually on Mini PC:**
```bash
# Check if process is running
ps aux | grep "d7d99961-6c65-4fda-b345-6fbbf08c0cb5"

# Restart camera
bash ~/clearpoint-scripts/camera-d7d99961-6c65-4fda-b345-6fbbf08c0cb5.sh

# Check logs
tail -f /var/log/syslog | grep ffmpeg
```

The system will also try to auto-restart it within 5-10 minutes.

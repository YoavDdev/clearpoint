# 🐛 FALSE RECOVERY BUG - Debugging Guide

## 🚨 **The Problem:**

Camera "מרפסת" has been **disconnected for 4 hours**, but the system sent a recovery email saying it's back online!

---

## ✅ **Fix Applied:**

Added **stricter validation** for camera recovery:

```typescript
// Now requires BOTH:
1. Health data < 2 minutes old (was 3 minutes)
2. connection_status !== 'disconnected'
```

This prevents false recovery emails from stale data.

---

## 🔍 **Root Cause Investigation:**

The bug happens because the system detects the camera as "online" when it shouldn't be.

### **Possible Causes:**

#### **1. Stale Health Data** (Most Likely)
The `camera_health` table has old data with recent timestamps
```sql
-- Check this in Supabase SQL Editor:
SELECT 
  c.name,
  c.id,
  ch.last_checked,
  ch.created_at,
  EXTRACT(EPOCH FROM (NOW() - ch.last_checked))/60 as minutes_since_check,
  ch.stream_status,
  ch.connection_status,
  ch.fps,
  ch.bitrate_kbps
FROM cameras c
LEFT JOIN LATERAL (
  SELECT * FROM camera_health 
  WHERE camera_id = c.id 
  ORDER BY created_at DESC 
  LIMIT 1
) ch ON true
WHERE c.name = 'מרפסת'
ORDER BY ch.created_at DESC;
```

**Expected Result (if working correctly):**
- `minutes_since_check` should be ~240 minutes (4 hours)
- `connection_status` should show disconnected

**If Bug:**
- `minutes_since_check` shows < 3 minutes
- Data is being falsely updated

#### **2. Mini PC Script Issue**
The health check script on the Mini PC might be:
- Caching old data
- Not properly detecting physical disconnects
- Using fallback/default values

**Location:** Mini PC runs a script that reports to the API

#### **3. API Endpoint Caching**
The `/api/camera-health/[id]` endpoint might be caching responses

---

## 🛠️ **Diagnostic Steps:**

### **Step 1: Check Database Directly**

Run this query in Supabase:
```sql
SELECT 
  name,
  last_checked,
  NOW() - last_checked as age,
  connection_status,
  stream_status,
  fps
FROM camera_health ch
JOIN cameras c ON c.id = ch.camera_id
WHERE c.name = 'מרפסת'
ORDER BY ch.created_at DESC
LIMIT 10;
```

Look for:
- ✅ Is `last_checked` actually 4 hours old?
- ✅ Is new health data being added?
- ✅ What's the `connection_status`?

### **Step 2: Check Monitoring Logs**

Look at the console logs when monitoring runs:
```bash
# In terminal where npm run dev is running
# Look for these messages:

⚠️ Camera מרפסת appears online but health data is not fresh enough (240.0 min old)
# ^ This is GOOD - means fix is working

✅ Camera מרפסת recovered after X minutes offline
# ^ This is BAD - means false recovery still happening
```

### **Step 3: Check Alert History**

In `/admin/notifications`:
- How many "offline" alerts for מרפסת?
- When were they created vs resolved?
- Are they being auto-resolved incorrectly?

### **Step 4: Check Mini PC Health Script**

The Mini PC runs a script to report health. Check if:
```bash
# On the Mini PC (if you have access)
# Find the health check script
ps aux | grep health
ps aux | grep status-check

# Check the script
cat /path/to/status-check.sh

# See recent executions
tail -f /var/log/camera-health.log  # or wherever logs are
```

---

## 🎯 **Expected Behavior:**

### **When Camera is Disconnected:**

```
Time 0:00 - Cable unplugged
Time 3:00 - Alert created: "לא דיווחה כבר 3 דקות"
Time 6:00 - Still offline
Time 9:00 - Still offline
Time 12:00 - Still offline (email sent if configured)
...
Time 4:00:00 - Still offline
```

**NO recovery email should be sent!**

### **When Camera is Reconnected:**

```
Time 4:01:00 - Cable plugged back in
Time 4:01:30 - Mini PC detects camera
Time 4:02:00 - Health data sent to API (fresh timestamp)
Time 4:03:00 - Monitor runs, sees fresh data (<2 min)
Time 4:03:01 - Recovery email sent ✅
```

---

## 🔧 **Temporary Workarounds:**

### **Option 1: Increase Recovery Threshold**
Change from 2 minutes to 1 minute:
```typescript
const isGenuineRecovery = minutesSinceCheck < 1 &&  // Even stricter
                           healthData.connection_status !== 'disconnected';
```

### **Option 2: Require Consecutive Checks**
Only send recovery after seeing 2+ fresh health checks:
```typescript
// Add a counter in system_alerts table
// Only send recovery after 2-3 consecutive online checks
```

### **Option 3: Manual Recovery Only**
Disable automatic recovery, require admin to click "Resolve" button

---

## 📊 **Data to Collect:**

When the bug happens again, collect:

1. **Database snapshot:**
   ```sql
   SELECT * FROM camera_health 
   WHERE camera_id = (SELECT id FROM cameras WHERE name = 'מרפסת')
   ORDER BY created_at DESC LIMIT 20;
   ```

2. **Alert history:**
   ```sql
   SELECT * FROM system_alerts 
   WHERE camera_name = 'מרפסת'
   ORDER BY created_at DESC LIMIT 10;
   ```

3. **Monitoring logs:**
   - Copy all console output from when bug occurred

4. **Current camera status:**
   - Screenshot of `/admin/diagnostics`
   - What does it show for מרפסת?

---

## 🎯 **Next Steps:**

1. ✅ **Fix Applied** - Stricter validation (< 2 min + status check)
2. 🔍 **Monitor** - Watch for false recoveries in next 24 hours
3. 📊 **Collect Data** - Run diagnostic queries above
4. 🛠️ **Deeper Fix** - Based on data, fix Mini PC script or API

---

## 📝 **Questions to Answer:**

- [ ] Is camera_health getting new records while disconnected?
- [ ] What does connection_status field show?
- [ ] Is the Mini PC script running correctly?
- [ ] Are there API caching issues?
- [ ] Is the monitoring interval correct?

---

## 🆘 **If Bug Continues:**

After applying the fix, if you still get false recovery emails:

1. **Run the SQL query** above and send results
2. **Check monitoring logs** for the warning message
3. **Check /admin/diagnostics** - what status does it show?
4. We may need to **disable auto-recovery** completely

---

**The fix is now active. Monitor for the next alert cycle to see if it prevents false recoveries! 🔍**

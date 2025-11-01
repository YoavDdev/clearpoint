# 🔧 Fixed: /admin/cameras Page Showing Wrong Status

## ❌ **Problem:**
The `/admin/cameras` page showed ALL cameras as "תקין" (healthy), even camera "מרפסת" which has `stream_status: "missing"`.

---

## 🔍 **Root Cause:**

The cameras page was only checking `is_stream_active` (a simple boolean field), **NOT** the actual real-time health data from `camera_health` table.

### **Old Code (Wrong):**
```typescript
// Only checked database field is_stream_active
{camera.is_stream_active ? "פעיל" : "לא פעיל"}
```

This field is **NOT reliable** because:
- It's a simple true/false flag
- Doesn't reflect actual stream health
- Not updated by status-check.sh script
- Can show "true" even when camera is broken

---

## ✅ **Solution:**

Now fetches **real-time health data** from `/api/camera-health` endpoint and checks actual stream status!

### **New Code (Correct):**
```typescript
// Fetch health data for each camera
useEffect(() => {
  const fetchHealthData = async () => {
    const healthPromises = cameras.map(async (camera) => {
      const res = await fetch(`/api/camera-health/${camera.id}`);
      const data = await res.json();
      return { id: camera.id, health: data };
    });
    
    const results = await Promise.all(healthPromises);
    setHealthData(results);
  };
  
  fetchHealthData();
  // Auto-refresh every 30 seconds
  const interval = setInterval(fetchHealthData, 30000);
  return () => clearInterval(interval);
}, [cameras]);

// Then display based on ACTUAL stream status:
if (!health.success) → "לא מקוון" (gray)
if (stream_status === "missing") → "שגיאה - זרם חסר" (red)
if (stream_status === "stale") → "שגיאה - זרם ישן" (orange)
if (stream_status === "error") → "שגיאה" (red)
if (last_checked > 60 min ago) → "לא מקוון" (gray)
else → "תקין" (green)
```

---

## 📊 **Status Display Logic:**

| Condition | Display | Color | Icon |
|-----------|---------|-------|------|
| No health data | לא מקוון | Gray | ⚠️ |
| stream_status: "missing" | שגיאה - זרם חסר | Red | ⚠️ |
| stream_status: "stale" | שגיאה - זרם ישן | Orange | ⚠️ |
| stream_status: "error" | שגיאה | Red | ⚠️ |
| Last check >60 min ago | לא מקוון | Gray | ⚠️ |
| stream_status: "ok" | תקין | Green | ✓ |

---

## 🔄 **Auto-Refresh:**

The page now **auto-refreshes health data every 30 seconds**, so you always see the current status!

---

## ✅ **Result:**

**Before Fix:**
- Camera "מרפסת": 🟢 תקין ❌ (WRONG!)
- Camera "חניה": 🟢 תקין ✅
- Camera "חצר": 🟢 תקין ✅
- Camera "כניסה": 🟢 תקין ✅

**After Fix:**
- Camera "מרפסת": 🔴 שגיאה - זרם חסר ✅ (CORRECT!)
- Camera "חניה": 🟢 תקין ✅
- Camera "חצר": 🟢 תקין ✅
- Camera "כניסה": 🟢 תקין ✅

---

## 🎯 **Now Both Admin Pages Show Correct Status:**

1. ✅ `/admin/cameras` - Uses real-time health data
2. ✅ `/admin/diagnostics` - Uses real-time health data

Both pages now fetch from `camera_health` table and show accurate status! 🎉

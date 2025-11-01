# 🐛 Camera Health False Recovery Bug - CONFIRMED

## 🎯 **The Bug:**

Camera "מרפסת" has been **physically disconnected (cable unplugged) for 4 hours**, but:
- ✅ System creates "offline" alerts correctly
- ❌ System auto-resolves them 3-4 minutes later (FALSE RECOVERY)
- ❌ Recovery emails sent even though camera still offline

## 📊 **Evidence:**

### **Alert Pattern:**
```
01:21:47 - Alert created: "לא דיווחה כבר 4 דקות"
01:26:02 - Alert AUTO-RESOLVED (falsely!)

01:28:32 - Alert created: "לא דיווחה כבר 4 דקות"  
01:31:45 - Alert AUTO-RESOLVED (falsely!)

01:33:15 - Alert created: "לא דיווחה כבר 3 דקות"
CURRENT  - Still unresolved (good!)
```

### **Health Data:**
- NO health records found initially
- But system keeps auto-resolving alerts
- This means health data IS being sent somehow

## 🔍 **Root Cause:**

The Mini PC health check script is reporting health data even when the camera is physically disconnected.

**Possible reasons:**
1. **Cached Data** - Using old/stale values
2. **Fallback Values** - Reporting default values when camera unreachable
3. **Detection Bug** - Not properly checking if camera is physically connected

## 🛠️ **Next Steps:**

### **1. Check What Health Data Is Actually Being Sent:**
```sql
SELECT 
  *,
  EXTRACT(EPOCH FROM (NOW() - last_checked))/60 as minutes_since_check
FROM camera_health
WHERE camera_id = 'd7d99961-6c65-4fda-b345-6fbbf08c0cb5'
ORDER BY created_at DESC
LIMIT 10;
```

Look for:
- Records around 01:26:02 and 01:31:45
- What values are in `stream_status`?
- Is `last_checked` being set to "now" or old timestamp?

### **2. Fix Mini PC Script:**

The script needs to:
- Actually check if camera is reachable (ping/network check)
- NOT report health if camera unreachable
- NOT use cached/fallback values

### **3. Add Better Validation in Monitor:**

Current validation:
```typescript
// Only checks if data is < 2 minutes old
const isGenuineRecovery = minutesSinceCheck < 2;
```

Should be:
```typescript
// Check multiple indicators
const isGenuineRecovery = 
  minutesSinceCheck < 2 &&
  healthData.stream_status === 'active' &&
  healthData.log_message !== 'error' &&
  // Add more checks based on what we find
```

## 📝 **Action Items:**

- [ ] Run query to see health data around resolution times
- [ ] Check what values are in stream_status field
- [ ] Review Mini PC health check script
- [ ] Add stricter validation for genuine recovery
- [ ] Clean up trailing spaces in camera names

## 🎯 **Expected Behavior:**

When camera physically disconnected:
1. ✅ Stop receiving health data
2. ✅ Create offline alert after timeout
3. ✅ Keep alert unresolved until ACTUAL reconnection
4. ❌ Do NOT auto-resolve based on stale/fake data

## 💡 **Temporary Workaround:**

Disable automatic recovery completely - require manual resolution via admin panel.

---

**Status:** Bug confirmed, investigating health data quality

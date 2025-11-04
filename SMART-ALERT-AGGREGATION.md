# Smart Alert Aggregation System

## Problem Solved
When Mini PC goes offline, you were getting **5 alerts**:
- ❌ 1 Mini PC offline alert (root cause)
- ❌ 4 camera offline alerts (symptoms)
- ❌ Result: Spam and confusion about what to fix

## New Smart System

### Alert Priority Hierarchy
```
Mini PC Offline (Critical - Root Cause)
    ↓ Suppresses ↓
4x Camera Offline Alerts (Symptoms)
```

### How It Works

#### 1. **Check Mini PC First**
Before processing cameras, system checks all Mini PCs:
- If Mini PC is offline → mark user in suppression list
- If Mini PC is online → process cameras normally

#### 2. **Smart Camera Suppression**
When camera is offline:
- ✅ Check: Is this user's Mini PC offline?
- If YES → **Suppress camera alert** (symptom, not root cause)
- If NO → Create camera alert normally (genuine camera issue)

#### 3. **Enhanced Mini PC Alerts**
Mini PC alerts now show affected cameras:
```
🚨 מיני PC clearpoint לא מחובר
   4 מצלמות מושפעות (כניסה, חצר, חניה, מרפסת)
```

### Before vs After

#### Before Smart Aggregation:
```
1. Mini PC clearpoint offline (627 min)     [CRITICAL]
2. Camera כניסה offline (627 min)           [CRITICAL]
3. Camera חצר offline (627 min)             [CRITICAL]
4. Camera חניה offline (627 min)            [CRITICAL]
5. Camera מרפסת offline (627 min)           [CRITICAL]

Result: 5 alerts, 5 emails (if not rate-limited)
```

#### After Smart Aggregation:
```
1. Mini PC clearpoint offline (627 min)     [CRITICAL]
   🚨 4 מצלמות מושפעות (כניסה, חצר, חניה, מרפסת)
   
   [Cameras 2-5 suppressed - not shown]

Result: 1 alert, 1 email ✨
```

## Benefits

### For Admin
- ✅ **Clear root cause** - see immediately that Mini PC is the problem
- ✅ **No alert spam** - only 1 alert instead of 5
- ✅ **Quick diagnosis** - know exactly which cameras are affected
- ✅ **Actionable** - fix Mini PC = all cameras back online

### For Customer
- ✅ **One notification** - not bombarded with emails
- ✅ **Clear message** - "your system is offline" not "4 cameras down"
- ✅ **Better UX** - professional, organized alerts

## Alert Examples

### Mini PC Offline (No Health Data)
```
Type: minipc_offline
Severity: critical
Message: 🚨 מיני PC clearpoint לא מחובר - 4 מצלמות מושפעות 
         (כניסה, חצר, חניה, מרפסת)
```

### Mini PC Offline (Stale Health Data)
```
Type: minipc_offline  
Severity: high
Message: 🚨 מיני PC clearpoint לא דיווח מזה 627 דקות - 
         4 מצלמות מושפעות (כניסה, חצר, חניה, מרפסת)
```

### Camera Offline (Independent Issue)
```
Type: camera_offline
Severity: critical
Message: מצלמה כניסה לא דיווחה על בריאותה כבר 45 דקות

Note: Only created if Mini PC is ONLINE (independent camera problem)
```

## Technical Implementation

### Detection Order
1. **First Pass**: Check all Mini PCs, build suppression list
2. **Second Pass**: Check cameras, suppress if Mini PC offline
3. **Alert Creation**: Only create non-suppressed alerts
4. **Email Sending**: Rate-limited (max 1 per hour per device)

### Suppression Logic
```typescript
// Check if user's Mini PC is offline
if (offlineMiniPcs.has(camera.user_id)) {
  console.log(`🔇 Suppressing camera alert - Mini PC offline (root cause)`);
  continue; // Skip camera alert
}
```

### Console Output
```
🔴 Mini PC clearpoint is OFFLINE for user יואב דריי פאי
   → will suppress individual camera alerts

🔇 Suppressing camera alert for כניסה - Mini PC offline (root cause)
🔇 Suppressing camera alert for חצר - Mini PC offline (root cause)
🔇 Suppressing camera alert for חניה - Mini PC offline (root cause)
🔇 Suppressing camera alert for מרפסת - Mini PC offline (root cause)
```

## Email Notifications

### Mini PC Offline
- ✅ **Sent immediately** when first detected
- ✅ **Rate limited** to 1 per hour
- ✅ **Shows affected cameras** in message
- ✅ **Critical severity** for better visibility

### Camera Offline (Independent)
- ✅ Only sent if Mini PC is online
- ✅ Rate limited to 1 per hour
- ✅ Indicates single camera issue

## What You'll See Now

### In Notifications Page:
```
Before:
- Mini PC clearpoint offline ❌
- Camera כניסה offline ❌
- Camera חצר offline ❌
- Camera חניה offline ❌
- Camera מרפסת offline ❌
Total: 5 alerts

After:
- Mini PC clearpoint offline (4 cameras affected) ✅
Total: 1 alert
```

### In Email:
```
Subject: 🚨 Critical Alert - Mini PC Offline

מיני PC clearpoint לא דיווח מזה 627 דקות
4 מצלמות מושפעות: כניסה, חצר, חניה, מרפסת

Customer: יואב דריי פאי
```

## Testing

### Scenario 1: Mini PC Goes Offline
1. Mini PC stops reporting
2. System detects Mini PC offline
3. ✅ Creates 1 Mini PC alert with camera list
4. ✅ Suppresses 4 camera alerts
5. ✅ Sends 1 email about Mini PC
6. Result: Clean, actionable alert

### Scenario 2: Single Camera Issue (Mini PC Online)
1. One camera stops working
2. Mini PC still reporting healthy
3. ✅ Creates 1 camera alert
4. ✅ Does NOT suppress (genuine issue)
5. ✅ Sends 1 email about camera
6. Result: Accurate problem identification

### Scenario 3: Mini PC Recovers
1. Mini PC comes back online
2. Cameras reconnect
3. ✅ Auto-resolves Mini PC alert
4. ✅ Auto-resolves camera alerts (if any)
5. ✅ Sends recovery notification
6. Result: Clean resolution

## Status
✅ **Implemented and Active**
- Smart suppression working
- Mini PC alerts enhanced
- Email notifications with rate limiting
- Console logging for debugging

## Next Deployment
The system will automatically use smart aggregation on next monitoring cycle (within 10 minutes).

#!/bin/bash

# === Detect user ID and Mini PC info ===
USER_ID=$(ls /mnt/ram-ts | head -n 1)
DEVICE_NAME=$(hostname)
LIVE_BASE="/mnt/ram-ts/${USER_ID}/live"

echo "🔍 Environment Detection:"
echo "  USER_ID: '$USER_ID'"
echo "  DEVICE_NAME: '$DEVICE_NAME'"
echo "  LIVE_BASE: '$LIVE_BASE'"
echo "  Directory exists: $([ -d "$LIVE_BASE" ] && echo 'YES' || echo 'NO')"

SUPABASE_URL=https://tphagljqhgjkavzokzbd.supabase.co
SUPABASE_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRwaGFnbGpxaGdqa2F2em9remJkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTc3MjgwNywiZXhwIjoyMDYxMzQ4ODA3fQ.Q9MO25qwMRDWMz4DXPr4XAc_owcjB0MnK71H2rCzC_Y

# === Get Mini PC ID ===
MINI_PC_ID=$(curl -s -X POST "$SUPABASE_URL/rest/v1/rpc/get_mini_pc_id" \
  -H "apikey: $SUPABASE_API_KEY" \
  -H "Authorization: Bearer $SUPABASE_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"p_user_id\": \"$USER_ID\", \"p_hostname\": \"$DEVICE_NAME\"}" | jq -r '.[0].mini_pc_id // empty')

if [[ -z "$MINI_PC_ID" ]]; then
  echo "❌ Could not find Mini PC ID for user $USER_ID"
  echo "🔍 Debug info:"
  echo "  USER_ID: '$USER_ID'"
  echo "  DEVICE_NAME: '$DEVICE_NAME'"
  echo "  Raw RPC response:"
  curl -s -X POST "$SUPABASE_URL/rest/v1/rpc/get_mini_pc_id" \
    -H "apikey: $SUPABASE_API_KEY" \
    -H "Authorization: Bearer $SUPABASE_API_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"p_user_id\": \"$USER_ID\", \"p_hostname\": \"$DEVICE_NAME\"}"
  exit 1
fi

# === MINI PC SYSTEM METRICS ===

# CPU Temperature
CPU_TEMP="null"
if command -v sensors >/dev/null 2>&1; then
  CPU_TEMP=$(sensors 2>/dev/null | grep -i "core 0\|cpu" | grep -oP '\+\K[0-9]+(?=\.[0-9]*°C)' | head -n1)
elif [[ -f /sys/class/thermal/thermal_zone0/temp ]]; then
  TEMP_MILLIC=$(cat /sys/class/thermal/thermal_zone0/temp 2>/dev/null)
  if [[ -n "$TEMP_MILLIC" && "$TEMP_MILLIC" -gt 0 ]]; then
    CPU_TEMP=$((TEMP_MILLIC / 1000))
  fi
elif command -v vcgencmd >/dev/null 2>&1; then
  CPU_TEMP=$(vcgencmd measure_temp 2>/dev/null | grep -oP '\K[0-9]+(?=\.[0-9]*)')
fi
[[ -z "$CPU_TEMP" || "$CPU_TEMP" == "" ]] && CPU_TEMP="null"

# CPU Usage
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | sed 's/%us,//')

# Memory Usage
MEM_INFO=$(free -m)
RAM_TOTAL=$(echo "$MEM_INFO" | awk 'NR==2{print $2}')
RAM_USED=$(echo "$MEM_INFO" | awk 'NR==2{print $3}')
RAM_USAGE_PCT=$(awk "BEGIN {printf \"%.2f\", ($RAM_USED/$RAM_TOTAL)*100}")

# Disk Usage
DISK_ROOT_INFO=$(df / | awk 'NR==2 {print $2,$3,$5}')
DISK_ROOT_TOTAL_KB=$(echo $DISK_ROOT_INFO | awk '{print $1}')
DISK_ROOT_USED_KB=$(echo $DISK_ROOT_INFO | awk '{print $2}')
DISK_ROOT_PCT=$(echo $DISK_ROOT_INFO | awk '{print $3}' | tr -d '%')
DISK_ROOT_TOTAL_GB=$((DISK_ROOT_TOTAL_KB / 1024 / 1024))
DISK_ROOT_USED_GB=$((DISK_ROOT_USED_KB / 1024 / 1024))

DISK_RAM_INFO=$(df /mnt/ram-ts | awk 'NR==2 {print $2,$3,$5}')
DISK_RAM_TOTAL_KB=$(echo $DISK_RAM_INFO | awk '{print $1}')
DISK_RAM_USED_KB=$(echo $DISK_RAM_INFO | awk '{print $2}')
DISK_RAM_PCT=$(echo $DISK_RAM_INFO | awk '{print $3}' | tr -d '%')
DISK_RAM_TOTAL_GB=$((DISK_RAM_TOTAL_KB / 1024 / 1024))
DISK_RAM_USED_GB=$((DISK_RAM_USED_KB / 1024 / 1024))

# Load Average
LOAD_AVG=$(uptime | awk -F'load average:' '{print $2}' | sed 's/^ *//')
LOAD_1MIN=$(echo $LOAD_AVG | awk -F, '{print $1}' | tr -d ' ')
LOAD_5MIN=$(echo $LOAD_AVG | awk -F, '{print $2}' | tr -d ' ')
LOAD_15MIN=$(echo $LOAD_AVG | awk -F, '{print $3}' | tr -d ' ')

# Uptime
UPTIME_SEC=$(awk '{print int($1)}' /proc/uptime)

# Process Count
PROCESS_COUNT=$(ps aux | wc -l)

# Network Tests
INTERNET_CONNECTED="false"
PING_GATEWAY_MS="null"
PING_INTERNET_MS="null"

# Test gateway ping
GATEWAY=$(ip route | grep default | awk '{print $3}' | head -n1)
if [[ -n "$GATEWAY" ]]; then
  PING_GATEWAY_MS=$(ping -c 1 -W 2 "$GATEWAY" 2>/dev/null | grep 'time=' | awk -F'time=' '{print $2}' | awk '{print int($1)}')
fi

# Test internet ping
PING_INTERNET_MS=$(ping -c 1 -W 3 8.8.8.8 2>/dev/null | grep 'time=' | awk -F'time=' '{print $2}' | awk '{print int($1)}')
if [[ -n "$PING_INTERNET_MS" ]]; then
  INTERNET_CONNECTED="true"
fi

# File counts
TOTAL_VIDEO_FILES=$(find ~/clearpoint-recordings -name "*.mp4" 2>/dev/null | wc -l)

# Overall Mini PC Status
MINI_PC_STATUS="healthy"
if [[ "$CPU_TEMP" != "null" && "$CPU_TEMP" -gt 80 ]]; then
  MINI_PC_STATUS="critical"
elif [[ "$DISK_ROOT_PCT" -gt 90 || "$RAM_USAGE_PCT" > 90 ]]; then
  MINI_PC_STATUS="critical"
elif [[ "$INTERNET_CONNECTED" == "false" ]]; then
  MINI_PC_STATUS="warning"
elif [[ "$CPU_TEMP" != "null" && "$CPU_TEMP" -gt 70 ]] || [[ "$DISK_ROOT_PCT" -gt 75 ]]; then
  MINI_PC_STATUS="warning"
fi

# === Retry Config ===
MAX_RETRIES=3
WINDOW_MINUTES=10
RETRY_DIR="/tmp/clearpoint-restarts"
mkdir -p "$RETRY_DIR"

# === Report Mini PC Health to Supabase (PATCH) ===
curl -s -X PATCH "$SUPABASE_URL/rest/v1/mini_pc_health?mini_pc_id=eq.$MINI_PC_ID" \
  -H "apikey: $SUPABASE_API_KEY" \
  -H "Authorization: Bearer $SUPABASE_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=minimal" \
  -d "{
    \"cpu_temp_celsius\": $CPU_TEMP,
    \"cpu_usage_pct\": $CPU_USAGE,
    \"ram_total_mb\": $RAM_TOTAL,
    \"ram_used_mb\": $RAM_USED,
    \"ram_usage_pct\": $RAM_USAGE_PCT,
    \"disk_root_total_gb\": $DISK_ROOT_TOTAL_GB,
    \"disk_root_used_gb\": $DISK_ROOT_USED_GB,
    \"disk_root_pct\": $DISK_ROOT_PCT,
    \"disk_ram_total_gb\": $DISK_RAM_TOTAL_GB,
    \"disk_ram_used_gb\": $DISK_RAM_USED_GB,
    \"disk_ram_pct\": $DISK_RAM_PCT,
    \"load_avg_1min\": $LOAD_1MIN,
    \"load_avg_5min\": $LOAD_5MIN,
    \"load_avg_15min\": $LOAD_15MIN,
    \"uptime_seconds\": $UPTIME_SEC,
    \"process_count\": $PROCESS_COUNT,
    \"internet_connected\": $INTERNET_CONNECTED,
    \"ping_gateway_ms\": $PING_GATEWAY_MS,
    \"ping_internet_ms\": $PING_INTERNET_MS,
    \"total_video_files\": $TOTAL_VIDEO_FILES,
    \"overall_status\": \"$MINI_PC_STATUS\",
    \"last_checked\": \"$(date -Is)\",
    \"log_message\": \"Mini PC: $MINI_PC_STATUS, CPU: ${CPU_TEMP}°C, RAM: ${RAM_USAGE_PCT}%, Disk: ${DISK_ROOT_PCT}%\"
  }" > /dev/null

echo "📊 Mini PC health reported: $MINI_PC_STATUS"

# === Get camera mappings from database ===
echo "🔍 Getting camera mappings for Mini PC: $MINI_PC_ID"
CAMERA_MAPPINGS=$(curl -s -X GET "$SUPABASE_URL/rest/v1/cameras?mini_pc_id=eq.$MINI_PC_ID&select=id,name" \
  -H "apikey: $SUPABASE_API_KEY" \
  -H "Authorization: Bearer $SUPABASE_API_KEY")

echo "📋 Camera mappings response: $CAMERA_MAPPINGS"

# === Loop over each camera for individual health ===
echo "📁 Checking live base directory: $LIVE_BASE"
CAMERA_DIRS=$(ls "$LIVE_BASE" 2>/dev/null || echo "")
echo "📂 Found camera directories: $CAMERA_DIRS"

for CAMERA_DIR in $CAMERA_DIRS; do
  echo "🎥 Processing camera directory: $CAMERA_DIR"
  
  # Camera directory IS the UUID, so use it directly
  CAMERA_UUID="$CAMERA_DIR"
  
  # Verify this UUID exists in our camera mappings
  CAMERA_EXISTS=$(echo "$CAMERA_MAPPINGS" | jq -r ".[] | select(.id==\"$CAMERA_UUID\") | .id" 2>/dev/null)
  echo "🆔 Camera UUID: $CAMERA_UUID"
  echo "✅ Camera exists in DB: $([ -n "$CAMERA_EXISTS" ] && echo "YES" || echo "NO")"
  
  if [[ -z "$CAMERA_EXISTS" || "$CAMERA_EXISTS" == "null" ]]; then
    echo "⚠️  Camera UUID $CAMERA_UUID not found in database"
    continue
  fi
  
  M3U8="$LIVE_BASE/$CAMERA_DIR/stream.m3u8"
  STREAM_STATUS="ok"
  CAMERA_MESSAGE="Healthy"
  SHOULD_RESTART=0
  M3U8_AGE_SEC=0

  if [[ ! -f "$M3U8" ]]; then
    STREAM_STATUS="missing"
    CAMERA_MESSAGE="No m3u8 file"
    SHOULD_RESTART=1
  else
    M3U8_AGE_SEC=$(($(date +%s) - $(date -r "$M3U8" +%s)))
    if [[ $M3U8_AGE_SEC -gt 60 ]]; then
      STREAM_STATUS="stale"
      CAMERA_MESSAGE="Stream stale (${M3U8_AGE_SEC}s)"
      SHOULD_RESTART=1
    fi
  fi

  # Count segments
  SEGMENT_COUNT=0
  if [[ -f "$M3U8" ]]; then
    SEGMENT_COUNT=$(grep -c "\.ts" "$M3U8" 2>/dev/null || echo 0)
  fi

  # Get last segment size
  LAST_SEGMENT_SIZE_KB=0
  LAST_SEGMENT=$(ls -t "$LIVE_BASE/$CAMERA_DIR"/*.ts 2>/dev/null | head -n1)
  if [[ -n "$LAST_SEGMENT" && -f "$LAST_SEGMENT" ]]; then
    LAST_SEGMENT_SIZE_KB=$(($(stat -f%z "$LAST_SEGMENT" 2>/dev/null || stat -c%s "$LAST_SEGMENT" 2>/dev/null || echo 0) / 1024))
  fi

  # === Retry Tracking ===
  RETRY_FILE="${RETRY_DIR}/${CAMERA_DIR}.log"
  NOW=$(date +%s)

  # Purge old retry file if outside the window
  if [[ -f "$RETRY_FILE" ]]; then
    FIRST_TS=$(head -n 1 "$RETRY_FILE")
    if [[ $((NOW - FIRST_TS)) -gt $((60 * WINDOW_MINUTES)) ]]; then
      rm -f "$RETRY_FILE"
    fi
  fi

  if [[ $SHOULD_RESTART -eq 1 ]]; then
    COUNT=0

    if [[ -f "$RETRY_FILE" ]]; then
      COUNT=$(wc -l < "$RETRY_FILE")
    fi

    if [[ $COUNT -lt $MAX_RETRIES ]]; then
      # Check if we just restarted recently (prevent rapid restarts)
      LAST_RESTART_FILE="${RETRY_DIR}/${CAMERA_DIR}_last_restart"
      if [[ -f "$LAST_RESTART_FILE" ]]; then
        LAST_RESTART=$(cat "$LAST_RESTART_FILE")
        TIME_SINCE_RESTART=$((NOW - LAST_RESTART))
        if [[ $TIME_SINCE_RESTART -lt 300 ]]; then  # 5 minutes cooldown
          echo "⏳ Camera $CAMERA_DIR restarted recently ($TIME_SINCE_RESTART sec ago) — waiting..."
          continue
        fi
      fi

      echo "$NOW" >> "$RETRY_FILE"
      echo "$NOW" > "$LAST_RESTART_FILE"
      echo "🔁 Restarting camera: $CAMERA_DIR ($STREAM_STATUS)..."
      
      # Force kill all related processes
      pkill -9 -f "camera-${CAMERA_DIR}.sh"
      pkill -9 -f "ffmpeg.*${CAMERA_DIR}"
      sleep 5  # Wait for processes to fully terminate
      
      # Start new camera process
      bash ~/clearpoint-scripts/camera-${CAMERA_DIR}.sh &
      echo "✅ Camera $CAMERA_DIR restart initiated"
    else
      echo "⏳ Retry limit reached for $CAMERA_DIR — skipping restart"
      
      # Check if we already sent failure notification for this camera
      FAILURE_NOTIFIED_FILE="${RETRY_DIR}/${CAMERA_DIR}_failure_notified"
      if [[ ! -f "$FAILURE_NOTIFIED_FILE" ]]; then
        echo "📧 Sending permanent failure notification for camera $CAMERA_DIR..."
        
        # Get camera name from database
        CAMERA_NAME=$(echo "$CAMERA_MAPPINGS" | jq -r ".[] | select(.id==\"$CAMERA_UUID\") | .name" 2>/dev/null)
        [[ -z "$CAMERA_NAME" || "$CAMERA_NAME" == "null" ]] && CAMERA_NAME="Unknown Camera"
        
        # Send email notification via Clearpoint API
        curl -s -X POST "https://clearpoint.co.il/api/admin/notifications" \
          -H "Content-Type: application/json" \
          -d "{
            \"type\": \"camera_failure\",
            \"title\": \"Camera Permanently Offline\",
            \"message\": \"Camera '$CAMERA_NAME' (ID: $CAMERA_UUID) has failed permanently after $MAX_RETRIES restart attempts. Manual intervention required.\",
            \"severity\": \"critical\",
            \"camera_id\": \"$CAMERA_UUID\",
            \"mini_pc_id\": \"$MINI_PC_ID\"
          }" > /dev/null
        
        # Mark as notified to prevent spam
        echo "$NOW" > "$FAILURE_NOTIFIED_FILE"
        echo "✅ Failure notification sent for camera $CAMERA_NAME"
      fi
    fi
  fi

  # === Report Camera Health to Supabase ===
  echo "📤 Reporting camera health to Supabase..."
  echo "   Camera ID: $CAMERA_UUID"
  echo "   Mini PC ID: $MINI_PC_ID" 
  echo "   Status: $STREAM_STATUS"
  echo "   Message: $CAMERA_MESSAGE"
  
  # Try to update existing record (PATCH always works for existing records)
  RESPONSE=$(curl -s -X PATCH "$SUPABASE_URL/rest/v1/camera_health?camera_id=eq.$CAMERA_UUID" \
    -H "apikey: $SUPABASE_API_KEY" \
    -H "Authorization: Bearer $SUPABASE_API_KEY" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=minimal" \
    -d "{
      \"mini_pc_id\": \"$MINI_PC_ID\",
      \"stream_status\": \"$STREAM_STATUS\",
      \"last_checked\": \"$(date -Is)\",
      \"log_message\": \"$CAMERA_MESSAGE\"
    }")
  
  echo "📥 Supabase response: $RESPONSE"

  echo "📹 Camera $CAMERA_DIR health: $STREAM_STATUS"
done

echo "✅ Health monitoring complete"

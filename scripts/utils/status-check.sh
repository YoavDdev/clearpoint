#!/bin/bash

# === Detect user ID ===
USER_ID=$(ls /mnt/ram-ts | head -n 1)
DEVICE_NAME=$(hostname)
LIVE_BASE="/mnt/ram-ts/${USER_ID}/live"

SUPABASE_URL=https://tphagljqhgjkavzokzbd.supabase.co
SUPABASE_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRwaGFnbGpxaGdqa2F2em9remJkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTc3MjgwNywiZXhwIjoyMDYxMzQ4ODA3fQ.Q9MO25qwMRDWMz4DXPr4XAc_owcjB0MnK71H2rCzC_Y

# === Disk usage ===
DISK_ROOT=$(df / | awk 'END{print $5}' | tr -d '%')
DISK_RAM=$(df /mnt/ram-ts | awk 'END{print $5}' | tr -d '%')

# === Retry Config ===
MAX_RETRIES=3
WINDOW_MINUTES=10
RETRY_DIR="/tmp/clearpoint-restarts"
mkdir -p "$RETRY_DIR"

# === Loop over each camera ===
for CAMERA_ID in $(ls "$LIVE_BASE"); do
  M3U8="$LIVE_BASE/$CAMERA_ID/stream.m3u8"
  STATUS="OK"
  MESSAGE="Healthy"
  SHOULD_RESTART=0

  if [[ ! -f "$M3U8" ]]; then
    STATUS="MISSING"
    MESSAGE="No m3u8"
    SHOULD_RESTART=1
  else
    AGE=$(($(date +%s) - $(date -r "$M3U8" +%s)))
    if [[ $AGE -gt 60 ]]; then
      STATUS="STALE"
      MESSAGE="Stream stale ($AGE sec)"
      SHOULD_RESTART=1
    fi
  fi

  # === Retry Tracking ===
  RETRY_FILE="${RETRY_DIR}/${CAMERA_ID}.log"
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
      echo "$NOW" >> "$RETRY_FILE"
      echo "🔁 Restarting camera: $CAMERA_ID ($STATUS)..."
      pkill -f "camera-${CAMERA_ID}.sh"
      bash ~/clearpoint-scripts/camera-${CAMERA_ID}.sh &
    else
      echo "⏳ Retry limit reached for $CAMERA_ID — skipping restart"
    fi
  fi

  # === Report to Supabase ===
  curl -s -X POST "$SUPABASE_URL/rest/v1/device_health" \
    -H "apikey: $SUPABASE_API_KEY" \
    -H "Authorization: Bearer $SUPABASE_API_KEY" \
    -H "Content-Type: application/json" \
    -H "Prefer: resolution=merge-duplicates" \
    -d "{
      \"user_id\": \"$USER_ID\",
      \"device_name\": \"$DEVICE_NAME\",
      \"camera_id\": \"$CAMERA_ID\",
      \"stream_status\": \"$STATUS\",
      \"disk_root_pct\": $DISK_ROOT,
      \"disk_ram_pct\": $DISK_RAM,
      \"last_checked\": \"$(date -Is)\",
      \"log_message\": \"$MESSAGE\"
    }" > /dev/null
done

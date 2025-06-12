#!/bin/bash

LOG_DIR=~/clearpoint-logs
LOG_FILE="$LOG_DIR/health.log"
mkdir -p "$LOG_DIR"

NOW=$(date '+%Y-%m-%d %H:%M:%S')
echo "🩺 Running Clearpoint System Health Check at $NOW" | tee -a "$LOG_FILE"
echo "------------------------------------------" | tee -a "$LOG_FILE"

# 1. Check cloudflared service
echo "📡 Cloudflared status:" | tee -a "$LOG_FILE"
systemctl is-active cloudflared && echo "✅ cloudflared is running" | tee -a "$LOG_FILE" || echo "❌ cloudflared NOT running" | tee -a "$LOG_FILE"
echo | tee -a "$LOG_FILE"

# 2. Check port 8080 is listening
echo "🔌 Checking if Express server is listening on port 8080..." | tee -a "$LOG_FILE"
PORT_CHECK=$(ss -tuln | grep ':8080')
if [ -n "$PORT_CHECK" ]; then
  echo "✅ Port 8080 is active" | tee -a "$LOG_FILE"
else
  echo "❌ Port 8080 not open — Express may not be running" | tee -a "$LOG_FILE"
fi
echo | tee -a "$LOG_FILE"

# 3. Check if any .m3u8 stream is served
echo "📺 Checking for stale .m3u8 streams..." | tee -a "$LOG_FILE"
LIVE_DIR="/mnt/ram-ts"
M3U8_FILES=$(find $LIVE_DIR -name "stream.m3u8")

if [ -z "$M3U8_FILES" ]; then
  echo "❌ No .m3u8 files found in $LIVE_DIR" | tee -a "$LOG_FILE"
else
  for m3u8 in $M3U8_FILES; do
    CAMERA_ID=$(basename $(dirname "$m3u8"))
    AGE=$(($(date +%s) - $(stat -c %Y "$m3u8")))
    if [ "$AGE" -gt 60 ]; then
      echo "⚠️ $CAMERA_ID stream stale ($AGE sec old) – restarting service..." | tee -a "$LOG_FILE"
      sudo systemctl restart camera-$CAMERA_ID.service
      echo "🔁 Restarted camera-$CAMERA_ID.service" | tee -a "$LOG_FILE"
    else
      echo "✅ $CAMERA_ID stream fresh ($AGE sec old)" | tee -a "$LOG_FILE"
    fi
  done
fi

echo | tee -a "$LOG_FILE"

# 4. CORS header check
echo "🌐 Testing CORS headers from Express server..." | tee -a "$LOG_FILE"
CORS=$(curl -s -I http://localhost:8080 | grep -i "Access-Control-Allow-Origin")
if [ -n "$CORS" ]; then
  echo "✅ CORS headers OK: $CORS" | tee -a "$LOG_FILE"
else
  echo "❌ Missing CORS headers — check live-server.js" | tee -a "$LOG_FILE"
fi

echo | tee -a "$LOG_FILE"

# 5. Show last footage upload time
echo "📤 Last VOD upload timestamp:" | tee -a "$LOG_FILE"
if [ -f ~/vod-upload-log.txt ]; then
  tail -n 10 ~/vod-upload-log.txt | grep "✅ Uploaded" | tail -n 1 | tee -a "$LOG_FILE"
else
  echo "⚠️ No vod-upload-log.txt found" | tee -a "$LOG_FILE"
fi

echo "✅ Done." | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"
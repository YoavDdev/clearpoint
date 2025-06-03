#!/bin/bash

echo "🚀 Starting Clearpoint cameras..."

# === Detect user_id dynamically ===
USER_ID_DIR=$(find ~/clearpoint-recordings -mindepth 1 -maxdepth 1 -type d | head -n 1)
if [[ -z "$USER_ID_DIR" ]]; then
  echo "❌ ERROR: No user directory found in ~/clearpoint-recordings"
  exit 1
fi

LIVE_ROOT="$USER_ID_DIR/live"
SCRIPT_DIR=~/clearpoint-scripts

echo "📁 Using live folder: $LIVE_ROOT"

# === Start all camera scripts ===
for script in "$SCRIPT_DIR"/camera-*.sh; do
  if [[ -f "$script" ]]; then
    echo "▶️ Running $script..."
    chmod +x "$script"
    bash "$script" &
  fi
done

# === Start HTTP server for all cameras ===
echo "🌐 Starting HTTP server on port 8080..."
sudo fuser -k 8080/tcp > /dev/null 2>&1

http-server "$USER_ID_DIR/live" -p 8080 --cors -c-1 \
  -H "Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate" \
  > /dev/null 2>&1 &

echo "✅ All cameras and server started!"

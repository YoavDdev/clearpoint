#!/bin/bash

echo "🚀 Starting Clearpoint cameras..."

# === Detect user folder ===
USER_ID_DIR=$(find ~/clearpoint-recordings -mindepth 1 -maxdepth 1 -type d | head -n 1)
if [[ -z "$USER_ID_DIR" ]]; then
  echo "❌ ERROR: No user folder found in ~/clearpoint-recordings"
  exit 1
fi

LIVE_ROOT="$USER_ID_DIR/live"
SCRIPT_DIR=~/clearpoint-scripts

echo "📂 Live folder: $LIVE_ROOT"

# === Start camera scripts ===
for script in "$SCRIPT_DIR"/camera-*.sh; do
  if [[ -f "$script" ]]; then
    echo "▶️ Running $script..."
    chmod +x "$script"
    bash "$script" &
        sleep 2  # delay between scripts
  fi
done

# === Start HTTP server on port 8080 ===
echo "🌐 Launching HTTP server..."
sudo fuser -k 8080/tcp > /dev/null 2>&1

HTTP_SERVER_BIN="/usr/local/bin/http-server"

"$HTTP_SERVER_BIN" "$LIVE_ROOT" -p 8080 --cors -c-1 \
  -H "Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate" \
  > ~/http-server-log.txt 2>&1 &


echo "✅ All cameras and HTTP server are running!"

#!/bin/bash

echo "🚀 Starting Clearpoint cameras..."

# === Detect user folder ===
USER_ID_DIR=$(find ~/clearpoint-recordings -mindepth 1 -maxdepth 1 -type d | head -n 1)
if [[ -z "$USER_ID_DIR" ]]; then
  echo "❌ ERROR: No user folder found in ~/clearpoint-recordings"
  exit 1
fi

USER_ID=$(basename "$USER_ID_DIR")
LIVE_ROOT="/mnt/ram-ts"
SCRIPT_DIR=~/clearpoint-scripts

echo "📂 Serving live from: $LIVE_ROOT/$USER_ID/live"

# === Start camera scripts ===
for script in "$SCRIPT_DIR"/camera-*.sh; do
  if [[ -f "$script" ]]; then
    echo "▶️ Running $script..."
    chmod +x "$script"
    bash "$script" &
    sleep 2
  fi
done

# === Kill any old Express servers ===
echo "🧹 Cleaning up old Express servers..."
pkill -f "node live-server.js"

# === Start Express server ===
echo "🌐 Launching Express live stream server..."
cd ~
LIVE_DIR="$LIVE_ROOT/$USER_ID/live"
NODE_ENV=production USER_ID="$USER_ID" node live-server.js "$LIVE_DIR" > ~/express-server-log.txt 2>&1 &

echo "✅ All cameras and Express server are running!"

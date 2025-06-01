#!/bin/bash

echo "🛠️  Clearpoint System Status Check"

# === Detect User Folder ===
USER_DIR=$(find ~/clearpoint-recordings -mindepth 1 -maxdepth 1 -type d | head -n 1)
if [[ -z "$USER_DIR" ]]; then
  echo "❌ No user folder found in ~/clearpoint-recordings"
  exit 1
fi

echo "📁 Detected user: $USER_DIR"
CAMERA_IDS=$(ls "$USER_DIR/live")

# === Check Camera Status ===
for CAMERA_ID in $CAMERA_IDS; do
  echo ""
  echo "🎥 Camera ID: $CAMERA_ID"

  # Check VOD process
  if pgrep -fa "ffmpeg.*$CAMERA_ID.*segment" > /dev/null; then
    echo "✅ VOD recording is running"
  else
    echo "❌ VOD recording NOT running"
  fi

  # Check Live stream process
  if pgrep -fa "ffmpeg.*$CAMERA_ID.*hls" > /dev/null; then
    echo "✅ Live streaming is running"
  else
    echo "❌ Live streaming NOT running"
  fi

  # Check latest VOD file
  LATEST_MP4=$(find "$USER_DIR/footage/$CAMERA_ID" -name "*.mp4" | tail -n 1)
  if [[ -f "$LATEST_MP4" ]]; then
    echo "📦 Latest VOD file: $(basename "$LATEST_MP4")"
  else
    echo "❌ No .mp4 files found"
  fi

  # Check .m3u8 exists
  if [[ -f "$USER_DIR/live/$CAMERA_ID/stream.m3u8" ]]; then
    echo "📡 stream.m3u8 exists"
  else
    echo "❌ stream.m3u8 missing"
  fi

  # Check latest .ts segment freshness
  LATEST_TS=$(find "$USER_DIR/live/$CAMERA_ID" -name "stream-*.ts" -type f -printf "%T@ %p\n" 2>/dev/null | sort -n | tail -n 1 | cut -d' ' -f2-)
  if [[ -f "$LATEST_TS" ]]; then
    TS_MODIFIED=$(stat -c %Y "$LATEST_TS")
    NOW=$(date +%s)
    TS_AGE_MIN=$(( (NOW - TS_MODIFIED) / 60 ))

    echo "🎞️  Latest .ts segment: $(basename "$LATEST_TS")"
    if [[ $TS_AGE_MIN -lt 5 ]]; then
      echo "✅ Live stream segments are fresh"
    else
      echo "⚠️  Live stream segments are old ($TS_AGE_MIN min ago)"
    fi
  else
    echo "❌ No .ts segments found"
  fi
done

# === Check HTTP Server ===
echo ""
echo "🌐 Checking HTTP server on port 8080..."
if lsof -i :8080 | grep LISTEN > /dev/null; then
  echo "✅ HTTP server is listening on port 8080"
else
  echo "❌ HTTP server NOT running"
fi

# === Check Cloudflare Tunnel ===
echo ""
echo "☁️  Checking Cloudflare Tunnel..."
TUNNEL_PROC=$(pgrep -fa "cloudflared tunnel run")
if [[ -n "$TUNNEL_PROC" ]]; then
  echo "✅ Cloudflare Tunnel is running:"
  echo "   $TUNNEL_PROC"
  if echo "$TUNNEL_PROC" | grep -oP 'run\s+\K[\w.-]+' > /dev/null; then
    TUNNEL_NAME=$(echo "$TUNNEL_PROC" | grep -oP 'run\s+\K[\w.-]+')
    echo "🌐 Tunnel Name: $TUNNEL_NAME"
    echo "🔗 Example URL: https://$TUNNEL_NAME.clearpoint.co.il"
  fi
else
  echo "❌ Cloudflare Tunnel is NOT running"
fi

# === Check VOD Upload Script ===
echo ""
echo "📤 Checking VOD upload process (uploadVods.ts)..."
if pgrep -fa "ts-node.*uploadVods.ts" > /dev/null; then
  echo "✅ uploadVods.ts is currently running"
else
  echo "ℹ️  uploadVods.ts is NOT running now"
fi

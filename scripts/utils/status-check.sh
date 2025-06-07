#!/bin/bash

echo "🩺 Running Clearpoint System Health Check..."
echo "------------------------------------------"

# 1. Check cloudflared service
echo "📡 Cloudflared status:"
systemctl is-active cloudflared && echo "✅ cloudflared is running" || echo "❌ cloudflared NOT running"
echo

# 2. Check port 8080 is listening
echo "🔌 Checking if Express server is listening on port 8080..."
PORT_CHECK=$(ss -tuln | grep ':8080')
if [ -n "$PORT_CHECK" ]; then
  echo "✅ Port 8080 is active"
else
  echo "❌ Port 8080 not open — Express may not be running"
fi
echo

# 3. Check if any .m3u8 stream is served
echo "📺 Checking for active .m3u8 stream..."
LIVE_DIR="/mnt/ram-ts"
M3U8_FOUND=$(find $LIVE_DIR -name "*.m3u8" | head -n 1)
if [ -n "$M3U8_FOUND" ]; then
  echo "✅ Found stream: $M3U8_FOUND"
else
  echo "❌ No .m3u8 files found in $LIVE_DIR"
fi
echo

# 4. CORS header check
echo "🌐 Testing CORS headers from Express server..."
CORS=$(curl -s -I http://localhost:8080 | grep -i "Access-Control-Allow-Origin")
if [ -n "$CORS" ]; then
  echo "✅ CORS headers OK: $CORS"
else
  echo "❌ Missing CORS headers — check live-server.js"
fi
echo

# 5. Show last footage upload time
echo "📤 Last VOD upload timestamp:"
if [ -f ~/vod-upload-log.txt ]; then
  tail -n 10 ~/vod-upload-log.txt | grep "✅ Uploaded" | tail -n 1
else
  echo "⚠️ No vod-upload-log.txt found"
fi

echo
echo "✅ Done."

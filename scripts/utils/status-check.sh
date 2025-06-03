#!/bin/bash

echo "🎯 Clearpoint System Check"

# 1. HTTP Server
echo -e "\n🌐 HTTP Server (port 8080):"
lsof -i :8080 || echo "❌ http-server not running"

# 2. FFmpeg
echo -e "\n🎥 FFmpeg Processes:"
pgrep -a ffmpeg || echo "❌ No ffmpeg processes running"

# 3. Cloudflare
echo -e "\n☁️ Cloudflare Tunnel:"
systemctl is-active cloudflared && echo "✅ cloudflared is running" || echo "❌ cloudflared is NOT running"

# 4. VOD Upload CRON
echo -e "\n⏱️ VOD Upload CRON:"
crontab -l | grep uploadVods.ts || echo "❌ CRON for VOD upload not set"

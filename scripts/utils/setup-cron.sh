#!/bin/bash

echo "🔁 Setting up Clearpoint CRON jobs..."

UPLOAD_LINE="*/20 * * * * cd ~/clearpoint-core && /usr/local/bin/ts-node uploadVods.ts >> ~/vod-upload-log.txt 2>&1"
REBOOT_LINE="@reboot sleep 45 && bash ~/start-clearpoint.sh"
EXPRESS_LINE="@reboot sleep 60 && node ~/live-server.js >> ~/express-log.txt 2>&1"

# === Get existing CRON (safe fallback if none) ===
CRON_TEMP=$(mktemp)
crontab -l 2>/dev/null > "$CRON_TEMP" || true

# === Remove any previous lines to avoid duplicates ===
sed -i '/uploadVods\.ts/ d' "$CRON_TEMP"
sed -i '/start-clearpoint\.sh/ d' "$CRON_TEMP"
sed -i '/live-server\.js/ d' "$CRON_TEMP"

# === Add lines ===
echo "$UPLOAD_LINE" >> "$CRON_TEMP"
echo "$REBOOT_LINE" >> "$CRON_TEMP"
echo "$EXPRESS_LINE" >> "$CRON_TEMP"

echo "✅ Added CRON: uploadVods.ts every 20 min"
echo "✅ Added CRON: start-clearpoint.sh on reboot"
echo "✅ Added CRON: Express live-server.js on reboot"

# === Install updated CRON ===
crontab "$CRON_TEMP"
rm "$CRON_TEMP"

echo "🎯 CRON setup complete. You can run 'crontab -l' to confirm."

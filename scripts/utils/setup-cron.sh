#!/bin/bash

echo "🔁 Setting up Clearpoint CRON jobs..."

UPLOAD_LINE="*/5 * * * * cd ~/clearpoint-core && /usr/local/bin/ts-node uploadVods.ts >> ~/vod-upload-log.txt 2>&1"
REBOOT_LINE="@reboot sleep 45 && bash ~/start-clearpoint.sh"

# === Get existing CRON (safe fallback if none) ===
CRON_TEMP=$(mktemp)
crontab -l 2>/dev/null > "$CRON_TEMP" || true

# === Add uploadVods.ts CRON if missing ===
if ! grep -Fxq "$UPLOAD_LINE" "$CRON_TEMP"; then
  echo "$UPLOAD_LINE" >> "$CRON_TEMP"
  echo "✅ Added CRON: uploadVods.ts every 5 min"
else
  echo "ℹ️ CRON for uploadVods.ts already exists"
fi

# === Add start-clearpoint.sh on reboot if missing ===
if ! grep -Fxq "$REBOOT_LINE" "$CRON_TEMP"; then
  echo "$REBOOT_LINE" >> "$CRON_TEMP"
  echo "✅ Added CRON: start-clearpoint.sh on reboot"
else
  echo "ℹ️ CRON for start-clearpoint.sh already exists"
fi

# === Install updated CRON ===
crontab "$CRON_TEMP"
rm "$CRON_TEMP"

echo "🎯 CRON setup complete. You can run 'crontab -l' to confirm."

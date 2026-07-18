#!/bin/bash
#
# Clearpoint Daily Maintenance Script
# Runs once per day (via cron) to keep the Mini-PC healthy.
# - Cleans old temp files
# - Clears journal logs older than 3 days
# - Reports memory state
# - Optionally reboots if uptime > 7 days and load is critical
#

LOG_DIR=~/clearpoint-logs
LOG_FILE="$LOG_DIR/maintenance.log"
mkdir -p "$LOG_DIR"

NOW=$(date '+%Y-%m-%d %H:%M:%S')
echo "🧹 Daily maintenance at $NOW" | tee -a "$LOG_FILE"
echo "------------------------------------------" | tee -a "$LOG_FILE"

# === Clean old incomplete transcodes (leftover _h264.mp4 files) ===
STALE_TRANSCODES=$(find ~/clearpoint-recordings -name "*_h264.mp4" -mmin +60 2>/dev/null | wc -l)
if [[ $STALE_TRANSCODES -gt 0 ]]; then
  find ~/clearpoint-recordings -name "*_h264.mp4" -mmin +60 -delete 2>/dev/null
  echo "🗑️ Cleaned $STALE_TRANSCODES stale transcode files" | tee -a "$LOG_FILE"
fi

# === Clean old lock files ===
rm -f /tmp/clearpoint-uploadVods.lock 2>/dev/null

# === Clean systemd journal (keep 3 days) ===
sudo journalctl --vacuum-time=3d --quiet 2>/dev/null
echo "📋 Journal cleaned (kept 3 days)" | tee -a "$LOG_FILE"

# === Memory report ===
MEM_AVAIL=$(free -m | awk 'NR==2{print $7}')
echo "💾 Available memory: ${MEM_AVAIL}MB" | tee -a "$LOG_FILE"

# === Check if stuck FFmpeg processes (>25h old without output) ===
STUCK_COUNT=0
for pid in $(pgrep -f "ffmpeg.*segment"); do
  ELAPSED=$(($(date +%s) - $(stat -c%Y /proc/$pid/fd/1 2>/dev/null || echo $(date +%s))))
  if [[ $ELAPSED -gt 3600 ]]; then
    echo "⚠️ FFmpeg PID $pid may be stuck (${ELAPSED}s since last output)" | tee -a "$LOG_FILE"
    STUCK_COUNT=$((STUCK_COUNT + 1))
  fi
done

if [[ $STUCK_COUNT -gt 0 ]]; then
  echo "🔁 Restarting stuck camera services..." | tee -a "$LOG_FILE"
  for svc in $(systemctl list-units --type=service --state=running | grep camera | awk '{print $1}'); do
    sudo systemctl restart "$svc"
    echo "  ↻ Restarted $svc" | tee -a "$LOG_FILE"
  done
fi

# === Optional: auto-reboot if uptime > 7 days and load is critical ===
UPTIME_DAYS=$(($(awk '{print int($1)}' /proc/uptime) / 86400))
LOAD_1=$(awk '{print $1}' /proc/loadavg)
CORES=$(nproc)
LOAD_RATIO=$(awk "BEGIN {printf \"%.1f\", $LOAD_1 / $CORES}")

if [[ $UPTIME_DAYS -ge 7 ]] && (( $(echo "$LOAD_RATIO > 2.0" | bc -l) )); then
  echo "🔄 Auto-reboot: uptime=${UPTIME_DAYS}d, load_ratio=${LOAD_RATIO}x — scheduling reboot in 1 min" | tee -a "$LOG_FILE"
  sudo shutdown -r +1 "Clearpoint scheduled maintenance reboot"
else
  echo "✅ System OK: uptime=${UPTIME_DAYS}d, load_ratio=${LOAD_RATIO}x" | tee -a "$LOG_FILE"
fi

echo "" | tee -a "$LOG_FILE"

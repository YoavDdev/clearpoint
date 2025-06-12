#!/bin/bash

LOG_DIR=~/clearpoint-logs
LOG_FILE="$LOG_DIR/health.log"
mkdir -p "$LOG_DIR"

NOW=$(date '+%Y-%m-%d %H:%M:%S')
echo "🧮 Disk check at $NOW" | tee -a "$LOG_FILE"
echo "------------------------------------------" | tee -a "$LOG_FILE"

check_usage() {
  MOUNT_POINT=$1
  LABEL=$2
  USAGE=$(df -h "$MOUNT_POINT" | awk 'NR==2 {print $5}' | tr -d '%')
  if [ "$USAGE" -ge 90 ]; then
    echo "❗ $LABEL is ${USAGE}% full – take action!" | tee -a "$LOG_FILE"
    # Optional: reboot if critically full
    # echo "Rebooting due to critical disk usage" | tee -a "$LOG_FILE"
    # sudo reboot
  else
    echo "✅ $LABEL usage is OK (${USAGE}%)" | tee -a "$LOG_FILE"
  fi
}

check_usage "/" "Root (/)"
check_usage "/mnt/ram-ts" "RAM Disk (/mnt/ram-ts)"
echo "" | tee -a "$LOG_FILE"

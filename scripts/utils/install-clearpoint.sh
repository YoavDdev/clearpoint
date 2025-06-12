#!/bin/bash

echo "📦 Installing Clearpoint files..."

# === Create folders ===
mkdir -p ~/clearpoint-recordings ~/clearpoint-scripts ~/clearpoint-core

echo "📁 Created:"
echo "  - ~/clearpoint-recordings"
echo "  - ~/clearpoint-scripts"
echo "  - ~/clearpoint-core"

# === Move camera scripts ===
if compgen -G "camera-*.sh" > /dev/null; then
  cp camera-*.sh ~/clearpoint-scripts/
  echo "📄 Copied camera scripts to ~/clearpoint-scripts"
else
  echo "⚠️ No camera-*.sh files found."
fi

# === Auto-install camera-*.service files if present ===
if compgen -G "camera-*.service" > /dev/null; then
  echo "🛠️ Installing camera-*.service files..."
  for service in camera-*.service; do
    echo "➡️ Installing $service"
    sudo cp "$service" /etc/systemd/system/
    sudo systemctl enable "$service"
    sudo systemctl start "$service"
  done
  echo "✅ All camera .service files installed and started"
else
  echo "ℹ️ No camera-*.service files found – skipping systemd setup."
fi

# === Move start script ===
if [[ -f start-clearpoint.sh ]]; then
  cp start-clearpoint.sh ~/
  chmod +x ~/start-clearpoint.sh
  echo "🚀 Copied start-clearpoint.sh to home directory"
else
  echo "❌ start-clearpoint.sh not found"
fi

# === Move upload logic ===
[[ -f uploadVods.ts ]] && cp uploadVods.ts ~/clearpoint-core/
[[ -f .env ]] && cp .env ~/clearpoint-core/

# === Move status-check.sh ===
[[ -f status-check.sh ]] && cp status-check.sh ~/clearpoint-scripts/ && chmod +x ~/clearpoint-scripts/status-check.sh

# === Move disk-check.sh ===
[[ -f disk-check.sh ]] && cp disk-check.sh ~/clearpoint-scripts/ && chmod +x ~/clearpoint-scripts/disk-check.sh

# === Setup RAM disk for live stream ===
echo "🧠 Setting up /mnt/ram-ts RAM folder..."
sudo mkdir -p /mnt/ram-ts
sudo chmod 777 /mnt/ram-ts

if ! grep -q "/mnt/ram-ts" /etc/fstab; then
  echo "tmpfs /mnt/ram-ts tmpfs defaults,size=128M 0 0" | sudo tee -a /etc/fstab
fi

sudo mount -a
echo "✅ RAM stream folder ready at /mnt/ram-ts"

# === Run setup-cron.sh if available ===
if [[ -f setup-cron.sh ]]; then
  echo "📅 Running setup-cron.sh to configure CRON..."
  bash setup-cron.sh
else
  echo "⚠️ setup-cron.sh not found – CRON not configured"
fi

echo "✅ Install complete. Cameras are streaming. CRON is active. System is self-healing."

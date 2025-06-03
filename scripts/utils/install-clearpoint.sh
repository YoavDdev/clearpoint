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

# === Move status-check ===
[[ -f status-check.sh ]] && cp status-check.sh ~/clearpoint-scripts/ && chmod +x ~/clearpoint-scripts/status-check.sh

echo "✅ Install complete. Now manually install Node, setup CRON, and run start-clearpoint.sh"

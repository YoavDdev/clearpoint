#!/bin/bash

echo "📦 Installing Clearpoint files..."

# === Step 1: Create required folders ===
mkdir -p ~/clearpoint-recordings
mkdir -p ~/clearpoint-scripts
mkdir -p ~/clearpoint-core

echo "📁 Created folders:"
echo "  - ~/clearpoint-recordings"
echo "  - ~/clearpoint-scripts"
echo "  - ~/clearpoint-core"

# === Step 2: Move camera scripts ===
if compgen -G "camera-*.sh" > /dev/null; then
  cp camera-*.sh ~/clearpoint-scripts/
  echo "📄 Camera scripts moved to ~/clearpoint-scripts"
else
  echo "⚠️ No camera-*.sh scripts found to move."
fi

# === Step 3: Move start script ===
if [[ -f start-clearpoint.sh ]]; then
  mv start-clearpoint.sh ~/
  chmod +x ~/start-clearpoint.sh
  echo "🚀 Moved and enabled start-clearpoint.sh"
else
  echo "❌ start-clearpoint.sh not found."
  exit 1
fi

# === Step 4: Move upload logic ===
if [[ -f uploadVods.ts ]]; then
  mv uploadVods.ts ~/clearpoint-core/
  echo "📦 Moved uploadVods.ts to ~/clearpoint-core"
fi

if [[ -f .env ]]; then
  mv .env ~/clearpoint-core/
  echo "🔐 Moved .env to ~/clearpoint-core"
fi

# === Step 5: Move status-check script ===
if [[ -f status-check.sh ]]; then
  mv status-check.sh ~/clearpoint-scripts/
  chmod +x ~/clearpoint-scripts/status-check.sh
  echo "🛠️  Moved status-check.sh to ~/clearpoint-scripts"
fi

# === Step 6: Install Node packages ===
cd ~/clearpoint-core
echo "📥 Installing Node packages..."
npm install
npm install -D typescript ts-node @types/node @supabase/supabase-js dotenv axios

# === Initialize tsconfig if needed ===
if [[ ! -f tsconfig.json ]]; then
  npx tsc --init
fi

# === Step 7: Setup CRON jobs ===
echo "⏱️ Setting up CRON jobs..."

# Upload script every 5 min
(crontab -l 2>/dev/null; echo "*/5 * * * * cd ~/clearpoint-core && /usr/local/bin/ts-node uploadVods.ts >> ~/vod-upload-log.txt 2>&1") | sort -u | crontab -

# On reboot: start cameras + tunnel
(crontab -l 2>/dev/null; echo "@reboot sleep 15 && bash ~/start-clearpoint.sh") | sort -u | crontab -

echo "✅ Clearpoint installation complete!"
echo "➡️ You can reboot now or run: bash ~/start-clearpoint.sh"

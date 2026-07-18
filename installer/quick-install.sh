#!/bin/bash
#
# Clearpoint Quick Install — Bootstrap Script
# Usage: curl -sL https://raw.githubusercontent.com/YoavDdev/clearpoint/main/installer/quick-install.sh | bash
#
# This script:
# 1. Installs git + curl
# 2. Clones the Clearpoint repo
# 3. Runs the full installer
#

set -e

echo "🚀 Clearpoint Security — Quick Install"
echo "======================================="

# Install basics
sudo apt update -qq
sudo apt install -y -qq git curl

# Clone repo
INSTALL_DIR="$HOME/clearpoint-setup"
if [ -d "$INSTALL_DIR" ]; then
  echo "📂 Updating existing setup..."
  cd "$INSTALL_DIR" && git pull
else
  echo "📥 Downloading Clearpoint..."
  git clone https://github.com/YoavDdev/clearpoint.git "$INSTALL_DIR"
fi

# Run main installer
cd "$INSTALL_DIR/installer"
bash clearpoint-linux-installer.sh

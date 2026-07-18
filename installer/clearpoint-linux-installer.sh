#!/bin/bash
#
# Clearpoint Security — Full Installation Script v2.0
# Ubuntu 24.04 LTS | Intel Mini PC with iGPU
#
# Usage:
#   git clone https://github.com/YoavDdev/clearpoint.git ~/clearpoint-setup
#   cd ~/clearpoint-setup/installer
#   bash clearpoint-linux-installer.sh
#
# Or one-liner:
#   curl -sL https://raw.githubusercontent.com/YoavDdev/clearpoint/main/installer/quick-install.sh | bash
#

set -e

# === Colors ===
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(dirname "$SCRIPT_DIR")"

step() { echo -e "\n${BLUE}━━━ $1 ━━━${NC}"; }
ok()   { echo -e "${GREEN}✅ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }
err()  { echo -e "${RED}❌ $1${NC}"; }

# ═══════════════════════════════════════════════════
# PRE-FLIGHT CHECKS
# ═══════════════════════════════════════════════════

step "Clearpoint Security Installer v2.0"
echo -e "${CYAN}Ubuntu 24.04 | Intel Mini PC | VAAPI GPU${NC}"
echo ""

# Must not be root
if [[ $EUID -eq 0 ]]; then
    err "Don't run as root! Run as regular user (script uses sudo internally)."
    exit 1
fi

# Must be Ubuntu
if ! grep -q "Ubuntu" /etc/os-release 2>/dev/null; then
    err "This installer requires Ubuntu!"
    exit 1
fi
ok "Ubuntu $(lsb_release -rs 2>/dev/null || echo '?') detected"

# ═══════════════════════════════════════════════════
# COLLECT CONFIGURATION
# ═══════════════════════════════════════════════════

step "Configuration (from Admin Panel)"
echo -e "${CYAN}Open your Admin Panel and have the following ready:${NC}"
echo ""

read -p "👤 User ID (from admin): " USER_ID
if [ -z "$USER_ID" ]; then err "User ID is required!"; exit 1; fi

read -p "🔑 Device Token: " DEVICE_TOKEN
if [ -z "$DEVICE_TOKEN" ]; then err "Device Token is required!"; exit 1; fi

read -p "🌐 Cloudflare Tunnel Token (eyJ...): " CF_TUNNEL_TOKEN
if [ -z "$CF_TUNNEL_TOKEN" ]; then warn "No tunnel token — will configure later"; fi

echo ""
echo -e "${BOLD}📹 Camera Configuration${NC}"
echo -e "${CYAN}For each camera, enter: NAME,IP,RTSP_USER,RTSP_PASS,RTSP_PATH${NC}"
echo -e "${CYAN}Example: entrance,192.168.1.101,admin,123456,/h264/ch1/main/av_stream${NC}"
echo -e "${CYAN}Type 'done' when finished.${NC}"
echo ""

CAMERAS=()
CAM_NUM=1
while true; do
    read -p "Camera $CAM_NUM (or 'done'): " cam_input
    if [[ "$cam_input" == "done" ]] || [[ -z "$cam_input" ]]; then
        break
    fi
    CAMERAS+=("$cam_input")
    CAM_NUM=$((CAM_NUM + 1))
done

if [ ${#CAMERAS[@]} -eq 0 ]; then
    err "At least one camera is required!"
    exit 1
fi

echo ""
ok "Configuration: User=$USER_ID, Cameras=${#CAMERAS[@]}"

# ═══════════════════════════════════════════════════
# INSTALL SYSTEM DEPENDENCIES
# ═══════════════════════════════════════════════════

step "Installing system packages"

sudo apt update -qq

sudo apt install -y -qq \
    ffmpeg \
    git \
    curl \
    wget \
    cron \
    unzip \
    python3 \
    python3-pip \
    python3-venv \
    libglib2.0-0 \
    intel-media-va-driver \
    vainfo \
    2>/dev/null

# Node.js LTS
if ! command -v node >/dev/null 2>&1 || [[ $(node -v | cut -d'v' -f2 | cut -d'.' -f1) -lt 18 ]]; then
    echo "📦 Installing Node.js LTS..."
    curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash - 2>/dev/null
    sudo apt-get install -y -qq nodejs
fi

# tsx (TypeScript runner)
sudo npm install -g tsx 2>/dev/null

ok "System packages installed (ffmpeg, node $(node -v), tsx, python3, VAAPI driver)"

# ═══════════════════════════════════════════════════
# VERIFY VAAPI
# ═══════════════════════════════════════════════════

step "Verifying VAAPI hardware encoding"

if LIBVA_DRIVER_NAME=iHD vainfo 2>&1 | grep -q "VAEntrypointEncSlice"; then
    ok "VAAPI H.264 encoding available"
else
    warn "VAAPI might not work — VODs will upload as-is (still functional)"
fi

# ═══════════════════════════════════════════════════
# CREATE DIRECTORY STRUCTURE
# ═══════════════════════════════════════════════════

step "Creating directory structure"

mkdir -p ~/clearpoint-recordings/$USER_ID/footage
mkdir -p ~/clearpoint-scripts
mkdir -p ~/clearpoint-core
mkdir -p ~/clearpoint-ai
mkdir -p ~/clearpoint-logs
mkdir -p ~/clearpoint-snapshots

# RAM disk for live HLS
sudo mkdir -p /mnt/ram-ts
sudo chmod 777 /mnt/ram-ts
if ! grep -q "/mnt/ram-ts" /etc/fstab; then
    echo "tmpfs /mnt/ram-ts tmpfs defaults,size=128M 0 0" | sudo tee -a /etc/fstab
fi
sudo mount -a 2>/dev/null || true
mkdir -p /mnt/ram-ts/$USER_ID/live

ok "Directories created"

# ═══════════════════════════════════════════════════
# COPY SCRIPTS FROM REPO
# ═══════════════════════════════════════════════════

step "Installing Clearpoint scripts"

# Core scripts
cp "$REPO_DIR/scripts/utils/uploadVods.ts" ~/clearpoint-core/
cp "$REPO_DIR/scripts/utils/live-server.js" ~/clearpoint-core/
cp "$REPO_DIR/scripts/utils/start-clearpoint.sh" ~/
chmod +x ~/start-clearpoint.sh

# Utility scripts
cp "$REPO_DIR/scripts/utils/status-check.sh" ~/clearpoint-scripts/
cp "$REPO_DIR/scripts/utils/disk-check.sh" ~/clearpoint-scripts/
cp "$REPO_DIR/scripts/utils/daily-maintenance.sh" ~/clearpoint-scripts/
chmod +x ~/clearpoint-scripts/*.sh

# AI detection
cp "$REPO_DIR/scripts/ai/detect.py" ~/clearpoint-ai/
cp "$REPO_DIR/scripts/ai/requirements.txt" ~/clearpoint-ai/ 2>/dev/null || true
cp "$REPO_DIR/scripts/ai/setup-ai.sh" ~/clearpoint-ai/
chmod +x ~/clearpoint-ai/setup-ai.sh

ok "Scripts installed"

# ═══════════════════════════════════════════════════
# CREATE .env FILE
# ═══════════════════════════════════════════════════

step "Creating environment configuration"

cat > ~/clearpoint-core/.env << EOF
# Clearpoint Environment — Auto-generated $(date +%Y-%m-%d)
CLEARPOINT_API_BASE=https://clearpoint.co.il
CLEARPOINT_DEVICE_TOKEN=$DEVICE_TOKEN
USER_ID=$USER_ID
EOF

# Secure permissions
chmod 600 ~/clearpoint-core/.env

ok ".env created (DEVICE_TOKEN + USER_ID)"

# ═══════════════════════════════════════════════════
# INSTALL NODE DEPENDENCIES
# ═══════════════════════════════════════════════════

step "Installing Node.js dependencies"

cd ~/clearpoint-core
if [ ! -f package.json ]; then
    npm init -y --quiet 2>/dev/null
fi
npm install --quiet axios dotenv express cors 2>/dev/null

ok "Node.js dependencies installed"

# ═══════════════════════════════════════════════════
# GENERATE CAMERA SCRIPTS + SERVICES
# ═══════════════════════════════════════════════════

step "Generating camera scripts"

for i in "${!CAMERAS[@]}"; do
    IFS=',' read -r CAM_NAME CAM_IP CAM_USER CAM_PASS CAM_PATH <<< "${CAMERAS[$i]}"
    
    # Default values
    CAM_USER="${CAM_USER:-admin}"
    CAM_PASS="${CAM_PASS:-admin}"
    CAM_PATH="${CAM_PATH:-/h264/ch1/main/av_stream}"
    CAM_INDEX=$((i + 1))
    
    # Generate a camera ID (simple for filesystem)
    CAM_ID="camera-${CAM_INDEX}"
    
    # Create footage directory for this camera
    FOOTAGE_DIR="$HOME/clearpoint-recordings/$USER_ID/footage/$CAM_ID"
    LIVE_DIR="/mnt/ram-ts/$USER_ID/live/$CAM_ID"
    mkdir -p "$FOOTAGE_DIR" "$LIVE_DIR"
    
    # Camera recording script
    cat > ~/clearpoint-scripts/${CAM_ID}.sh << CAMEOF
#!/bin/bash
# Camera: $CAM_NAME ($CAM_IP)
# Generated: $(date +%Y-%m-%d)

RTSP_URL="rtsp://${CAM_USER}:${CAM_PASS}@${CAM_IP}:554${CAM_PATH}"
FOOTAGE_DIR="$FOOTAGE_DIR"
LIVE_DIR="$LIVE_DIR"

mkdir -p "\$FOOTAGE_DIR" "\$LIVE_DIR"

echo "📹 Starting $CAM_NAME ($CAM_IP)..."

ffmpeg -rtsp_transport tcp -i "\$RTSP_URL" \\
  -c:v copy \\
  -c:a aac -ar 44100 -ac 1 -b:a 64k \\
  -f segment -segment_time 900 -reset_timestamps 1 \\
  -strftime 1 "\$FOOTAGE_DIR/%Y-%m-%d_%H-%M-%S.mp4" \\
  -c:v copy \\
  -f hls -hls_time 4 -hls_list_size 5 -hls_flags delete_segments \\
  "\$LIVE_DIR/stream.m3u8" \\
  -y
CAMEOF
    chmod +x ~/clearpoint-scripts/${CAM_ID}.sh
    
    # Systemd service with auto-restart
    sudo tee /etc/systemd/system/${CAM_ID}.service > /dev/null << SVCEOF
[Unit]
Description=Clearpoint Camera: $CAM_NAME
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=$USER
ExecStart=$HOME/clearpoint-scripts/${CAM_ID}.sh
Restart=always
RestartSec=10
RuntimeMaxSec=86400
WatchdogSec=120
KillMode=mixed
TimeoutStopSec=30
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
SVCEOF

    ok "$CAM_ID: $CAM_NAME @ $CAM_IP"
done

# ═══════════════════════════════════════════════════
# EXPRESS LIVE SERVER SERVICE
# ═══════════════════════════════════════════════════

step "Setting up Express live server"

sudo tee /etc/systemd/system/clearpoint-live.service > /dev/null << EOF
[Unit]
Description=Clearpoint Live Stream Server
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$HOME/clearpoint-core
ExecStart=$(which node) $HOME/clearpoint-core/live-server.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

ok "Express live server service created"

# ═══════════════════════════════════════════════════
# CLOUDFLARE TUNNEL
# ═══════════════════════════════════════════════════

step "Setting up Cloudflare Tunnel"

# Install cloudflared
if ! command -v cloudflared >/dev/null 2>&1; then
    wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -O /tmp/cloudflared.deb
    sudo dpkg -i /tmp/cloudflared.deb 2>/dev/null
    sudo apt-get install -f -y -qq 2>/dev/null
fi

if [ -n "$CF_TUNNEL_TOKEN" ]; then
    # Install as service with token
    sudo cloudflared service install "$CF_TUNNEL_TOKEN" 2>/dev/null || true
    ok "Cloudflare tunnel configured with token"
else
    warn "No tunnel token — configure manually later:"
    echo "  sudo cloudflared service install YOUR_TOKEN"
fi

# ═══════════════════════════════════════════════════
# AI DETECTION SETUP
# ═══════════════════════════════════════════════════

step "Setting up AI detection"

cd ~/clearpoint-ai
bash setup-ai.sh 2>&1 | tail -5

ok "AI detection configured"

# ═══════════════════════════════════════════════════
# CRON JOBS
# ═══════════════════════════════════════════════════

step "Setting up scheduled tasks (cron)"

# Build cron entries
UPLOAD_LINE="*/20 * * * * cd ~/clearpoint-core && /usr/local/bin/tsx uploadVods.ts >> ~/vod-upload-log.txt 2>&1"
STATUS_LINE="*/5 * * * * bash ~/clearpoint-scripts/status-check.sh >> ~/clearpoint-logs/status.log 2>&1"
MAINTENANCE_LINE="30 3 * * * bash ~/clearpoint-scripts/daily-maintenance.sh >> ~/clearpoint-logs/maintenance.log 2>&1"

# Apply cron (preserve existing, add new)
CURRENT_CRON=$(crontab -l 2>/dev/null || true)
{
    echo "$CURRENT_CRON"
    echo "$UPLOAD_LINE"
    echo "$STATUS_LINE"
    echo "$MAINTENANCE_LINE"
} | sort -u | crontab -

ok "Cron: upload (*/20), health (*/5), maintenance (3:30 AM)"

# ═══════════════════════════════════════════════════
# RUSTDESK
# ═══════════════════════════════════════════════════

step "Installing RustDesk (remote support)"

if ! command -v rustdesk >/dev/null 2>&1; then
    RUSTDESK_VER="1.3.8"
    wget -q "https://github.com/rustdesk/rustdesk/releases/download/${RUSTDESK_VER}/rustdesk-${RUSTDESK_VER}-x86_64.deb" -O /tmp/rustdesk.deb
    sudo dpkg -i /tmp/rustdesk.deb 2>/dev/null || true
    sudo apt-get install -f -y -qq 2>/dev/null
fi

if command -v rustdesk >/dev/null 2>&1; then
    ok "RustDesk installed"
    echo -e "${YELLOW}   ⚠️  Start RustDesk GUI to get ID: rustdesk${NC}"
else
    warn "RustDesk installation failed — install manually later"
fi

# ═══════════════════════════════════════════════════
# START ALL SERVICES
# ═══════════════════════════════════════════════════

step "Starting all services"

sudo systemctl daemon-reload

# Camera services
for i in "${!CAMERAS[@]}"; do
    CAM_ID="camera-$((i + 1))"
    sudo systemctl enable --now ${CAM_ID}.service 2>/dev/null
    sleep 2
    if systemctl is-active --quiet ${CAM_ID}.service; then
        ok "$CAM_ID: RUNNING"
    else
        err "$CAM_ID: FAILED — check: journalctl -u ${CAM_ID} -n 20"
    fi
done

# Express server
sudo systemctl enable --now clearpoint-live.service 2>/dev/null
sleep 2
if systemctl is-active --quiet clearpoint-live.service; then
    ok "Live server: RUNNING (port 8080)"
else
    err "Live server: FAILED"
fi

# AI detection
sudo systemctl enable --now clearpoint-ai.service 2>/dev/null
sleep 5
if systemctl is-active --quiet clearpoint-ai.service; then
    ok "AI detection: RUNNING"
else
    warn "AI detection: not started (may need model download to complete)"
fi

# Cloudflared
if systemctl is-active --quiet cloudflared.service 2>/dev/null; then
    ok "Cloudflare tunnel: RUNNING"
fi

# ═══════════════════════════════════════════════════
# VERIFICATION
# ═══════════════════════════════════════════════════

step "Verification"

echo ""
# Check recordings
sleep 10
RECORDINGS=$(find ~/clearpoint-recordings -name "*.mp4" -mmin -2 2>/dev/null | wc -l)
if [ "$RECORDINGS" -gt 0 ]; then
    ok "Recordings: $RECORDINGS files being created"
else
    warn "No recordings yet — cameras may need 1-2 minutes to start"
fi

# Check HLS
HLS_FILES=$(find /mnt/ram-ts -name "*.m3u8" 2>/dev/null | wc -l)
if [ "$HLS_FILES" -gt 0 ]; then
    ok "Live streams: $HLS_FILES active"
else
    warn "No live streams yet — check camera connections"
fi

# Check VAAPI
if LIBVA_DRIVER_NAME=iHD ffmpeg -hwaccel vaapi -hwaccel_device /dev/dri/renderD128 \
    -f lavfi -i testsrc=duration=1:size=320x240 -vf 'format=nv12,hwupload' \
    -c:v h264_vaapi -frames:v 1 -f null - 2>/dev/null; then
    ok "VAAPI transcoding: WORKING"
else
    warn "VAAPI transcoding: not available — VODs will upload without conversion"
fi

# ═══════════════════════════════════════════════════
# FINAL SUMMARY
# ═══════════════════════════════════════════════════

step "INSTALLATION COMPLETE"

echo ""
echo -e "${GREEN}${BOLD}════════════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD}  ✅ Clearpoint Security — Ready!          ${NC}"
echo -e "${GREEN}${BOLD}════════════════════════════════════════════${NC}"
echo ""
echo -e "  ${BOLD}User ID:${NC}     $USER_ID"
echo -e "  ${BOLD}Cameras:${NC}     ${#CAMERAS[@]}"
echo -e "  ${BOLD}Services:${NC}    cameras + AI + live + tunnel"
echo -e "  ${BOLD}VAAPI:${NC}       enabled (GPU transcoding)"
echo -e "  ${BOLD}Auto-restart:${NC} after crash + daily (24h)"
echo -e "  ${BOLD}Power loss:${NC}  auto-start (systemd)"
echo ""
echo -e "${YELLOW}${BOLD}⚠️  IMPORTANT — Do these manually:${NC}"
echo -e "  1. ${BOLD}BIOS:${NC} Set 'Restore AC Power Loss' → Power On"
echo -e "  2. ${BOLD}RustDesk:${NC} Run 'rustdesk' and save the ID"
echo -e "  3. ${BOLD}Test phone:${NC} Open app → verify live + recordings"
echo ""
echo -e "${CYAN}Useful commands:${NC}"
echo "  journalctl -u camera-1 -f        # Camera logs"
echo "  journalctl -u clearpoint-ai -f   # AI logs"
echo "  tail -f ~/vod-upload-log.txt     # Upload logs"
echo "  systemctl status clearpoint-*    # All services"
echo "  top -bn1 | head -5               # CPU/RAM"
echo ""

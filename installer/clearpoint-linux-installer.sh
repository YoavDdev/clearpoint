#!/bin/bash

# Clearpoint Security Camera Installation Script - Ubuntu 24.04 Native
# This script automates the entire camera setup process on Ubuntu 24.04 machines

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Get script directory (USB path)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "${GREEN}🚀 Clearpoint Security Camera Installer v1.0 (Ubuntu 24.04)${NC}"
echo -e "${GREEN}================================================================${NC}"
echo -e "${CYAN}📁 USB Path: $SCRIPT_DIR${NC}"
echo ""

# Function to show progress
show_progress() {
    local message="$1"
    local percent="$2"
    echo -e "${BLUE}[$percent%] $message${NC}"
}

# Function to check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        echo -e "${RED}❌ This script should NOT be run as root!${NC}"
        echo -e "${YELLOW}💡 Run as regular user. The script will use sudo when needed.${NC}"
        exit 1
    fi
}

# Function to check Ubuntu version
check_ubuntu() {
    if ! grep -q "Ubuntu" /etc/os-release; then
        echo -e "${RED}❌ This installer requires Ubuntu!${NC}"
        exit 1
    fi
    
    local version=$(lsb_release -rs 2>/dev/null || echo "unknown")
    echo -e "${CYAN}📋 Detected: Ubuntu $version${NC}"
    
    # Check for Ubuntu 24.04
    if [[ "$version" == "24.04" ]]; then
        echo -e "${GREEN}✅ Ubuntu 24.04 LTS detected - perfect!${NC}"
    elif [[ "$version" == "22.04" ]]; then
        echo -e "${YELLOW}⚠️ Ubuntu 22.04 detected - should work but 24.04 is recommended${NC}"
    else
        echo -e "${YELLOW}⚠️ Ubuntu $version detected - this installer is optimized for 24.04${NC}"
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

# Function to collect configuration via GUI (if available) or CLI
collect_configuration() {
    echo -e "${BLUE}📝 Configuration Setup${NC}"
    echo "=================================="
    
    # Check if we have a GUI available
    if command -v zenity >/dev/null 2>&1 && [ -n "$DISPLAY" ]; then
        collect_config_gui
    else
        collect_config_cli
    fi
}

# GUI configuration collection
collect_config_gui() {
    echo -e "${CYAN}🖥️ Using GUI configuration...${NC}"
    
    # Customer Name
    CUSTOMER_NAME=$(zenity --entry \
        --title="Clearpoint Setup - Ubuntu 24.04" \
        --text="Enter Customer Name:" \
        --width=400 2>/dev/null || echo "")
    
    if [ -z "$CUSTOMER_NAME" ]; then
        echo -e "${RED}❌ Customer name is required${NC}"
        exit 1
    fi
    
    # Camera IPs
    CAMERA_IPS=$(zenity --entry \
        --title="Clearpoint Setup - Camera Configuration" \
        --text="Enter Camera IPs (comma separated):" \
        --entry-text="192.168.1.100,192.168.1.101,192.168.1.102,192.168.1.103" \
        --width=500 2>/dev/null || echo "")
    
    # Supabase URL
    SUPABASE_URL=$(zenity --entry \
        --title="Clearpoint Setup - Supabase Configuration" \
        --text="Enter Supabase URL:" \
        --width=500 2>/dev/null || echo "")
    
    # Supabase Key (password field)
    SUPABASE_KEY=$(zenity --password \
        --title="Clearpoint Setup - Supabase Key" \
        --text="Enter Supabase Service Key:" \
        --width=400 2>/dev/null || echo "")
    
    # B2 Account ID
    B2_ACCOUNT_ID=$(zenity --entry \
        --title="Clearpoint Setup - B2 Storage" \
        --text="Enter B2 Account ID:" \
        --width=400 2>/dev/null || echo "")
    
    # B2 App Key (password field)
    B2_APP_KEY=$(zenity --password \
        --title="Clearpoint Setup - B2 Key" \
        --text="Enter B2 App Key:" \
        --width=400 2>/dev/null || echo "")
    
    # Bunny Token (password field)
    BUNNY_TOKEN=$(zenity --password \
        --title="Clearpoint Setup - Bunny CDN" \
        --text="Enter Bunny Token:" \
        --width=400 2>/dev/null || echo "")
}

# CLI configuration collection
collect_config_cli() {
    echo -e "${CYAN}💻 Using CLI configuration...${NC}"
    
    read -p "Customer Name: " CUSTOMER_NAME
    if [ -z "$CUSTOMER_NAME" ]; then
        echo -e "${RED}❌ Customer name is required${NC}"
        exit 1
    fi
    
    read -p "Camera IPs (comma separated): " -i "192.168.1.100,192.168.1.101,192.168.1.102,192.168.1.103" -e CAMERA_IPS
    read -p "Supabase URL: " SUPABASE_URL
    read -s -p "Supabase Service Key: " SUPABASE_KEY
    echo ""
    read -p "B2 Account ID: " B2_ACCOUNT_ID
    read -s -p "B2 App Key: " B2_APP_KEY
    echo ""
    read -s -p "Bunny Token: " BUNNY_TOKEN
    echo ""
}

# Function to install system dependencies for Ubuntu 24.04
install_dependencies() {
    show_progress "Installing system dependencies for Ubuntu 24.04..." 10
    
    # Update package list
    sudo apt update
    
    # Install required packages (Ubuntu 24.04 optimized)
    sudo apt install -y \
        ffmpeg \
        nodejs \
        npm \
        git \
        curl \
        cron \
        zenity \
        wget \
        unzip \
        software-properties-common \
        apt-transport-https \
        ca-certificates \
        gnupg \
        lsb-release
    
    # Install latest Node.js (Ubuntu 24.04 has newer versions)
    if ! command -v node >/dev/null 2>&1 || [[ $(node -v | cut -d'v' -f2 | cut -d'.' -f1) -lt 18 ]]; then
        echo -e "${CYAN}📦 Installing latest Node.js...${NC}"
        curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
        sudo apt-get install -y nodejs
    fi
    
    # Install ts-node globally
    sudo npm install -g ts-node
    
    echo -e "${GREEN}✅ System dependencies installed${NC}"
}

# Function to install Cloudflared for Ubuntu 24.04
install_cloudflared() {
    show_progress "Installing Cloudflared..." 20
    
    cd /tmp
    
    # Download latest cloudflared for Ubuntu 24.04
    wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
    sudo dpkg -i cloudflared-linux-amd64.deb
    
    # Fix any dependency issues
    sudo apt-get install -f -y
    
    # Verify installation
    if cloudflared --version >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Cloudflared installed successfully${NC}"
    else
        echo -e "${RED}❌ Cloudflared installation failed${NC}"
        exit 1
    fi
}

# Function to copy USB files and run existing installer
setup_from_usb() {
    show_progress "Setting up from USB files..." 30
    
    # Check if existing installer exists
    if [ -f "$SCRIPT_DIR/install-clearpoint.sh" ]; then
        echo -e "${CYAN}🚀 Running existing install-clearpoint.sh...${NC}"
        cd "$SCRIPT_DIR"
        bash install-clearpoint.sh
    else
        echo -e "${YELLOW}⚠️ install-clearpoint.sh not found, running manual setup...${NC}"
        manual_setup
    fi
}

# Function for manual setup if USB installer not found
manual_setup() {
    show_progress "Manual setup..." 35
    
    # Create directories
    mkdir -p ~/clearpoint-recordings ~/clearpoint-scripts ~/clearpoint-core ~/clearpoint-logs
    
    # Copy files from USB if they exist
    [ -f "$SCRIPT_DIR/uploadVods.ts" ] && cp "$SCRIPT_DIR/uploadVods.ts" ~/clearpoint-core/
    [ -f "$SCRIPT_DIR/live-server.js" ] && cp "$SCRIPT_DIR/live-server.js" ~/clearpoint-core/
    [ -f "$SCRIPT_DIR/status-check.sh" ] && cp "$SCRIPT_DIR/status-check.sh" ~/clearpoint-scripts/ && chmod +x ~/clearpoint-scripts/status-check.sh
    [ -f "$SCRIPT_DIR/disk-check.sh" ] && cp "$SCRIPT_DIR/disk-check.sh" ~/clearpoint-scripts/ && chmod +x ~/clearpoint-scripts/disk-check.sh
    [ -f "$SCRIPT_DIR/start-clearpoint.sh" ] && cp "$SCRIPT_DIR/start-clearpoint.sh" ~/ && chmod +x ~/start-clearpoint.sh
    
    # Setup RAM disk (Ubuntu 24.04 compatible)
    sudo mkdir -p /mnt/ram-ts
    sudo chmod 777 /mnt/ram-ts
    if ! grep -q "/mnt/ram-ts" /etc/fstab; then
        echo "tmpfs /mnt/ram-ts tmpfs defaults,size=128M 0 0" | sudo tee -a /etc/fstab
    fi
    sudo mount -a
    
    # Run CRON setup if available
    [ -f "$SCRIPT_DIR/setup-cron.sh" ] && bash "$SCRIPT_DIR/setup-cron.sh"
    
    echo -e "${GREEN}✅ Manual setup completed${NC}"
}

# Function to generate camera scripts
generate_camera_scripts() {
    show_progress "Generating camera scripts..." 50
    
    # Convert comma-separated IPs to array
    IFS=',' read -ra CAMERA_ARRAY <<< "$CAMERA_IPS"
    
    for i in "${!CAMERA_ARRAY[@]}"; do
        local camera_ip="${CAMERA_ARRAY[i]// /}"  # Remove spaces
        local camera_id="camera-$((i+1))"
        
        echo -e "${CYAN}📹 Generating $camera_id for IP: $camera_ip${NC}"
        
        # Generate camera script (Ubuntu 24.04 optimized)
        cat > ~/clearpoint-scripts/${camera_id}.sh << EOF
#!/bin/bash
# Camera $((i+1)) - $camera_ip
# Generated by Clearpoint Linux Installer for Ubuntu 24.04

CAMERA_IP="$camera_ip"
CAMERA_ID="$camera_id"
OUTPUT_DIR="/home/\$USER/clearpoint-recordings"
RAM_DIR="/mnt/ram-ts"

# Create output directory if it doesn't exist
mkdir -p \$OUTPUT_DIR

echo "Starting \$CAMERA_ID recording from \$CAMERA_IP..."

# FFmpeg command optimized for Ubuntu 24.04
ffmpeg -i "rtsp://admin:admin@\$CAMERA_IP:554/stream" \\
  -c:v libx264 -preset ultrafast -crf 23 \\
  -c:a aac -ar 44100 -ac 2 \\
  -f segment -segment_time 900 -segment_format mp4 \\
  -strftime 1 "\$OUTPUT_DIR/\$CAMERA_ID_%Y%m%d_%H%M%S.mp4" \\
  -f hls -hls_time 10 -hls_list_size 3 -hls_flags delete_segments \\
  "\$RAM_DIR/\$CAMERA_ID.m3u8" \\
  -y
EOF
        
        chmod +x ~/clearpoint-scripts/${camera_id}.sh
        
        # Generate systemd service (Ubuntu 24.04 compatible)
        sudo tee /etc/systemd/system/${camera_id}.service > /dev/null << EOF
[Unit]
Description=Clearpoint Camera $((i+1)) Service
After=network.target
Wants=network-online.target

[Service]
Type=simple
User=$USER
Group=$USER
WorkingDirectory=/home/$USER
ExecStart=/home/$USER/clearpoint-scripts/${camera_id}.sh
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
KillMode=mixed
TimeoutStopSec=30

[Install]
WantedBy=multi-user.target
EOF
        
        echo -e "${GREEN}✅ Generated $camera_id${NC}"
    done
}

# Function to create environment file
create_env_file() {
    show_progress "Creating environment configuration..." 60
    
    cat > ~/clearpoint-core/.env << EOF
# Clearpoint Environment Configuration
# Generated by Linux Installer for Ubuntu 24.04

SUPABASE_URL=$SUPABASE_URL
SUPABASE_SERVICE_KEY=$SUPABASE_KEY
B2_ACCOUNT_ID=$B2_ACCOUNT_ID
B2_APP_KEY=$B2_APP_KEY
BUNNY_TOKEN=$BUNNY_TOKEN

# Customer Configuration
CUSTOMER_NAME=$CUSTOMER_NAME
CAMERA_IPS=$CAMERA_IPS

# System Information
UBUNTU_VERSION=$(lsb_release -rs)
INSTALL_DATE=$(date)
EOF
    
    echo -e "${GREEN}✅ Environment file created${NC}"
}

# Function to setup Node.js dependencies
setup_node_dependencies() {
    show_progress "Installing Node.js dependencies..." 70
    
    cd ~/clearpoint-core
    
    # Initialize package.json if it doesn't exist
    if [ ! -f package.json ]; then
        npm init -y
    fi
    
    # Install dependencies (Ubuntu 24.04 compatible versions)
    npm install axios dotenv @supabase/supabase-js express serve-static cors
    npm install --save-dev typescript ts-node @types/node
    
    echo -e "${GREEN}✅ Node.js dependencies installed${NC}"
}

# Function to start camera services
start_camera_services() {
    show_progress "Starting camera services..." 80
    
    # Reload systemd
    sudo systemctl daemon-reload
    
    # Convert comma-separated IPs to array
    IFS=',' read -ra CAMERA_ARRAY <<< "$CAMERA_IPS"
    
    for i in "${!CAMERA_ARRAY[@]}"; do
        local camera_id="camera-$((i+1))"
        
        echo -e "${CYAN}🔄 Starting $camera_id service...${NC}"
        
        sudo systemctl enable ${camera_id}.service
        sudo systemctl start ${camera_id}.service
        
        # Wait a moment for service to start
        sleep 2
        
        # Check service status
        if systemctl is-active --quiet ${camera_id}.service; then
            echo -e "${GREEN}✅ $camera_id service: RUNNING${NC}"
        else
            echo -e "${RED}❌ $camera_id service: FAILED${NC}"
            echo -e "${YELLOW}💡 Check logs: journalctl -u ${camera_id}.service -f${NC}"
        fi
    done
}

# Function to setup Cloudflare tunnel
setup_cloudflare_tunnel() {
    show_progress "Setting up Cloudflare tunnel..." 90
    
    echo ""
    echo -e "${YELLOW}📋 Cloudflare tunnel setup required:${NC}"
    echo -e "${CYAN}1. Run: cloudflared tunnel login${NC}"
    echo -e "${CYAN}2. Run: cloudflared tunnel create $CUSTOMER_NAME${NC}"
    echo -e "${CYAN}3. Configure DNS in Cloudflare dashboard${NC}"
    echo ""
    echo -e "${YELLOW}💡 Customer: $CUSTOMER_NAME${NC}"
    echo -e "${YELLOW}💡 Target URL: https://$CUSTOMER_NAME.clearpoint.co.il${NC}"
    echo ""
}

# Function to create desktop shortcuts
create_shortcuts() {
    show_progress "Creating desktop shortcuts..." 95
    
    # Create desktop shortcut (Ubuntu 24.04 compatible)
    if [ -d "$HOME/Desktop" ]; then
        cat > "$HOME/Desktop/Clearpoint-Terminal.desktop" << EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=Clearpoint Terminal
Comment=Access Clearpoint camera system
Exec=gnome-terminal --working-directory=$HOME/clearpoint-core --title="Clearpoint System"
Icon=utilities-terminal
Terminal=false
Categories=System;Security;
StartupNotify=true
EOF
        chmod +x "$HOME/Desktop/Clearpoint-Terminal.desktop"
        echo -e "${GREEN}✅ Desktop shortcut created${NC}"
    fi
    
    # Create application menu entry
    mkdir -p "$HOME/.local/share/applications"
    cat > "$HOME/.local/share/applications/clearpoint.desktop" << EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=Clearpoint Security
Comment=Clearpoint camera monitoring system
Exec=gnome-terminal --working-directory=$HOME/clearpoint-core
Icon=security-high
Terminal=true
Categories=System;Security;
StartupNotify=true
EOF
    
    echo -e "${GREEN}✅ Application menu entry created${NC}"
}

# Function to show final status
show_final_status() {
    show_progress "Installation completed!" 100
    
    echo ""
    echo -e "${GREEN}✅ Clearpoint Ubuntu 24.04 installation completed!${NC}"
    echo -e "${CYAN}🎯 Customer: $CUSTOMER_NAME${NC}"
    echo -e "${CYAN}📹 Cameras configured: ${CAMERA_IPS}${NC}"
    echo -e "${CYAN}🖥️ Ubuntu Version: $(lsb_release -ds)${NC}"
    echo ""
    echo -e "${YELLOW}📋 Next steps:${NC}"
    echo -e "${CYAN}1. Complete Cloudflare tunnel setup${NC}"
    echo -e "${CYAN}2. Add DNS record in Cloudflare dashboard${NC}"
    echo -e "${CYAN}3. Test camera streams${NC}"
    echo ""
    echo -e "${YELLOW}🔗 Stream URLs will be available at:${NC}"
    echo -e "${CYAN}https://$CUSTOMER_NAME.clearpoint.co.il/camera1/stream.m3u8${NC}"
    echo ""
    
    # Show service status
    echo -e "${YELLOW}🔍 Camera service status:${NC}"
    IFS=',' read -ra CAMERA_ARRAY <<< "$CAMERA_IPS"
    for i in "${!CAMERA_ARRAY[@]}"; do
        local camera_id="camera-$((i+1))"
        if systemctl is-active --quiet ${camera_id}.service; then
            echo -e "${GREEN}✅ $camera_id.service: RUNNING${NC}"
        else
            echo -e "${RED}❌ $camera_id.service: STOPPED${NC}"
        fi
    done
    
    echo ""
    echo -e "${BLUE}📞 For support, check:${NC}"
    echo -e "${CYAN}• Service logs: journalctl -u camera-1.service -f${NC}"
    echo -e "${CYAN}• System status: ~/clearpoint-scripts/status-check.sh${NC}"
    echo -e "${CYAN}• System info: uname -a && lsb_release -a${NC}"
}

# Main installation function
main() {
    echo -e "${BLUE}🔍 Pre-installation checks...${NC}"
    
    check_root
    check_ubuntu
    
    echo ""
    collect_configuration
    
    echo ""
    echo -e "${BLUE}🚀 Starting installation...${NC}"
    
    install_dependencies
    install_cloudflared
    setup_from_usb
    generate_camera_scripts
    create_env_file
    setup_node_dependencies
    start_camera_services
    setup_cloudflare_tunnel
    create_shortcuts
    show_final_status
    
    echo ""
    echo -e "${GREEN}🎉 Installation complete! System ready for use.${NC}"
}

# Run main function
main "$@"

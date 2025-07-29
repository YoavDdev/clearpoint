# Clearpoint USB Preparation Script - Ubuntu 24.04 Edition
# This script copies all necessary files to a USB drive for Linux installation

param(
    [Parameter(Mandatory=$true)]
    [string]$USBDrive = ""
)

Write-Host "📦 Clearpoint USB Preparation Script (Ubuntu 24.04)" -ForegroundColor Green
Write-Host "===================================================" -ForegroundColor Green

# Validate USB drive
if (-not (Test-Path "$USBDrive\")) {
    Write-Host "❌ USB drive $USBDrive not found!" -ForegroundColor Red
    Write-Host "💡 Example usage: .\prepare-usb.ps1 -USBDrive 'E:'" -ForegroundColor Yellow
    exit 1
}

Write-Host "🎯 Target USB Drive: $USBDrive" -ForegroundColor Cyan

# Get project root directory
$projectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Write-Host "📁 Project Root: $projectRoot" -ForegroundColor Cyan

# Function to copy file with status
function Copy-FileWithStatus {
    param([string]$Source, [string]$Destination, [string]$Description)
    
    if (Test-Path $Source) {
        Copy-Item $Source $Destination -Force
        Write-Host "✅ Copied: $Description" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Missing: $Description ($Source)" -ForegroundColor Yellow
    }
}

# Create USB directory structure
Write-Host "`n📁 Creating USB directory structure..." -ForegroundColor Cyan
$usbPath = "$USBDrive\clearpoint-installer"
New-Item -ItemType Directory -Path $usbPath -Force | Out-Null

# Copy installer files
Write-Host "`n📋 Copying installer files..." -ForegroundColor Cyan
Copy-FileWithStatus "$PSScriptRoot\clearpoint-linux-installer.sh" "$usbPath\clearpoint-linux-installer.sh" "Linux Installer Script"
Copy-FileWithStatus "$PSScriptRoot\README.md" "$usbPath\README.md" "Installation Documentation"

# Copy Linux scripts from utils directory
Write-Host "`n🐧 Copying Linux scripts..." -ForegroundColor Cyan
$utilsPath = "$projectRoot\scripts\utils"
Copy-FileWithStatus "$utilsPath\install-clearpoint.sh" "$usbPath\install-clearpoint.sh" "Linux Installer Script"
Copy-FileWithStatus "$utilsPath\setup-cron.sh" "$usbPath\setup-cron.sh" "CRON Setup Script"
Copy-FileWithStatus "$utilsPath\start-clearpoint.sh" "$usbPath\start-clearpoint.sh" "Startup Script"
Copy-FileWithStatus "$utilsPath\status-check.sh" "$usbPath\status-check.sh" "Status Check Script"
Copy-FileWithStatus "$utilsPath\disk-check.sh" "$usbPath\disk-check.sh" "Disk Check Script"
Copy-FileWithStatus "$utilsPath\live-server.js" "$usbPath\live-server.js" "HLS Live Server"
Copy-FileWithStatus "$utilsPath\uploadVods.ts" "$usbPath\uploadVods.ts" "Video Upload Script"

# Create template .env file
Write-Host "`n⚙️ Creating template files..." -ForegroundColor Cyan
$envTemplate = @"
# Clearpoint Environment Configuration Template
# Fill in your actual values during installation

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key-here
B2_ACCOUNT_ID=your-b2-account-id
B2_APP_KEY=your-b2-app-key
BUNNY_TOKEN=your-bunny-token

# These will be filled automatically by the installer
CUSTOMER_NAME=
CAMERA_IPS=
"@

$envTemplate | Out-File -FilePath "$usbPath\.env" -Encoding UTF8
Write-Host "✅ Created: Environment Template" -ForegroundColor Green

# Create sample camera scripts (these will be customized during installation)
Write-Host "`n📹 Creating sample camera scripts..." -ForegroundColor Cyan

for ($i = 1; $i -le 4; $i++) {
    $cameraScript = @"
#!/bin/bash
# Sample Camera $i Script - Will be customized during installation
# This is a template file

CAMERA_IP="192.168.1.10$i"
CAMERA_ID="camera-$i"
OUTPUT_DIR="/home/\$USER/clearpoint-recordings"
RAM_DIR="/mnt/ram-ts"

# Create output directory if it doesn't exist
mkdir -p \$OUTPUT_DIR

echo "Starting \$CAMERA_ID recording from \$CAMERA_IP..."

# FFmpeg command for recording and streaming
ffmpeg -i "rtsp://admin:admin@\$CAMERA_IP:554/stream" \
  -c:v libx264 -preset ultrafast -crf 23 \
  -c:a aac -ar 44100 -ac 2 \
  -f segment -segment_time 900 -segment_format mp4 \
  -strftime 1 "\$OUTPUT_DIR/\$CAMERA_ID_%Y%m%d_%H%M%S.mp4" \
  -f hls -hls_time 10 -hls_list_size 3 -hls_flags delete_segments \
  "\$RAM_DIR/\$CAMERA_ID.m3u8" \
  -y
"@

    $serviceFile = @"
[Unit]
Description=Clearpoint Camera $i Service
After=network.target

[Service]
Type=simple
User=%i
WorkingDirectory=/home/%i
ExecStart=/home/%i/clearpoint-scripts/camera-$i.sh
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
"@

    $cameraScript | Out-File -FilePath "$usbPath\camera-$i.sh" -Encoding UTF8
    $serviceFile | Out-File -FilePath "$usbPath\camera-$i.service" -Encoding UTF8
}

Write-Host "✅ Created: Sample camera scripts (1-4)" -ForegroundColor Green

# Create USB installation guide
$usbGuide = @"
# 🚀 Clearpoint USB Installation Guide

## 📦 USB Contents

This USB drive contains everything needed for Clearpoint camera installation:

### Linux Installer
- `clearpoint-linux-installer.sh` - Main Ubuntu 24.04 installer
- `README.md` - Detailed documentation

### Complete File Structure

```
installer/
├── clearpoint-linux-installer.sh  # Main Ubuntu 24.04 installer
├── prepare-usb.ps1                 # USB preparation script
├── clearpoint-icon.ico             # Application icon
└── README.md                       # Ubuntu 24.04 documentation
```

### Linux Scripts
- `install-clearpoint.sh` - Main Linux installer
- `setup-cron.sh` - CRON configuration
- `start-clearpoint.sh` - Manual startup script
- `status-check.sh` - Health monitoring
- `disk-check.sh` - Disk space monitoring
- `live-server.js` - HLS streaming server
- `uploadVods.ts` - Video upload logic

### Configuration Templates
- `.env` - Environment variables template
- `camera-*.sh` - Sample camera scripts
- `camera-*.service` - Sample systemd services

## Quick Start
## 🎯 Quick Start

1. **Insert USB** into target Ubuntu 24.04 machine
2. **Open terminal** and navigate to USB
3. **Run installer**: `bash clearpoint-linux-installer.sh`
4. **Fill in configuration** (GUI or CLI)
5. **Complete Cloudflare setup** as instructed

## 📋 Required Information

Have these ready before installation:
- Customer name (for subdomain)
- Camera IP addresses
- Supabase URL and service key
- B2 storage credentials
- Bunny CDN token

## 🔧 What Gets Installed

- Ubuntu 24.04 optimized packages
- FFmpeg and latest Node.js
- Cloudflared tunnel client
- Camera recording services
- Automatic upload system
- Health monitoring
- Desktop shortcuts

## 📞 Support

For issues during installation:
1. Check system logs: `journalctl -f`
2. Verify USB files are complete
3. Ensure sudo privileges available
4. Test camera connectivity
5. Check Ubuntu version: `lsb_release -a`

Generated by Clearpoint USB Preparation Script
"@

$usbGuide | Out-File -FilePath "$usbPath\USB-INSTALLATION-GUIDE.md" -Encoding UTF8
Write-Host "✅ Created: USB Installation Guide" -ForegroundColor Green

# Create Linux autorun script
$autorun = @"
#!/bin/bash
# Clearpoint Linux Auto-installer
echo "🚀 Starting Clearpoint installer for Ubuntu 24.04..."
bash ./clearpoint-linux-installer.sh
"@

$autorun | Out-File -FilePath "$usbPath\autorun.sh" -Encoding UTF8
Write-Host "✅ Created: Linux autorun script" -ForegroundColor Green

# Copy icon if it exists
if (Test-Path "$PSScriptRoot\clearpoint-icon.ico") {
    Copy-Item "$PSScriptRoot\clearpoint-icon.ico" "$usbPath\clearpoint-icon.ico" -Force
    Write-Host "✅ Copied: Application icon" -ForegroundColor Green
}

# Summary
Write-Host "`n📊 USB Preparation Summary" -ForegroundColor Green
Write-Host "=========================" -ForegroundColor Green
Write-Host "📁 USB Path: $usbPath" -ForegroundColor Cyan
Write-Host "📦 Files copied:" -ForegroundColor Cyan

$files = Get-ChildItem $usbPath
foreach ($file in $files) {
    $size = if ($file.PSIsContainer) { "DIR" } else { "$([math]::Round($file.Length/1KB, 1)) KB" }
    Write-Host "   $($file.Name) ($size)" -ForegroundColor White
}

Write-Host "`n✅ USB preparation completed successfully!" -ForegroundColor Green
Write-Host "🎯 Ready for field installation" -ForegroundColor Cyan
Write-Host "`n📋 Next steps:" -ForegroundColor Yellow
Write-Host "1. Safely eject USB drive" -ForegroundColor White
Write-Host "2. Take to customer site (Ubuntu 24.04 machine)" -ForegroundColor White
Write-Host "3. Run: bash clearpoint-linux-installer.sh" -ForegroundColor White
Write-Host "4. Follow on-screen instructions" -ForegroundColor White

Read-Host "`nPress Enter to exit"

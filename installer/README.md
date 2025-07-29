# 📦 Clearpoint Security Camera Installer - Ubuntu 24.04

This directory contains the automated Ubuntu 24.04 installer for Clearpoint security camera systems.

## 🎯 What it does

The installer automates the entire camera setup process for **Ubuntu 24.04 LTS**:

1. **System Dependencies**: Installs FFmpeg, Node.js, npm, git, curl, and other required tools
2. **Cloudflared Setup**: Downloads and installs Cloudflare tunnel client
3. **Directory Structure**: Creates all necessary folders for recordings, scripts, and logs
4. **Camera Configuration**: Generates custom scripts and systemd services for each camera
5. **Environment Setup**: Creates `.env` file with Supabase and B2 credentials
6. **Node.js Dependencies**: Installs all required npm packages
7. **Service Management**: Enables and starts camera recording services
8. **Desktop Integration**: Creates shortcuts and menu entries

## 🚀 USB Workflow (Recommended)

### Step 1: Prepare USB Drive (From Windows/Mac)
```powershell
# Run from the installer directory
.\prepare-usb.ps1 -USBDrive "E:"
```

This creates a complete USB installer with:
- Ubuntu 24.04 native installer
- All Linux scripts from your existing setup
- Configuration templates
- Documentation

### Step 2: Field Installation (On Ubuntu 24.04)
1. Insert USB into target Ubuntu 24.04 machine
2. Open terminal and navigate to USB
3. Run: `bash clearpoint-linux-installer.sh`
4. Fill in customer configuration (GUI or CLI)
5. Wait for installation to complete
6. Complete Cloudflare tunnel setup

## 📋 USB Contents

After running `prepare-usb.ps1`, your USB will contain:

```
USB/clearpoint-installer/
├── clearpoint-linux-installer.sh  # Main Ubuntu 24.04 installer
├── README.md                       # This documentation
├── USB-INSTALLATION-GUIDE.md      # Field installation guide
├── autorun.sh                     # Auto-launch script
│
├── install-clearpoint.sh          # Your existing Linux installer
├── setup-cron.sh                  # CRON setup
├── start-clearpoint.sh            # Manual startup
├── status-check.sh                # Health monitoring
├── disk-check.sh                  # Disk monitoring
├── live-server.js                 # HLS streaming server
├── uploadVods.ts                  # Video upload logic
├── .env                           # Environment template
│
├── camera-1.sh                    # Sample camera scripts
├── camera-1.service               # Sample systemd services
├── camera-2.sh                    # (Generated for 4 cameras)
├── camera-2.service               
├── camera-3.sh                    
├── camera-3.service               
├── camera-4.sh                    
└── camera-4.service               
```

## 🖥️ System Requirements

- **OS**: Ubuntu 24.04 LTS (recommended) or 22.04 LTS
- **RAM**: Minimum 4GB, recommended 8GB+
- **Storage**: Minimum 50GB free space
- **Network**: Internet connection for initial setup
- **Cameras**: RTSP-compatible IP cameras
- **User**: Non-root user with sudo privileges

## 🔧 Installation Process

The installer performs these steps automatically:

1. **Pre-checks**: Verifies Ubuntu version and user permissions
2. **Configuration**: Collects customer details via GUI or CLI
3. **Dependencies**: Installs system packages optimized for Ubuntu 24.04
4. **Cloudflared**: Downloads and installs latest tunnel client
5. **USB Integration**: Copies and runs your existing Linux scripts
6. **Camera Setup**: Generates custom scripts for each camera IP
7. **Environment**: Creates configuration files
8. **Services**: Sets up and starts systemd services
9. **Desktop**: Creates shortcuts and menu entries

## 📝 Required Information

Have these ready before installation:

- **Customer Name**: Used for Cloudflare tunnel subdomain
- **Camera IPs**: Comma-separated list (e.g., `192.168.1.100,192.168.1.101`)
- **Supabase URL**: Your Supabase project URL
- **Supabase Service Key**: Service role key for database access
- **B2 Account ID**: Backblaze B2 storage account ID
- **B2 App Key**: Backblaze B2 application key
- **Bunny Token**: BunnyCDN token for streaming

## 🎬 After Installation

### 1. Complete Cloudflare Setup
```bash
# Login to Cloudflare
cloudflared tunnel login

# Create tunnel for customer
cloudflared tunnel create [customer-name]

# Configure tunnel (follow installer instructions)
```

### 2. Add DNS Record
In Cloudflare dashboard:
- Type: CNAME
- Name: [customer-name]
- Target: [tunnel-id].cfargotunnel.com
- Proxy: Enabled (orange cloud)

### 3. Test Camera Streams
```bash
# Check service status
sudo systemctl status camera-1.service

# View logs
journalctl -u camera-1.service -f

# Test stream URL
curl -I https://[customer-name].clearpoint.co.il/camera1/stream.m3u8
```

## 🔍 Troubleshooting

### Ubuntu Version Issues
```bash
# Check Ubuntu version
lsb_release -a

# If not 24.04, installer will warn but continue
```

### Service Issues
```bash
# Check all camera services
systemctl list-units --type=service | grep camera

# Restart a service
sudo systemctl restart camera-1.service

# Check service logs
journalctl -u camera-1.service --since "1 hour ago"
```

### Camera Connection
```bash
# Test RTSP stream manually
ffmpeg -i "rtsp://admin:admin@192.168.1.100:554/stream" -t 10 test.mp4

# Check network connectivity
ping 192.168.1.100
```

### Dependencies
```bash
# Verify FFmpeg
ffmpeg -version

# Verify Node.js
node --version
npm --version

# Verify Cloudflared
cloudflared --version
```

## 🔄 Integration with Existing Setup

The installer seamlessly integrates with your existing PC setup guide:

### Phase 1: Office Setup (Updated for Ubuntu 24.04)
1. **Prepare USB**: Run `prepare-usb.ps1` to create installer USB
2. **Test Setup**: Verify all files are copied correctly
3. **Documentation**: Review customer requirements

### Phase 2: On-Site Setup (Simplified)
1. **Insert USB**: Connect to target Ubuntu 24.04 machine
2. **Run Installer**: Execute `bash clearpoint-linux-installer.sh`
3. **Configure**: Fill in customer details and credentials
4. **Complete**: Follow Cloudflare tunnel setup

## 📁 File Structure

```
installer/
├── clearpoint-linux-installer.sh  # Main Ubuntu 24.04 installer
├── prepare-usb.ps1                # USB preparation script
├── README-Ubuntu.md               # This documentation
├── build-installer.bat            # Legacy Windows build script
├── clearpoint-icon.ico            # Application icon
└── ClearpointInstaller.ps1        # Legacy Windows installer
```

## 🔐 Security Notes

- Installer requires sudo privileges for system packages
- Credentials are stored in user's home directory only
- Services run as non-root user
- Camera streams use RAM disk for temporary files
- All network traffic goes through Cloudflare tunnel

## 📞 Support

For installation issues:

1. **Check system logs**: `journalctl -f`
2. **Verify USB files**: Ensure all scripts are present
3. **Test sudo access**: `sudo -v`
4. **Check camera connectivity**: Test RTSP streams manually
5. **Ubuntu compatibility**: Verify version with `lsb_release -a`

### Common Issues

| Issue | Solution |
|-------|----------|
| Permission denied | Run with `bash`, not `sh` |
| Missing packages | Run `sudo apt update` first |
| Service won't start | Check camera IP connectivity |
| GUI not available | Installer will fall back to CLI |
| Node.js too old | Installer will install latest LTS |

## 🎉 Success Indicators

After successful installation, you should see:

- ✅ All camera services running
- ✅ Desktop shortcuts created
- ✅ Environment file configured
- ✅ Cloudflared installed and ready
- ✅ Node.js dependencies installed

The system is then ready for Cloudflare tunnel configuration and camera streaming!

---

*Generated for Clearpoint Security Camera System - Ubuntu 24.04 Edition*

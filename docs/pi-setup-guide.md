# 🍓 Clearpoint Setup Guide – Raspberry Pi (Final Version)

## ✅ Prerequisites

Start with a clean Raspberry Pi OS install (preferably 64-bit Lite).

## 🧰 Step 1: Install Required Packages

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y ffmpeg nodejs npm curl git
sudo npm install -g typescript ts-node http-server
```

## ☁️ Step 2: Install Cloudflare Tunnel

```bash
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64.deb
sudo dpkg -i cloudflared-linux-arm64.deb
cloudflared --version
```

> Use `cloudflared-linux-armhf.deb` for older Pis

## 📁 Step 3: Insert USB and Run Installer

```bash
bash /media/pi/YOUR_USB_NAME/install-clearpoint.sh
```

This will copy files to:

* `~/clearpoint-core/`
* `~/clearpoint-scripts/`
* `~/start-clearpoint.sh`

## 💾 USB Layout Example

```
📁 USB Root
├── install-clearpoint.sh
├── clearpoint-core/
│   ├── .env
│   └── autoVodUploader.ts
└── clearpoint-scripts/
    ├── camera-[ID].sh
    └── status-check.sh
```

## 🔐 Step 4: Setup Cloudflare Tunnel

1. Login to Cloudflare:

```bash
cloudflared tunnel login
```

Follow the URL it gives and complete login.

2. Create the tunnel:

```bash
cloudflared tunnel create p5
```

This outputs a line like:

```
Tunnel credentials written to /home/pi/.cloudflared/xxxxxxxx-xxxx.json
```

Copy the full filename (UUID).

3. Create the config file:

```bash
sudo nano /etc/cloudflared/config.yml
```

Paste and update the filename:

```yaml
tunnel: p5
credentials-file: /home/pi/.cloudflared/xxxxxxxx-xxxx.json

ingress:
  - hostname: p5.clearpoint.co.il
    service: http://localhost:8080
  - service: http_status:404
```

## 🚀 Step 5: Enable Tunnel on Boot

```bash
sudo cloudflared service install
sudo systemctl enable cloudflared
sudo systemctl start cloudflared
```

## 🔧 Step 6: Add .env File

Example: `~/clearpoint-core/.env`

```ini
USER_ID=your-user-id-from-supabase
CAMERA_ID=your-camera-id-from-supabase
BUCKET=b2-bucket-name
FOLDER=footage
B2_KEY_ID=your-backblaze-key-id
B2_APP_KEY=your-backblaze-app-key
```

## 🔁 Keep Everything Running After Reboot

1. ✅ Cloudflare Tunnel will auto-start if you completed Step 5.

2. ✅ To auto-run your scripts after boot:

```bash
crontab -e
```
Add this line:

```bash
@reboot bash /home/pi/start-clearpoint.sh
```

This ensures:
- `start-clearpoint.sh` will launch your `camera-*.sh` scripts
- FFmpeg starts for all cameras
- Live stream and footage recording resumes

## 🔍 Step 7: Test Live & Uploads

- Check stream (locally):
```bash
curl http://localhost:8080/[cameraId]/stream.m3u8
```
- Check remote stream:
```bash
https://p5.clearpoint.co.il/[cameraId]/stream.m3u8
```
- Check FFmpeg is running:
```bash
ps aux | grep ffmpeg
```

## ✅ Done!

The Pi now:

* Records camera streams
* Uploads footage to Backblaze every 5 min
* Serves live video via Cloudflare
* Auto-recovers on reboot

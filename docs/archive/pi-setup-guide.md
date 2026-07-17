# 🍓 Clearpoint Setup Guide – Raspberry Pi (Final)

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

> Use `cloudflared-linux-armhf.deb` for older Raspberry Pi models

## 📁 Step 3: Insert USB and Run Installer

```bash
bash /media/pi/YOUR_USB_NAME/install-clearpoint.sh
```

This copies files to:

* `~/clearpoint-core/`
* `~/clearpoint-scripts/`
* `~/start-clearpoint.sh`

## 🗂️ USB Example Layout

```
📁 USB Root
├── install-clearpoint.sh
├── clearpoint-core/
│   ├── .env
│   └── uploadVods.ts
└── clearpoint-scripts/
    ├── camera-[ID].sh
    └── status-check.sh
```

## 🔐 Step 4: Cloudflare Tunnel Setup

```bash
cloudflared tunnel login
cloudflared tunnel create p5
```

After creating, copy the credentials file path printed.

Then:

```bash
sudo nano /etc/cloudflared/config.yml
```

Paste and modify:

```yaml
tunnel: p5
credentials-file: /home/pi/.cloudflared/xxxxxxxx-xxxx.json

ingress:
  - hostname: p5.clearpoint.co.il
    service: http://localhost:8080
  - service: http_status:404
```

Enable the tunnel to start on boot:

```bash
sudo cloudflared service install
sudo systemctl enable cloudflared
sudo systemctl start cloudflared
```

## 📋 Step 5: Manual FFmpeg Folder Creation

Run **any camera script** manually once to generate the folder structure:

```bash
bash ~/clearpoint-scripts/camera-1.sh
```

Make sure it creates:

* `~/clearpoint-recordings/[USER_ID]/footage/[CAMERA_ID]/`
* `~/clearpoint-recordings/[USER_ID]/live/[CAMERA_ID]/`

Then press Ctrl+C to stop it.

## ⚙️ Step 6: Add .env File

Place `.env` under `~/clearpoint-core/`. Example:

```ini
USER_ID=your-user-id-from-supabase
CAMERA_ID=your-camera-id-from-supabase
BUCKET=b2-bucket-name
FOLDER=footage
B2_KEY_ID=your-backblaze-key-id
B2_APP_KEY=your-backblaze-app-key
```

## 🚀 Step 7: Start Cameras and Server

```bash
bash ~/start-clearpoint.sh
```

You should see output like:

```
🚀 Starting Clearpoint cameras...
📁 Using live folder: /home/pi/clearpoint-recordings/[USER_ID]/live
▶️ Running camera-1.sh...
🌐 Starting HTTP server on port 8080...
✅ All cameras and server started!
```

## 🔁 Auto-Start After Reboot

To keep Clearpoint running after restart:

Open crontab:

```bash
crontab -e
```

Add this line:

```bash
@reboot bash /home/pi/start-clearpoint.sh
```

> This ensures camera scripts + HTTP server auto-run on every boot.

## ✅ Final Test

Reboot the Pi:

```bash
sudo reboot
```

Wait 1–2 minutes, then:

* Visit: `https://p5.clearpoint.co.il/[CAMERA_ID]/stream.m3u8`
* Or: `curl http://localhost:8080/[CAMERA_ID]/stream.m3u8`
* Confirm FFmpeg is running:

```bash
ps aux | grep ffmpeg
```

---

You're now fully set up! 🎉

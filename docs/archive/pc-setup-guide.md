# 📦 Clearpoint Mini PC Installation Flow (Updated)

This guide is split into two phases:

1. **Phase 1: Office Setup** – Prepare the Mini PC before visiting the customer.
2. **Phase 2: On-Site Setup** – Install cameras, create user, and connect everything.

---

## 🪰 Phase 1: Office Setup (Before the Customer)

### ✅ 1. Install Ubuntu Desktop 22.04 LTS

- Choose **Minimal installation**
- Enable **auto-login** (optional but recommended)

### ✅ 2. Install Required Software

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y ffmpeg nodejs npm git curl cron
sudo npm install -g ts-node
npm install express serve-static cors
```

### ✅ 3. Install Cloudflared (Tunnel Tool)

```bash
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb
cloudflared --version
```

### ✅ 4. Prepare USB with Files:

```
USB/
├── install-clearpoint.sh      # includes auto .service install and CRON
├── setup-cron.sh              # now auto-executed by installer
├── start-clearpoint.sh        # fallback launcher for testing
├── uploadVods.ts              # upload logic
├── live-server.js             # Express server for HLS
├── .env (placeholder)
├── status-check.sh            # self-heals stale streams
├── disk-check.sh              # logs disk space status
├── camera-xxxx.sh             # per-camera FFmpeg script
└── camera-xxxx.service        # per-camera systemd service
```

### ✅ 5. Run Setup from USB

```bash
bash /media/YOUR_USB/install-clearpoint.sh   # Installs everything, sets up CRON automatically
```

> No need to run `setup-cron.sh` manually. It's triggered by the installer.

### ✅ 6. Install Node Dependencies for Uploader

```bash
cd ~/clearpoint-core
npm init -y
npm install axios dotenv @supabase/supabase-js
npm install --save-dev typescript ts-node @types/node
```

### ✅ 7. (Optional) Pre-create a Tunnel (can also do on-site)

```bash
cloudflared tunnel login
cloudflared tunnel create generic-clearpoint
```

Then store the credentials file and config.

---

## 🏠 Phase 2: On-Site Customer Setup

### ✅ 1. Connect All 4 Cameras

- Access via browser: `192.168.x.x`
- Configure RTSP, username/password
- Write down the IPs

### ✅ 2. Create User and Cameras in Supabase

- Add user with assigned plan
- Add 4 cameras linked to user
- Copy `user_id` and `camera_id`s

### ✅ 3. Install Camera Services (if not done from USB)

```bash
# If not already installed via USB:
cp camera-*.sh ~/clearpoint-scripts/
sudo cp camera-*.service /etc/systemd/system/
sudo systemctl daemon-reload

# Enable + start each camera service
sudo systemctl enable camera-82015c1c.service
sudo systemctl start camera-82015c1c.service
```

> Skip this step if `install-clearpoint.sh` already handled service setup.

### ✅ 4. Update `.env`

```bash
nano ~/clearpoint-core/.env
```

Paste your real credentials:

```env
SUPABASE_URL=...
SUPABASE_SERVICE_KEY=...
B2_ACCOUNT_ID=...
B2_APP_KEY=...
BUNNY_TOKEN=...
```

### ✅ 5. Create Customer Tunnel

```bash
cloudflared tunnel login
cloudflared tunnel create customername
```

```bash
sudo mkdir -p /etc/cloudflared
sudo nano /etc/cloudflared/config.yml
```

```yaml
tunnel: customername
credentials-file: /home/YOUR_USER/.cloudflared/xxx.json

ingress:
  - hostname: customername.clearpoint.co.il
    service: http://localhost:8080
  - service: http_status:404
```

```bash
sudo cloudflared service install
sudo systemctl enable cloudflared
sudo systemctl start cloudflared
```

### ✅ 6. Add DNS Record in Cloudflare Dashboard

- Go to your domain’s DNS settings
- Add a new **CNAME** record:

  - **Name**: `customername`
  - **Target**: `[TUNNEL_ID].cfargotunnel.com`
  - Enable **Proxy (orange cloud)**

### ✅ 7. Start Everything

```bash
# Option 1: If using systemd (recommended)
sudo reboot

# Option 2: For dev/testing manually
bash ~/start-clearpoint.sh
```

Stream will now be available at:

```
https://customername.clearpoint.co.il/camera1/stream.m3u8
```

### ✅ 8. (Optional) Install Remote Access (RustDesk)

```bash
wget https://github.com/rustdesk/rustdesk/releases/download/nightly/rustdesk-1.2.3.deb
sudo dpkg -i rustdesk-1.2.3.deb
```

Write down the remote ID.

### ✅ 9. (Optional) Confirm Health Logs

```bash
cat ~/clearpoint-logs/health.log
```

Check for:

- ✅ Fresh streams (less than 60s old)
- ✅ Disk usage below 90%
- ✅ No restart errors or crash loops

---

## ✅ Final Checklist

| ✅                                         | Item |
| ------------------------------------------ | ---- |
| 🔁 Auto-reboot enabled                     |      |
| 🧠 RAM disk mounted                        |      |
| 🛱️ Cameras recording and streaming         |      |
| 🗂️ Upload script working (every 20 min)    |      |
| 🌐 Tunnel active                           |      |
| 🚀 Express HLS server working on port 8080 |      |
| 🧺 `status-check.sh` passes                |      |
| 🔐 Remote support installed                |      |
| 🌍 Cloudflare DNS record added             |      |
| 🔢 `.service` files enabled for cameras    |      |
| 🧮 `disk-check.sh` logs daily usage        |      |
| 🧾 CRON fully configured (auto)            |      |

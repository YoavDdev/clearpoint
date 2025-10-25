# 🛡️ Clearpoint Security

A comprehensive hybrid cloud security camera platform with live streaming, VOD playback, and intelligent monitoring.

## 📋 Overview

Clearpoint Security is a professional surveillance system that combines edge computing (Mini PC) with cloud storage for reliable security camera monitoring. The system supports:

- **Live Camera Streaming** - Real-time HLS streaming via Cloudflare Tunnel
- **VOD Playback** - 15-minute segmented recordings with timeline scrubbing
- **Intelligent Monitoring** - Automated health checks and proactive alerts
- **Hebrew-First UI** - Full RTL support with modern, professional design
- **Multi-Camera Support** - Up to 4 cameras per customer
- **Retention Management** - Configurable retention periods (1/7/14 days)

## 🏗️ Architecture

### System Hierarchy
```
Customer → Mini PC → Cameras (up to 4)
```

### Tech Stack
- **Frontend**: Next.js 15.3, React 19, TailwindCSS, Framer Motion
- **Backend**: Supabase (Auth + Database + RLS)
- **Streaming**: FFmpeg (HLS), live-server.js (Express)
- **Storage**: Backblaze B2 (VOD), Bunny CDN (delivery)
- **Edge**: Mini PC with auto-generated camera scripts
- **Monitoring**: Real-time health checks, email alerts (Resend)

### Key Features
- 🎥 **Live Streaming**: H.265, 720p, 10fps, 512kbps bitrate
- 📹 **VOD Recording**: 15-minute MP4 segments with auto-upload
- 🔐 **Security**: Supabase RLS, signed Bunny CDN URLs
- 📊 **Admin Dashboard**: Real-time diagnostics, camera management
- 🚨 **Proactive Alerts**: Support team notifications (NOT customer-facing)
- 🌐 **Cloudflare Tunnel**: Secure streaming per customer

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Supabase account
- Resend account (for email alerts)
- Backblaze B2 account (for storage)
- Bunny CDN account (for video delivery)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd clearpoint-security
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**
```bash
cp env.example .env.local
# Edit .env.local with your actual credentials
```

4. **Run the development server**
```bash
npm run dev
```

5. **Open the application**
```
http://localhost:3000
```

## 🔧 Environment Variables

See `env.example` for all required environment variables. Key variables:

### Required
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `RESEND_API_KEY` - Resend API key for emails
- `NEXT_PUBLIC_SITE_URL` - Your production URL

### Support Team Configuration
- `SUPPORT_TEAM_EMAILS` - Comma-separated support team emails
- `RESEND_FROM_EMAIL` - Email sender address (e.g., alerts@clearpoint.co.il)

**Important**: All alerts go to YOUR support team, NOT to end customers. This enables proactive issue resolution.

## 📁 Project Structure

```
clearpoint-security/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── admin/             # Admin dashboard & diagnostics
│   │   ├── dashboard/         # User dashboard (live + footage)
│   │   ├── api/               # API routes
│   │   └── ...
│   ├── components/            # React components
│   │   ├── admin/            # Admin-specific components
│   │   ├── ui/               # Reusable UI components
│   │   └── ...
│   ├── lib/                   # Utilities & services
│   │   ├── notifications.ts  # Email/WhatsApp alerts
│   │   ├── email-service.ts  # Email templates
│   │   └── monitoring-scheduler.ts
│   └── libs/                  # Supabase clients
├── scripts/                   # Utility scripts
│   └── utils/                # Camera setup scripts
├── docs/                      # Documentation
└── public/                    # Static assets
```

## 🎯 Key Features

### For Administrators
- **Real-time Diagnostics** - Monitor all cameras and Mini PCs
- **Health Monitoring** - CPU temp, disk usage, RAM, stream status
- **Alert Management** - Proactive notifications for issues
- **Customer Management** - CRUD operations for users
- **Camera Scripts** - Auto-generated installation scripts

### For Customers
- **Live View** - Real-time camera streaming
- **Footage Playback** - Timeline-based VOD viewer
- **Multi-Camera Grid** - View up to 4 cameras simultaneously
- **Clip Editing** - Professional timeline with trim/download
- **Fullscreen Mode** - Immersive surveillance experience

## 🔔 Alert System

The notification system is designed for **proactive customer service**:

1. System detects issues (camera offline, disk full, etc.)
2. Alerts sent to **support team** (configured in env vars)
3. Support team resolves issues **before customers notice**
4. Customers experience seamless service

**Email Recipients**: Support team only (NOT end customers)

## 📊 Database Schema

### Core Tables
- `users` - Customer accounts
- `cameras` - Camera devices
- `mini_pcs` - Edge computing devices
- `vod_files` - Video recordings metadata
- `system_alerts` - Monitoring alerts
- `support_requests` - Customer support tickets
- `subscription_requests` - New customer signups

See `docs/SUPABASE_SCHEMA_AUDIT.md` for complete schema.

## 🛠️ Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run upload-vods  # Manual VOD upload
npm run cleanup-vods # Clean expired VODs
```

## 📝 Mini PC Setup

For camera installation on Mini PC:

1. Generate camera script from admin dashboard
2. Download and run `install-clearpoint.sh` on Mini PC
3. Scripts auto-create in `~/clearpoint-scripts/`
4. Recordings saved to `~/clearpoint-recordings/`
5. Upload logic in `~/clearpoint-core/`

See `docs/pc-setup-guide.md` for detailed instructions.

## 🚨 Troubleshooting

### Common Issues

**Monitoring not working?**
- Check `NEXT_PUBLIC_SITE_URL` is set correctly
- Verify monitoring scheduler is initialized
- Check browser console for errors

**Emails not sending?**
- Verify `RESEND_API_KEY` is valid
- Check `RESEND_FROM_EMAIL` is verified in Resend
- Ensure `SUPPORT_TEAM_EMAILS` is configured

**Camera offline?**
- Check Mini PC is running
- Verify Cloudflare Tunnel is active
- Review camera health in diagnostics

## 📚 Documentation

- `docs/Task.md` - Feature checklist and backlog
- `docs/Install_checklist.md` - Installation guide
- `docs/SUPABASE_SCHEMA_AUDIT.md` - Database documentation
- `docs/camera-setup.md` - Camera configuration
- `docs/pc-setup-guide.md` - Mini PC setup

## 🔐 Security

- Supabase Row Level Security (RLS) enforced
- Signed Bunny CDN URLs (14-day expiry)
- Service role key for admin operations only
- No public camera access
- Secure password reset flow

## 🚀 Deployment

### Vercel (Recommended)
1. Connect repository to Vercel
2. Configure environment variables
3. Deploy

### Manual Deployment
```bash
npm run build
npm run start
```

## 📈 Roadmap

- [ ] Complete Plan & Support pages
- [ ] Disk usage monitoring (90% alerts)
- [ ] Upload retry logic
- [ ] WhatsApp notifications
- [ ] Multi-camera grid playback
- [ ] AI motion detection

## 🤝 Contributing

This is a private project. For questions or support, contact the development team.

## 📄 License

Proprietary - All rights reserved

---

**Built with ❤️ for professional security monitoring**

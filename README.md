# ChatApp - Real-Time Messaging Platform

A private, mutual-connection, real-time chat platform with clean onboarding, strong admin governance, and security-first design.

## 🏗 Architecture

```
/root
├── app/                 # User-facing frontend (Next.js 15)
├── admin/               # Admin dashboard (Next.js 15)
├── backend/             # API server (Express + Socket.IO)
├── packages/
│   ├── ui/              # Shared UI components
│   ├── types/           # TypeScript types
│   ├── config/          # Environment validation
│   └── utils/           # Utility functions
└── infra/               # Infrastructure configs
```

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL (Neon recommended)

### Installation

```bash
# Clone the repository
cd chat-app

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Edit .env with your credentials
```

### Database Setup

```bash
# Generate Prisma client
pnpm db:generate

# Push schema to database
pnpm db:push
```

### Development

```bash
# Run all services
pnpm dev

# Or run individually:
cd backend && pnpm dev  # API on port 4000
cd app && pnpm dev      # User app on port 3000
cd admin && pnpm dev    # Admin on port 3001
```

## 📦 Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS |
| Backend | Node.js, Express.js, Socket.IO |
| Database | PostgreSQL (Neon), Prisma ORM |
| Media | ImageKit CDN |
| Auth | JWT + Refresh Tokens, Email OTP |
| Build | Turborepo, pnpm |

## 🔐 Authentication Flow

1. **Sign Up** → Register with unique username, email, and password
2. **Email Verification** → Verify account via 6-digit OTP sent to email
3. **Profile Setup** → Display name, bio, photo
4. **Sign In** → Login using username/email and password
5. **Password Recovery** → Reset password using a secure PIN flow
6. **Enter App** → Access to chat features

## 💬 Messaging Features

- Real-time messaging via WebSocket
- Cursor-based pagination (no OFFSET)
- Message types: Text, Image, File, Sticker, View-once
- Typing indicators
- Read receipts
- Screenshot detection (best-effort)

## 👥 User Connections

- Follow request system (mutual connection)
- Only connected users can chat
- Block functionality
- Profile visibility controls

## 🛡 Admin Capabilities

- Dashboard with user stats
- User search and management
- Conversation monitoring
- User restriction controls
- Audit log tracking

## 📁 Environment Variables

```env
# Database
DATABASE_URL=postgresql://...

# JWT
JWT_SECRET=your-secret
JWT_REFRESH_SECRET=your-refresh-secret

# Email (SMTP)
SMTP_HOST=smtp.example.com
SMTP_USER=your-email
SMTP_PASS=your-password

# ImageKit
IMAGEKIT_PUBLIC_KEY=your-key
IMAGEKIT_PRIVATE_KEY=your-key
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your-id
```

## 📱 PWA Support

The user app supports installation as a Progressive Web App:
- Android: Full PWA with push notifications
- iOS: PWA with background limitations
- Desktop: Responsive design for all screen sizes

## 🔗 Subdomains (Production)

| Subdomain | Purpose |
|-----------|---------|
| app.appname.com | User application |
| admin.appname.com | Admin dashboard |
| api.appname.com | Backend API |
| docs.appname.com | Documentation |

## 📜 License

Private - All rights reserved

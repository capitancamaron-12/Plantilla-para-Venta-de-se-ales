# TCorp Email - Corporate Temporary Email Service

<div align="center">

![TCorp Email](https://img.shields.io/badge/TCorp-Email-blue?style=for-the-badge)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6.3-blue?style=flat-square&logo=typescript)
![React](https://img.shields.io/badge/React-19.2.0-61DAFB?style=flat-square&logo=react)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=flat-square&logo=node.js)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-4169E1?style=flat-square&logo=postgresql)

**Professional temporary email infrastructure for testing, development, and privacy.**

[Features](#-features) • [Installation](#-installation) • [Documentation](#-documentation) • [API](#-api) • [Contributing](#-contributing)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Technology Stack](#-technology-stack)
- [Project Structure](#-project-structure)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Development](#-development)
- [Production Deployment](#-production-deployment)
- [Admin Panel](#-admin-panel)
- [Database Management](#-database-management)
- [API Reference](#-api-reference)
- [Contributing](#-contributing)
- [Todo List](#-todo-list)
- [License](#-license)

---

## 🎯 Overview

**TCorp Email** is a corporate-grade temporary email service designed for developers, QA teams, and businesses that need reliable disposable email addresses for testing, automation, and privacy protection. Built with modern web technologies and enterprise-level security practices.

### Key Capabilities

- 🚀 **Real-time Email Delivery** via WebSockets
- 🔒 **Secure Authentication** with 2FA support
- 📊 **Admin Dashboard** with comprehensive analytics
- 💳 **Crypto Payment Integration** (NOWPayments)
- 🌐 **Multi-language Support**
- 📱 **Responsive Design** with dark mode
- ⚡ **High Performance** with React Query caching
- 🗄️ **Scalable Database** using PostgreSQL with Drizzle ORM

---

## ✨ Features

### User Features
- **Instant Inbox Creation**: Generate temporary email addresses in seconds
- **Real-time Email Reception**: WebSocket-powered instant email delivery
- **Email Management**: Read, search, and organize received emails
- **Saved Inboxes**: Bookmark frequently used temporary addresses
- **Premium Subscriptions**: Extended inbox lifetime and additional features
- **Multi-purpose Usage**: Tagged inboxes for marketing, support, testing, etc.
- **Responsive UI**: Optimized for desktop and mobile devices
- **Dark/Light Mode**: Eye-friendly theme switching

### Admin Features
- **Secure Admin Panel**: Separate authentication layer with 2FA
- **Dynamic Access Control**: Auto-rotating secure access slugs
- **CyberTemp Integration**: Manage temporary email domains
- **User Management**: View, modify, and delete user accounts
- **Email Monitoring**: Track all emails through the system
- **Domain Management**: Configure and monitor email domains
- **Activity Logs**: Comprehensive audit trail
- **IP Blocking**: Automated and manual IP blacklist management
- **Analytics Dashboard**: Real-time metrics and statistics

---

## 🛠️ Technology Stack

### Frontend
- **React 19.2.0** - UI library with latest features
- **TypeScript 5.6.3** - Type-safe development
- **Vite** - Lightning-fast build tool
- **Tailwind CSS 4** - Utility-first styling
- **Radix UI** - Accessible component primitives
- **Framer Motion** - Smooth animations
- **Wouter** - Lightweight routing
- **TanStack Query** - Data fetching and caching
- **Lenis** - Smooth scroll experience

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web application framework
- **WebSocket (ws)** - Real-time bidirectional communication
- **Drizzle ORM** - Type-safe database ORM
- **PostgreSQL** - Relational database (via Neon)
- **Passport.js** - Authentication middleware
- **Zod** - Runtime type validation
- **bcryptjs** - Password hashing

### Infrastructure & Services
- **Neon Database** - Serverless PostgreSQL
- **CyberTemp API** - Temporary email provider
- **Brevo** - Email verification service
- **NOWPayments** - Cryptocurrency payment processing

### Development Tools
- **tsx** - TypeScript execution
- **esbuild** - Fast JavaScript bundler
- **Drizzle Kit** - Database migration tool
- **ESLint** - Code linting
- **PostCSS** - CSS processing

---

## 📁 Project Structure

```
Mail-Agora/
├── client/                 # React frontend application
│   ├── public/            # Static assets
│   └── src/
│       ├── components/    # Reusable UI components
│       ├── pages/         # Page components
│       ├── lib/           # Utilities and helpers
│       └── main.tsx       # Application entry point
│
├── server/                # Express backend server
│   ├── index.ts          # Server entry point
│   ├── routes.ts         # User-facing API routes
│   ├── admin-routes.ts   # Admin API routes
│   ├── storage.ts        # Database operations
│   ├── cybertemp-service.ts  # CyberTemp integration
│   ├── blacklist-service.ts  # IP blacklist management
│   ├── logger-service.ts     # Activity logging
│   └── ...               # Other services
│
├── admin/                # Separate admin panel
│   ├── client/          # Admin frontend
│   └── server/          # Admin backend
│
├── shared/              # Shared code between client/server
│   ├── schema.ts       # Database schema definitions
│   └── models/         # Data models and types
│
├── migrations/         # Database migration files
├── scripts/           # Utility scripts
└── ...
```

---

## 🚀 Installation

### Prerequisites

- **Node.js** 18.x or higher
- **npm** 7.x or higher
- **PostgreSQL** database (recommended: Neon)

### Clone Repository

```bash
git clone https://github.com/yourusername/Mail-Agora.git
cd Mail-Agora
```

### Install Dependencies

```bash
npm install
```

---

## ⚙️ Configuration

### Environment Variables

Copy the example environment file and configure:

```bash
cp .env.example .env
```

### Required Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# Application
NODE_ENV=production
PORT=5000
APP_URL=https://tcorp.email

# Security
SESSION_SECRET=your-secret-key-here

# Email Services
BREVO_API_KEY=xkeysib-your-api-key-here
CYBERTEMP_API_KEY=tk_your-cybertemp-api-key-here

# Payment Integration
NOWPAYMENTS_API_KEY=your-nowpayments-api-key
NOWPAYMENTS_IPN_SECRET=your-ipn-secret-key

# Admin Configuration
ADMIN_PANEL_SLUG=your-secret-access-code-here
ADMIN_SESSION_SECRET=your-admin-secret-key-here
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=your-secure-password
ADMIN_SLUG_EXPIRY_HOURS=24
ADMIN_2FA_ISSUER=TCorp Admin

# Admin Panel Server (Separate Port)
ADMIN_PORT=3001
ADMIN_HOST=127.0.0.1
```

### Configuration Details

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | ✅ |
| `SESSION_SECRET` | Express session encryption key | ✅ |
| `CYBERTEMP_API_KEY` | API key from cybertemp.xyz | ✅ |
| `BREVO_API_KEY` | Email verification service key | ✅ |
| `NOWPAYMENTS_API_KEY` | Crypto payment processor | ❌ |
| `ADMIN_PANEL_SLUG` | Secret admin access code | ✅ |

---

## 💻 Development

### Start Development Server

```bash
# Start both client and server
npm run dev

# Or start separately:
npm run dev:client  # Frontend only (port 5000)
npm run dev:unix    # Backend only (Unix/Linux/Mac)
```

### Start Admin Panel (Development)

```bash
npm run admin:dev       # Windows
npm run admin:dev:unix  # Unix/Linux/Mac
```

### Database Operations

```bash
# Push schema changes to database
npm run db:push

# Create admin user
npm run create-test-user

# Generate admin access slug
npx tsx scripts/generate-admin-slug.ts
```

### Type Checking

```bash
npm run check
```

---

## 🏭 Production Deployment

### Build Application

```bash
# Build client and server
npm run build

# Build admin panel
npm run admin:build
```

### Start Production Server

```bash
# Main application
npm run start       # Windows
npm run start:unix  # Unix/Linux/Mac

# Admin panel
npm run admin:start      # Windows
npm run admin:start:unix # Unix/Linux/Mac
```

### Production Checklist

- [ ] Configure production `DATABASE_URL`
- [ ] Set strong `SESSION_SECRET` and `ADMIN_SESSION_SECRET`
- [ ] Configure `APP_URL` to production domain
- [ ] Set secure `ADMIN_PANEL_SLUG`
- [ ] Enable HTTPS/SSL certificates
- [ ] Configure firewall rules
- [ ] Set up database backups
- [ ] Configure monitoring and logging
- [ ] Test email verification flow
- [ ] Verify payment integration

---

## 🔐 Admin Panel

### Access Admin Panel

The admin panel is accessible via a **secure dynamic slug** system:

1. **Generate Access Slug**:
   ```bash
   npx tsx scripts/get-admin-slug.ts
   ```

2. **Access URL**:
   ```
   https://yourdomain.com/secure/[generated-slug]
   ```

3. **Login**:
   - Email: As configured in `ADMIN_EMAIL`
   - Password: As configured in `ADMIN_PASSWORD`
   - 2FA Code: If enabled

### Security Features

- ✅ Auto-rotating access slugs (configurable expiry)
- ✅ Two-factor authentication (2FA) support
- ✅ IP-based access control
- ✅ Comprehensive activity logging
- ✅ Separate session management
- ✅ Failed login attempt tracking

### Admin Panel Features

- **Dashboard**: System overview and analytics
- **User Management**: View and manage user accounts
- **Email Management**: Monitor all emails in the system
- **Domain Management**: Configure email domains
- **CyberTemp Integration**: Manage temporary email pools
- **Security Logs**: Audit trail of all actions
- **IP Blacklist**: Automated and manual blocking
- **Settings**: System configuration

---

## 🗄️ Database Management

### Schema Overview

The application uses **Drizzle ORM** with PostgreSQL:

- `users` - User accounts and authentication
- `admins` - Admin accounts with 2FA
- `inboxes` - Temporary email inboxes
- `emails` - Received emails
- `saved_inboxes` - User-saved temporary addresses
- `user_subscriptions` - Premium subscriptions
- `admin_logs` - Comprehensive audit logs
- `admin_slugs` - Dynamic admin access tokens
- `blocked_ips` - IP blacklist
- `email_domains` - Managed domains
- `temp_emails` - CyberTemp integration
- `cybertemp_subdomains` - Available subdomains

### Migrations

```bash
# Generate migration
npx drizzle-kit generate

# Apply migration
npx tsx scripts/apply-migration.ts

# Push schema without migration
npm run db:push
```

---

## 📡 API Reference

### User Endpoints

#### Create Inbox
```http
POST /api/inboxes
Content-Type: application/json

{
  "email": "user@domain.com",
  "expiresAt": "2024-12-31T23:59:59Z"
}
```

#### Get Inbox Emails
```http
GET /api/inboxes/:id/emails
```

#### WebSocket Connection
```javascript
const ws = new WebSocket('ws://localhost:5000');
ws.send(JSON.stringify({ 
  type: 'subscribe', 
  inboxId: 'inbox-uuid' 
}));
```

### Admin Endpoints

All admin endpoints require authentication via session cookies.

#### Get Users
```http
GET /api/admin/users
```

#### Get System Stats
```http
GET /api/admin/stats
```

#### Block IP Address
```http
POST /api/admin/block-ip
Content-Type: application/json

{
  "ipAddress": "1.2.3.4",
  "reason": "Suspicious activity"
}
```

---

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit your changes**: `git commit -m 'Add amazing feature'`
4. **Push to branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

### Development Guidelines

- Follow existing code style and conventions
- Write type-safe TypeScript code
- Add comments for complex logic
- Test thoroughly before submitting
- Update documentation as needed

---

## 📝 Todo List

### 🔴 Critical Issues

- [ ] **Fix TypeScript Errors** (3 errors)
  - [ ] Add `delete_email` to `LogAction` type in `server/logger-service.ts:6-8`
  - [ ] Add `ip_blocked_manually` to `LogAction` type
  - [ ] Add `ip_unblocked` to `LogAction` type

### 🟡 High Priority

- [ ] **Main Page**
  - [ ] Fix login redirect behavior
  - [ ] Resolve loading screen navigation issues between pages
  
- [ ] **Localization**
  - [ ] Add more language options
  - [ ] Complete existing translations (Spanish, English, etc.)

### 🟢 Medium Priority

- [ ] **Legal & Compliance**
  - [ ] Expand Terms of Service content
  - [ ] Add more comprehensive privacy policy sections
  
- [ ] **UI/UX Improvements**
  - [ ] Create advertising placeholders for monetization
  - [ ] Improve mobile responsiveness

### 🔵 Future Enhancements

- [ ] Add email forwarding functionality
- [ ] Implement email filtering and rules
- [ ] Add browser extension
- [ ] API rate limiting improvements
- [ ] Enhanced analytics dashboard
- [ ] Email attachment support
- [ ] Custom domain support for premium users
- [ ] Automated testing suite
- [ ] Performance monitoring and metrics
- [ ] CDN integration for static assets

---

## 📄 License

**MIT License**

Copyright © 2024 TCorp Systems Inc. All rights reserved.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

---

## 📞 Support

- **Documentation**: [docs.tcorp.email](https://docs.tcorp.email)
- **Issues**: [GitHub Issues](https://github.com/yourusername/Mail-Agora/issues)
- **Email**: support@tcorp.email
- **Website**: [tcorp.email](https://tcorp.email)

---

<div align="center">

**Built with ❤️ by the TCorp Team**

[⬆ Back to Top](#tcorp-email---corporate-temporary-email-service)

</div>

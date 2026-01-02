# TCorp - Temporary Email Infrastructure

## Overview

TCorp is a corporate-grade temporary email infrastructure service. It provides ephemeral email addresses for privacy-focused use cases, featuring real-time email delivery via WebSockets, automatic inbox expiration, and a bilingual (Spanish/English) interface. The application is designed as a professional SaaS product with a modern, minimalist corporate design.

**Updated: December 22, 2025 - Full CyberTemp API Integration**

## Recent Changes (December 22, 2025)

- **CyberTemp API Integration**: Fully integrated CyberTemp API for:
  - Domain management with real-time availability checking
  - Temporary subdomain creation for unlimited email usage
  - Email retrieval and management
  - Plan/quota information
- **API Endpoints Added**:
  - `GET /api/cybertemp/domains` - Get available domains from CyberTemp
  - `GET /api/cybertemp/plan` - Get current plan status and API quotas
  - Updated `/api/inbox` endpoint to use CyberTemp domains dynamically
- **Email Service**: Updated to use CyberTemp infrastructure (noreply@cybertemp.xyz)
- **Service Configuration**: Uses CYBERTEMP_API_KEY environment variable for API authentication

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight alternative to React Router)
- **State Management**: TanStack React Query for server state
- **Styling**: Tailwind CSS v4 with custom CSS variables for theming
- **UI Components**: shadcn/ui component library (New York style variant)
- **Animations**: Framer Motion for page transitions and loading states
- **Internationalization**: Custom i18n context with Spanish/English support

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript with ES modules
- **Real-time**: WebSocket server (ws library) for live email notifications
- **API Design**: RESTful endpoints under `/api` prefix
- **Build System**: Vite for client, esbuild for server bundling
- **External Service**: CyberTemp API for temporary email infrastructure

### Data Layer
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Database**: Neon Serverless PostgreSQL
- **Schema Validation**: Zod with drizzle-zod integration
- **Schema Location**: Shared schema in `shared/schema.ts` for type safety across client/server

### Database Schema
Main tables:
- `inboxes`: Stores temporary email addresses with expiration timestamps and owner user ID
- `emails`: Stores received emails linked to inboxes with cascade delete
- `users`: User accounts with email verification
- `admins`: Administrator accounts (separate from users)
- `sessions`: User session storage
- `admin_sessions`: Admin session storage (isolated from users)
- `saved_inboxes`: Links users to their saved inboxes with custom aliases
- `user_subscriptions`: Tracks user subscription status (free/premium)
- `subscription_transactions`: Records cryptocurrency payment transactions

### Project Structure
```
├── client/src/          # React frontend
│   ├── components/ui/   # shadcn/ui components
│   ├── pages/           # Route components
│   ├── hooks/           # Custom React hooks
│   └── lib/             # Utilities, i18n, query client
├── server/              # Express backend
│   ├── routes.ts        # API endpoints and WebSocket setup
│   ├── storage.ts       # Database operations
│   ├── cybertemp-service.ts  # CyberTemp API client
│   ├── email.ts         # Email utility functions
│   └── db.ts            # Drizzle database connection
├── shared/              # Shared types and schema
└── migrations/          # Drizzle database migrations
```

### Key Design Decisions

**Monorepo with Shared Types**: The `shared/` directory contains database schema and types used by both client and server, ensuring type safety across the full stack.

**WebSocket for Real-time Updates**: Email notifications are pushed to connected clients instantly via WebSocket connections, identified by inbox ID.

**Automatic Expiration**: Inboxes have a 1-hour lifetime by default, with automatic cleanup of expired data.

**Static Serving in Production**: The Express server serves the built Vite client in production mode, with development using Vite's middleware for HMR.

**CyberTemp Integration**: Uses CyberTemp's unlimited API for domain availability, subdomain creation, and email management without rate limits.

## External Dependencies

### Temporary Email Service (CyberTemp)
- **API**: CyberTemp API (https://api.cybertemp.xyz)
- **Documentation**: https://www.cybertemp.xyz/api-docs
- **Connection**: Requires `CYBERTEMP_API_KEY` environment variable
- **Features**:
  - Unlimited API calls
  - Temporary subdomains without expiration limits
  - Real-time email retrieval
  - No rate limiting
- **Endpoints Used**:
  - `GET /getDomains` - Get list of available domains
  - `POST /getMail` - Retrieve emails for an address
  - `POST /createSubdomain` - Create temporary subdomains
  - `GET /getPlan` - Get plan information and quotas

### Database
- **Neon Serverless PostgreSQL**: Cloud-hosted PostgreSQL with WebSocket connections
- **Connection**: Requires `DATABASE_URL` environment variable

### Frontend Libraries
- **Radix UI**: Headless UI primitives for accessible components
- **Embla Carousel**: Carousel functionality
- **date-fns**: Date manipulation
- **cmdk**: Command palette component

### Build & Development
- **Vite**: Frontend build tool with HMR
- **esbuild**: Server bundling for production
- **Drizzle Kit**: Database migrations (`npm run db:push`)

### Replit-Specific
- **@replit/vite-plugin-runtime-error-modal**: Error overlay in development
- **@replit/vite-plugin-cartographer**: Development tooling
- **@replit/vite-plugin-dev-banner**: Development environment indicator

## Admin Panel

### ⚡ EPHEMERAL CREDENTIALS SYSTEM

**IMPORTANTE**: Admin username y password NO se guardan en la base de datos. Se generan AUTOMÁTICAMENTE cada 24 horas.

### 🔄 Automatic Rotation (Every 24 Hours)

El sistema verifica cada minuto si el slug expiró:
1. **Si expiró**: Genera un slug nuevo (64 caracteres hex aleatorio)
2. **Deactiva**: Todos los slugs anteriores (solo 1 activo a la vez)
3. **Genera**: Nuevas credenciales derivadas del slug (HMAC-SHA256)
4. **Notifica**: Envía email con el nuevo acceso si `ADMIN_EMAIL` está configurado
5. **Registra**: Todo en los logs de la consola

**Timeline**:
- ✅ Slug actual expira: 23 Dec 2025 01:48 AM
- ✅ Siguiente rotación: 24 Dec 2025 01:48 AM
- ✅ Y así automáticamente cada 24 horas

### Security Features
- **Dynamic URL Slug**: Admin panel is only accessible via a randomly generated 64-character hex slug that rotates automatically
- **Ephemeral Credentials**: Username y password se derivan del slug actual usando HMAC (NO se guardan)
- **Automatic Slug Rotation**: Slugs expire and regenerate every 24 hours (configurable via `ADMIN_SLUG_EXPIRY_HOURS`)
- **Single Active Slug**: Solo UN slug funcional a la vez (previene enumeración)
- **IP Whitelist**: Access is restricted to authorized IP addresses only; managed in the Security tab
- **Separate Sessions**: Admin sessions are isolated from user sessions using different cookies and session stores
- **Rate Limiting**: 5 login attempts per 15 minutes per IP address
- **No Discoverable Routes**: The admin panel cannot be found by scanning - there are no static admin URLs
- **Email Notifications**: When a new slug is generated, the admin receives an email with the new access link (via CyberTemp)
- **Bcrypt Slug Hashing**: Slugs are stored as bcrypt hashes, never in plain text

### Configuration
Required environment variables:
- `ADMIN_EMAIL`: Email address for receiving new slug notifications (STRONGLY RECOMMENDED)
- `ADMIN_SLUG_EXPIRY_HOURS`: How long each slug is valid (default: 24 hours)
- `ADMIN_SESSION_SECRET`: Separate secret for admin sessions (optional, falls back to SESSION_SECRET)

### How It Works

**Credential Derivation** (no database storage):
```
slug = "93c3fdfbc8ad440b8c472963d33e632ab5ce9a389830ca1bbea71aa16af0c16b"
username = HMAC-SHA256(slug, "username-salt") → "admin_37c0ad149538"
password = HMAC-SHA256(slug, "password-salt") → "621d61ee7d414ecb"
```

Each slug produces DIFFERENT credentials. When slug rotates (every 24h):
- Old slug: ❌ INVALID (deactivated)
- New slug: ✅ VALID (active)
- New credentials: ✅ DERIVED from new slug

**Login Flow**:
1. Admin recibe email con: `/secure/{slug}`, username, password
2. Accede a `/secure/{slug}`
3. Ingresa username y password
4. Sistema verifica:
   - ¿Es válido el slug? (bcrypt comparison)
   - ¿Coinciden username/password con derivación actual? (HMAC)
5. Si ambos válidos → sesión creada

**Auto-Rotation**:
```
[Server] Cada minuto:
├─ ¿Slug expiró?
│  ├─ NO → continúa
│  └─ SÍ →
│     ├─ Genera nuevo slug
│     ├─ Deactiva todos los anteriores
│     ├─ Deriva nuevas credenciales
│     ├─ Envía email
│     └─ Registra en logs
```

### Database Tables
- `admin_slugs`: Stores hashed slugs with expiration and notification status
- `admin_ip_whitelist`: Authorized IP addresses for admin access

### Creating First Admin
The first admin is created automatically on server start if none exists. Default: admin@tempmail.pro

### Accessing Admin Panel
1. Receive the access URL via email when the slug rotates
2. Navigate to: `https://your-domain.com/secure/{slug}`
3. Enter admin email and password
4. After first login, add your IP to the whitelist in the Security tab

## Saved Inboxes & Premium Subscription

### Features
- **Saved Inboxes**: Users can save temporary emails to their account with custom aliases
- **Free Tier**: 5 saved inboxes limit
- **Premium Tier**: Unlimited saved inboxes for $2 USD/month
- **Crypto Payments**: Subscription payments via NOWPayments (Bitcoin, Ethereum, USDT, 300+ cryptos)

### User Flow
1. User creates a temporary inbox in `/inbox`
2. User clicks "Guardar" button to save the inbox with a custom alias
3. Saved inboxes are accessible via `/account` page
4. Free users see their 5-inbox limit; premium users have unlimited storage
5. Users can upgrade to premium via crypto payment

### Technical Implementation
- **API Endpoints**:
  - `GET /api/saved-inboxes` - List user's saved inboxes with quota info
  - `POST /api/saved-inboxes` - Save an inbox (enforces ownership and limits)
  - `PATCH /api/saved-inboxes/:id` - Update alias
  - `DELETE /api/saved-inboxes/:id` - Remove saved inbox
  - `GET /api/subscription` - Get subscription status
  - `POST /api/subscription/checkout` - Create NOWPayments invoice
  - `POST /api/subscription/webhook` - Handle payment confirmations

### Site Status
- **Status Page**: https://status.tcorp.email
- **Health Endpoint**: `/api/health` (Monitored via Better Stack)
- `NOWPAYMENTS_API_KEY`: API key from NOWPayments.io dashboard
- `APP_URL`: Base URL for webhooks (e.g., https://tcorp.replit.app)

### Security
- Inbox ownership verification: Users can only save inboxes they created
- Defensive checks prevent making orphaned inboxes permanent
- Webhook idempotency via transaction table to prevent replay attacks

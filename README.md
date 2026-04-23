# Collier Legacy Vault

A secure family legacy vault built with Next.js 15 and Cloudflare Pages + D1.

## Overview

This application provides:
- A private portal for designated family members to verify their identity
- A dead man's switch system — when someone verifies, you receive a notification and have 24 hours to cancel before vault access is automatically granted
- Encrypted storage for personal and business documents
- Full audit logging of all system events

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Runtime**: Cloudflare Pages with `@cloudflare/next-on-pages`
- **Database**: Cloudflare D1 (SQLite)
- **Storage**: Cloudflare R2 (for files)
- **Email**: Resend
- **Notifications**: Telegram Bot API
- **Encryption**: AES-256-GCM (Web Crypto API)
- **Auth**: JWT via `jose`
- **Password hashing**: `bcryptjs`

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local` with your values:

| Variable | Description |
|---|---|
| `JWT_SECRET` | Long random string for JWT signing |
| `ENCRYPTION_KEY` | 64-char hex string (32 bytes) for AES-256 |
| `RESEND_API_KEY` | Your Resend API key |
| `FROM_EMAIL` | Verified sender email in Resend |
| `APP_URL` | Public URL of the app |
| `TELEGRAM_BOT_TOKEN` | Optional: Telegram bot for notifications |
| `CRON_SECRET` | Optional: Secret to protect cron endpoint |

Generate secure keys:
```bash
# JWT Secret
openssl rand -base64 64

# Encryption Key (64 hex chars)
openssl rand -hex 32
```

### 3. Create Cloudflare D1 database

```bash
# Create the database
wrangler d1 create collier-legacy-vault-db

# Copy the database_id from output into wrangler.toml
```

### 4. Run migrations

```bash
# Apply schema
wrangler d1 execute collier-legacy-vault-db --file=migrations/0001_initial.sql

# Seed categories
wrangler d1 execute collier-legacy-vault-db --file=migrations/0002_seed_categories.sql
```

For local development:
```bash
wrangler d1 execute collier-legacy-vault-db --local --file=migrations/0001_initial.sql
wrangler d1 execute collier-legacy-vault-db --local --file=migrations/0002_seed_categories.sql
```

### 5. Create the first admin account

```bash
# Generate a bcrypt hash for your password
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('yourpassword', 10).then(h => console.log(h))"

# Insert admin into database
wrangler d1 execute collier-legacy-vault-db --command "INSERT INTO admin (id, email, password_hash) VALUES (lower(hex(randomblob(16))), 'joshua@middletnchristmaslights.com', '<hash>')"
```

### 6. Set Cloudflare secrets

```bash
wrangler secret put JWT_SECRET
wrangler secret put ENCRYPTION_KEY
wrangler secret put RESEND_API_KEY
wrangler secret put TELEGRAM_BOT_TOKEN
wrangler secret put CRON_SECRET
```

### 7. Run locally

```bash
npm run dev
```

This uses `@cloudflare/next-on-pages` in dev mode to simulate the Cloudflare environment locally.

### 8. Deploy

```bash
npm run build
npx @cloudflare/next-on-pages
wrangler pages deploy .vercel/output/static
```

## Pages

| Route | Description |
|---|---|
| `/` | Landing page — enter your name to begin |
| `/verify/[personId]` | Challenge questions page |
| `/api/switch/cancel?token=xxx` | Cancel a pending switch event |
| `/admin` | Admin login |
| `/admin/dashboard` | Admin dashboard with stats |
| `/admin/people` | Manage people and their challenge questions |
| `/admin/vault` | Manage vault categories and entries |
| `/admin/switch` | View switch event status and history |
| `/admin/audit` | Paginated audit log |

## API Routes

| Method | Route | Description |
|---|---|---|
| POST | `/api/verify-name` | Look up person by name |
| GET | `/api/questions/[personId]` | Get challenge questions |
| POST | `/api/verify-answers` | Submit answers and trigger switch |
| GET | `/api/switch/cancel` | Cancel switch via token link |
| POST | `/api/cron/check-switches` | Cloudflare cron: process expired switches |
| GET | `/api/health` | Health check |
| GET/POST | `/api/admin/people` | List/create people |
| GET/PUT/DELETE | `/api/admin/people/[id]` | Get/update/delete person |
| GET/POST | `/api/admin/vault/categories` | List/create categories |
| GET/POST | `/api/admin/vault/entries` | List/create entries |
| GET/PUT/DELETE | `/api/admin/vault/entries/[id]` | Get/update/delete entry |
| GET | `/api/admin/switch` | List switch events |
| GET | `/api/admin/audit` | Paginated audit log |

## Security Notes

- All vault data is encrypted with AES-256-GCM before storage
- Challenge question answers are hashed with bcrypt
- Admin sessions use signed JWT cookies (httpOnly, sameSite=lax)
- IPs that fail 3 challenge verifications in 1 hour are locked out
- All admin routes are protected by middleware JWT verification
- The `/api/switch/cancel` endpoint uses single-use tokens
- The cron endpoint can be protected with a `CRON_SECRET`

## Vault Categories

The vault is pre-seeded with 23 categories:

**Personal (12):** Personal Identification, Emergency Contacts, Legal Documents, Financial Accounts, Insurance Policies, Property & Assets, Debts & Liabilities, Digital Assets & Passwords, Tax Information, Funeral & Burial Wishes, Monthly Bills & Subscriptions, Phone & Device Access

**Business/Full (11):** MTCL Business Overview, Business Succession Plan, Business Financial Accounts, Business Insurance, Client Database Access, Vehicle Fleet & GPS, Vendor Accounts, Website & Hosting, Technology Infrastructure, Haven Lighting, ServiceVault Pro
# Trigger rebuild

# Collier Legacy Vault — Build Spec for Samantha
## Project: jcollier-legacy.com
## Date: 2026-04-22
## Assigned by: Terry (Orchestrator)

---

## OVERVIEW
Build a digital dead man's switch + legacy vault web application. When Josh dies or becomes incapacitated, his family can access his entire digital life through a secure portal with challenge questions, a 24-hour dead man's switch, personalized video messages, and a full credential/document vault.

**Domain:** jcollier-legacy.com (registered on Cloudflare)
**Deploy target:** Cloudflare Pages + Workers + R2
**Stack:** Next.js 14+ (App Router), TypeScript, Tailwind CSS, Cloudflare D1 (SQLite), Cloudflare R2 (file storage), Resend (transactional email)

---

## USER FLOW

### Public Flow (Family Access)
1. Family member visits jcollier-legacy.com
2. Clean, respectful landing page — no indication of what it is to outsiders. Simple "Enter your name" field.
3. Name must EXACTLY match one of 5 pre-configured authorized people (case-insensitive)
4. If name matches → show 5 challenge questions (unique per person, configured by admin)
5. All 5 must be correct (case-insensitive, trimmed) — 3 failed attempts = 1 hour lockout by IP
6. All correct → "Verification submitted. You will receive an email within 24 hours."
7. Dead man's switch fires (see below)
8. If switch expires (24hr no response from Josh):
   a. Triggering person gets email with link to create their account (set password)
   b. ALL other authorized people get their own email containing:
      - Josh's personal written message for that specific person
      - Link to create their own account
   c. All accounts are at their configured access tier
9. Once account is created, user logs in with email + password
10. Dashboard shows vault categories they have access to
11. Video messages section — can see all video messages from Josh (viewable by everyone)
12. Can return and log in anytime

### Admin Flow (Josh)
1. Josh logs in at jcollier-legacy.com/admin (separate auth — email + password + optional 2FA)
2. Admin dashboard:
   - **People Management:** Add/edit/remove authorized people, set their challenge questions + answers, set access tier (FULL or PERSONAL), set their email, write personal email message
   - **Vault Management:** Add/edit/remove vault entries organized by category. Each entry has: title, category, type (login/document/note/file), fields (username, password, URL, notes), optional file attachment
   - **Video Management:** Upload video files per person (stored in R2, encrypted)
   - **Email Messages:** Write the personal email that each person receives when the switch triggers
   - **Dead Man's Switch:** View status, test mode (sends test notification without triggering real switch), view history of all trigger attempts
   - **Audit Log:** All access attempts, logins, vault views — timestamped with IP
   - **System Health:** Last heartbeat ping, notification channel status

---

## DATABASE SCHEMA (Cloudflare D1)

```sql
-- Authorized people
CREATE TABLE people (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL, -- "Leann Collier"
  email TEXT NOT NULL,
  access_tier TEXT NOT NULL DEFAULT 'PERSONAL', -- 'FULL' or 'PERSONAL'
  password_hash TEXT, -- bcrypt, set when account is activated
  is_activated INTEGER NOT NULL DEFAULT 0,
  activated_at TEXT,
  personal_email_message TEXT, -- Josh's written message to this person
  video_url TEXT, -- R2 key for their video
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Challenge questions per person
CREATE TABLE challenge_questions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  person_id TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  question_order INTEGER NOT NULL, -- 1-5
  question TEXT NOT NULL,
  answer_hash TEXT NOT NULL, -- bcrypt hash of lowercase trimmed answer
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Vault categories
CREATE TABLE vault_categories (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL, -- "Financial Accounts"
  icon TEXT, -- emoji or icon name
  sort_order INTEGER NOT NULL DEFAULT 0,
  access_tier TEXT NOT NULL DEFAULT 'PERSONAL', -- minimum tier to view
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Vault entries
CREATE TABLE vault_entries (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  category_id TEXT NOT NULL REFERENCES vault_categories(id) ON DELETE CASCADE,
  title TEXT NOT NULL, -- "Chase Checking Account"
  entry_type TEXT NOT NULL DEFAULT 'note', -- 'login', 'document', 'note', 'file'
  -- Encrypted fields (AES-256-GCM, key derived from app secret)
  encrypted_data TEXT NOT NULL, -- JSON blob: {username, password, url, notes, custom_fields[]}
  file_keys TEXT, -- JSON array of R2 keys for attached files
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Dead man's switch events
CREATE TABLE switch_events (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  person_id TEXT NOT NULL REFERENCES people(id),
  triggered_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL, -- triggered_at + 24 hours
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'cancelled', 'expired', 'granted'
  cancel_token TEXT, -- unique token Josh clicks to cancel
  ip_address TEXT,
  user_agent TEXT,
  resolved_at TEXT
);

-- Access attempts (audit log)
CREATE TABLE audit_log (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  event_type TEXT NOT NULL, -- 'name_lookup', 'challenge_attempt', 'challenge_success', 'challenge_fail', 'switch_trigger', 'switch_cancel', 'switch_expire', 'login', 'vault_view', 'admin_login'
  person_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  details TEXT, -- JSON
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Admin user (Josh)
CREATE TABLE admin (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  totp_secret TEXT, -- optional 2FA
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Sessions
CREATE TABLE sessions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  person_id TEXT, -- NULL for admin sessions
  is_admin INTEGER NOT NULL DEFAULT 0,
  token_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

---

## DEAD MAN'S SWITCH LOGIC

### Trigger Flow
1. Person passes challenge questions
2. Create `switch_events` row with status='pending', expires_at = now + 24 hours, generate unique cancel_token
3. Send THREE notifications simultaneously:
   - **Email** to Josh's monitored inbox (joshua@middletnchristmaslights.com) with cancel link containing the token
   - **Telegram** message to Josh (chat_id: 5588600680) — "⚠️ LEGACY VAULT: [Person Name] has triggered the dead man's switch. Click to cancel: [link]"
   - **Telegram** message to Terry bot — "⚠️ LEGACY VAULT ALERT: Dead man's switch triggered by [Person Name]. 24-hour countdown started. Monitoring."
4. Show person: "Verification submitted. You will receive an email within 24 hours."

### Cancel Flow
- Josh clicks the link with cancel_token → hits API endpoint
- Validates token, marks switch_events status='cancelled', resolved_at=now
- Person sees nothing (they just never get the access email)
- Cooldown: same person can't re-trigger for 7 days

### Expiry Flow (Cloudflare Worker Cron)
- Cron runs every 5 minutes
- Checks for switch_events where status='pending' AND expires_at < now
- For each expired event:
  1. Mark status='expired' (then 'granted')
  2. Send activation email to triggering person (link to set password)
  3. Send personal emails to ALL other authorized people with:
     - Josh's personal message for them
     - Link to set up their account
  4. Log everything in audit_log

### Health Heartbeat
- Cloudflare Worker cron pings Terry daily (or Terry pings the portal health endpoint)
- If health check fails for 48+ hours → Terry alerts Josh

---

## ENCRYPTION

- All vault entry data (passwords, account numbers, notes) encrypted with AES-256-GCM
- Encryption key: derived from an app-level secret stored as Cloudflare environment variable (NOT in code)
- Challenge question answers: bcrypt hashed (one-way, can't be extracted)
- User passwords: bcrypt hashed
- Files in R2: encrypted before upload using same app-level key
- Admin password: bcrypt hashed
- Session tokens: random 32-byte, stored as SHA-256 hash

---

## VAULT CATEGORIES (Pre-seed)

### PERSONAL tier (everyone sees):
1. 📋 Personal Identification
2. 📞 Emergency Contacts
3. ⚖️ Legal Documents
4. 🏦 Financial Accounts
5. 🛡️ Insurance Policies
6. 🏠 Property & Assets
7. 💳 Debts & Liabilities
8. 🔐 Digital Assets & Passwords
9. 📊 Tax Information
10. ⚱️ Funeral & Burial Wishes
11. 📅 Monthly Bills & Subscriptions
12. 📱 Phone & Device Access

### FULL tier (Leann / primary accessor only):
13. 🏢 MTCL Business Overview
14. 📝 Business Succession Plan
15. 🏦 Business Financial Accounts
16. 🛡️ Business Insurance
17. 👥 Client Database Access
18. 🚛 Vehicle Fleet & GPS
19. 🏪 Vendor Accounts
20. 🌐 Website & Hosting
21. 🖥️ Technology Infrastructure
22. 💡 Haven Lighting
23. 🔒 ServiceVault Pro

---

## EMAIL TEMPLATES (Resend)

### 1. Dead Man's Switch — Notify Josh
Subject: "⚠️ Legacy Vault Access Requested by [Name]"
Body: "[Name] has passed verification and triggered the dead man's switch. You have 24 hours to cancel. Click here to cancel: [link]. If you do not respond, [Name] will be granted access."

### 2. Access Granted — To Triggering Person
Subject: "Access Granted — Collier Legacy Vault"
Body: "You now have access to the Collier Legacy Vault. Click below to create your account and set a password. [link]"

### 3. Personal Message — To All Others
Subject: "A message from Josh"
Body: "[Josh's personal written message for this person]. You can also access the vault to view video messages and important information. Click below to create your account. [link]"

---

## UI DESIGN

- Clean, minimal, respectful design. Dark mode default (charcoal/slate, not pure black).
- Inspired by the "When I Die Folder" checklist layout Josh liked — card-based categories with icons
- Landing page: centered card, "Enter your full name" input, subtle. No branding that screams "dead person's vault"
- Challenge questions page: clean form, 5 questions stacked
- Vault dashboard: sidebar with categories (icons + names), main area shows entries in the selected category
- Each vault entry: expandable card showing title, then reveals fields (username, password with show/hide toggle, URL as clickable link, notes, attachments)
- Video messages page: grid of video thumbnails with person's name, click to play
- Admin panel: clean dashboard with sidebar nav (People, Vault, Videos, Emails, Switch Status, Audit Log, Settings)
- Mobile responsive (family might access from phone)

---

## TECH DETAILS

### Cloudflare Pages
- Next.js static + server-side via Cloudflare Workers (next-on-pages or @cloudflare/next-on-pages)
- Environment variables for secrets (encryption key, Resend API key, admin credentials)

### Cloudflare D1
- SQLite at the edge
- Accessed via Workers bindings

### Cloudflare R2
- Video storage (could be large — up to 5GB per video)
- Document/file attachments
- Encrypted before upload

### Resend
- API key: re_74cLRm7v_A4dHhRLu5D3vDq7ZvtimRav3
- From: noreply@jcollier-legacy.com (need to verify domain in Resend) OR noreply@servicevaultpro.com initially
- Templates defined above

### Telegram Notifications
- Josh chat_id: 5588600680
- Terry notification: via OpenClaw cron/webhook (Terry will set this up separately)

---

## BUILD ON BEAST
- Repo: /mnt/e/openclaw/repos/collier-legacy-vault/
- Git: initialize, push to TerryMTCL/collier-legacy-vault on GitHub
- Deploy: Cloudflare Pages connected to GitHub repo (auto-deploy on push to main)

---

## DELIVERABLES
1. Working Next.js app deployed to jcollier-legacy.com
2. Admin panel at /admin with ability to manage everything
3. Challenge question verification system
4. Dead man's switch with triple notification
5. Encrypted vault with all 23 categories pre-seeded
6. Video upload + playback
7. Email system (Resend) with all 3 templates
8. Audit logging
9. Mobile responsive
10. README with setup instructions

---

## PRIORITY ORDER
1. Core app structure + Cloudflare Pages deploy (get something live on the domain)
2. Admin auth + admin panel (so Josh can start entering data)
3. People management + challenge questions
4. Dead man's switch logic
5. Vault categories + entry management
6. Email integration
7. Video upload + playback
8. Audit log + health monitoring
9. Polish + mobile responsive
10. Security hardening + testing

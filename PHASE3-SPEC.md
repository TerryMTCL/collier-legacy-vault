# Phase 3 — Video Upload, File Upload, and Telegram Notification Improvements

## Context
- App is LIVE at https://jcollier-legacy.com
- D1 database migrated (8 tables, 23 vault categories)
- Admin account exists (josh@jcollier-legacy.com)
- Telegram bot token set (using existing OpenClaw bot)
- Email sending via noreply@servicevaultpro.com (Resend)
- R2 bucket exists: `collier-legacy-vault-files` (binding: `VAULT_FILES`)

## Task 1: Video Upload + Playback Per Person

### Admin Side (upload)
- In the People admin page (`/admin/people`), add a "Upload Video" button for each person
- Upload video file → store in R2 under `videos/{person_id}/{filename}`
- Save the R2 key as `video_url` in the `people` table
- Accept: .mp4, .mov, .webm — max 500MB
- Show upload progress bar
- After upload, show video preview with play button
- Allow replacing video (overwrites in R2, updates DB)

### Recipient Side (playback)
- When vault is activated and a person logs in, their dashboard should show Josh's video message prominently at the top
- Use HTML5 `<video>` player with controls
- Video served via an API route that streams from R2 (don't expose R2 URLs directly)
- Route: `GET /api/vault/video/{person_id}` — requires auth, checks access tier

### API Routes Needed
- `POST /api/admin/people/[id]/video` — upload video to R2
- `DELETE /api/admin/people/[id]/video` — remove video from R2
- `GET /api/vault/video/[personId]` — stream video (authenticated)

## Task 2: File/Document Upload to R2

### Admin Side
- In vault entry forms, when entry_type is "document" or "file":
  - Show a file upload zone (drag & drop or click)
  - Upload file → R2 under `vault/{category_id}/{entry_id}/{filename}`
  - Store the R2 key in the `file_keys` JSON field on vault_entries
  - Accept: any file type, max 100MB per file, max 5 files per entry
  - Show uploaded files list with download/delete buttons

### Recipient Side
- When viewing a vault entry of type "document"/"file", show download links
- Files served via authenticated API route (not direct R2 URLs)
- Route: `GET /api/vault/files/{entry_id}/{filename}` — requires auth + tier check

### API Routes Needed
- `POST /api/admin/vault/entries/[id]/files` — upload file(s) to R2
- `DELETE /api/admin/vault/entries/[id]/files/[filename]` — remove file from R2
- `GET /api/vault/files/[entryId]/[filename]` — stream/download file (authenticated)

## Task 3: Notify Terry via Telegram

### Current State
- `lib/telegram.ts` sends to Josh's chat ID only
- Need to also notify Terry (the OpenClaw bot itself monitors a chat)

### Changes
- Add Terry notification to the switch trigger flow
- Terry's chat ID: the same bot can send to a different chat
- Actually, Terry monitors Josh's Telegram — so sending to Josh IS sending to Terry
- **No code change needed** — Terry will see the notification in Josh's Telegram chat since OpenClaw monitors it

## Technical Notes
- R2 binding is `VAULT_FILES` (already in wrangler.toml)
- All R2 operations use the `env.VAULT_FILES` binding in Cloudflare Workers
- For multipart uploads, use the Request body directly (Workers support streaming)
- Video streaming should use Range headers for seeking support
- All file/video routes MUST check authentication and access tier before serving

## Build & Deploy
- Repo: /tmp/collier-legacy-vault (NUC) — git remote is TerryMTCL/collier-legacy-vault
- Build: `npm run build`
- Deploy: `CLOUDFLARE_API_TOKEN="<CF_PAGES_TOKEN>" npx wrangler pages deploy .vercel/output/static --project-name=collier-legacy-vault-pages`
- Git config: user.name=TerryMTCL, user.email=263766744+TerryMTCL@users.noreply.github.com
- After code changes: build, test locally if possible, commit, push, deploy

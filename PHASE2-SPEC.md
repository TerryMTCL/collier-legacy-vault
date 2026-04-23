# Phase 2 — UI/UX Improvements & Missing Features

## Access Tier Logic Fix
- Leann Collier: ALWAYS FULL access, no matter what
- Other people: get FULL access if:
  1. Josh explicitly set them to FULL tier, OR
  2. They are the person who triggers the dead man's switch
- When switch fires: triggering person gets FULL access regardless of their configured tier
- ALL other people get their configured tier + their personal email
- Update the cron/check-switches logic accordingly

## Personal Email — Large Text Editor
- The "Personal Email Message" field is currently a tiny textarea
- This is the LAST thing Josh will ever say to these people — it needs to be a proper editor
- Replace with a LARGE textarea (minimum 10 rows, ideally resizable)
- Add a character count
- Consider markdown support or at least preserve line breaks in the email
- Make this a dedicated page/section, not crammed into the Add Person modal
- Each person should have their own "Write Letter" page with a full-screen-ish editor

## Category Management
- Add ability to edit a category's access tier (FULL ↔ PERSONAL)
- Admin should be able to toggle any category between FULL and PERSONAL
- Add edit button on each category in the vault admin

## Vault Entry Forms — Type-Specific UI
Current: everything is a raw JSON blob. Unacceptable.

### Login Entry
- Username field
- Password field (with show/hide toggle, copy button)
- URL field (clickable link)
- Notes field (multiline)
- Optional: TOTP/2FA notes

### Document Entry  
- Title
- Description/Notes (multiline)
- File upload (PDF, image, etc.) → stored in R2 encrypted
- Multiple file support

### Note Entry
- Title
- Rich text body (large textarea, preserve formatting)

### File Entry
- Title
- File upload → R2
- Description

### All Entry Types
- Clean, card-based display
- No raw JSON visible to users
- Password fields hidden by default with eye toggle
- Copy-to-clipboard buttons on passwords and usernames
- Mobile-friendly layout

## Video Messages
- Admin: Upload video per person (stored in R2)
- Admin: Video management page — see all uploaded videos, re-upload, delete
- Family view: After access is granted, each person sees a video player with Josh's message
- All people can see all video messages (per Josh's decision)
- Support mp4, mov formats
- Max size: handle up to 500MB per video (R2 can handle it)

## File Upload Infrastructure
- Upload endpoint: POST /api/admin/upload
- Files encrypted with AES-256-GCM before storing in R2
- Download endpoint that decrypts on the fly
- File size limit: 100MB per file (configurable)
- Supported types: PDF, images (jpg/png), documents, videos

## Cron / Dead Man's Switch
- External cron hits POST /api/cron/check-switches every 5 minutes
- Protected by CRON_SECRET env var
- Terry (OpenClaw) will manage the cron job

## Family View (Post-Access)
- After access is granted, family members log in and see:
  - Dashboard with categories (card grid with icons, like the "When I Die Folder" layout)
  - Click category → see entries in that category
  - Entries display cleanly based on type (login shows username/password/URL, etc.)
  - Video messages section
  - Personal letter from Josh (displayed prominently on first login)
- FULL tier users see all 23 categories
- PERSONAL tier users see only the 12 personal categories
- No admin features visible to family users

## Priority Order
1. Vault entry type-specific forms (biggest UX win)
2. Large personal email editor
3. Category tier editing
4. File upload to R2
5. Video upload + playback
6. Family view dashboard
7. Access tier logic fix (triggerer gets FULL)

# FocusForge - High-Performance Productivity & AI Workspace

FocusForge is an intelligent, high-performance daily planner, habit builder, notes editor, focus timer, and AI-driven productivity workspace built with Next.js 16 App Router, PostgreSQL (Supabase Pooler & Auth), and Google Gemini AI.

---

## 1. Environment Configuration

Copy `.env.example` to `.env.local` (for frontend) and `.env` (for backend):

```bash
cp .env.example frontend/.env.local
cp .env.example backend/.env
```

### Essential Environment Variables

| Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres...` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase API endpoint | `https://[PROJECT_REF].supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public client API key | `eyJhbGciOi...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin service role key | `eyJhbGciOi...` |
| `SUPPORT_EMAIL` | Public customer support address | `support@focusforge.app` |
| `SUPPORT_INBOX_EMAIL` | Private owner inbox for tickets | `fahimhossain1617@gmail.com` |
| `SMTP_HOST` | Transactional email SMTP host | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP port (587 TLS / 465 SSL) | `587` |
| `SMTP_USER` | SMTP authentication user | `your-email@gmail.com` |
| `SMTP_PASS` | SMTP app password | `your-smtp-app-password` |
| `GEMINI_API_KEY` | Google Gemini API Key | `AIzaSy...` |

---

## 2. Supervisor & Admin Role Assignment

To assign a user as a Supervisor or Administrator so they can access the Supervisor Portal (`/supervisor`), execute the following SQL in your PostgreSQL / Supabase SQL Editor:

```sql
-- Replace 'USER_UUID_HERE' with the target user's UUID from auth.users / profiles
INSERT INTO user_roles (user_id, role)
VALUES ('USER_UUID_HERE', 'supervisor')
ON CONFLICT (user_id, role) DO NOTHING;
```

---

## 3. Email Deliverability Setup (SPF, DKIM, DMARC)

For production transactional emails reaching the user inbox without spam filtering:

1. **SPF Record**: Add a `TXT` record on your root domain:
   `v=spf1 include:_spf.google.com ~all` (or your email provider's SPF).
2. **DKIM Record**: Generate and add the 2048-bit DKIM `CNAME` / `TXT` records provided by your email delivery service (e.g. SendGrid, Amazon SES, Brevo, Resend, or Google Workspace).
3. **DMARC Record**: Add a `TXT` record at `_dmarc.yourdomain.com`:
   `v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@yourdomain.com; pct=100`

---

## 4. API Endpoints Reference

### User & Profile
- `GET /api/user/profile` - Fetches profile details (fullName, displayName, phone, DOB, bio, avatarUrl, theme, language).
- `PATCH /api/user/profile` - Updates profile with strict server-side validation.
- `GET /api/user/check-username?username=...` - Validates and checks uniqueness for display name.
- `POST /api/user/avatar` - Uploads profile avatar (square compressed).
- `DELETE /api/user/avatar` - Removes avatar.
- `POST /api/user/change-password` - Re-authenticates, enforces password complexity, sends security notice.
- `DELETE /api/user/account` - Safe, idempotent deletion of all user data + anonymization of tickets.
- `POST /api/user/migrate-guest-data` - Merges guest local data into database upon registration.

### Support & Feedback Pipeline
- `POST /api/user/support/report` - Submits problem report with screenshots, creates ticket `FF-XXXXXX`, alerts owner via email with `Reply-To`.
- `POST /api/user/support/contact` - Submits contact request, sends confirmation to sender and alert to owner.
- `POST /api/user/support/feedback` - Submits feature ideas and suggestions.

### Supervisor Management Portal (`/supervisor`)
- `GET /api/supervisor/role` - Verifies supervisor / admin RBAC.
- `GET /api/supervisor/tickets` - Lists tickets with filters (type, status, priority, unread, search).
- `GET /api/supervisor/tickets/:id` - Full ticket details and reply thread.
- `PATCH /api/supervisor/tickets/:id` - Updates status, priority, and internal notes.
- `POST /api/supervisor/tickets/:id/reply` - Sends reply to customer via email and saves to thread.
- `GET /api/supervisor/audit-logs` - Audit log for all supervisor actions.

### Core Productivity & AI
- `GET /api/tasks` & `POST /api/tasks` & `PATCH /api/tasks/:id` & `DELETE /api/tasks/:id`
- `GET /api/tasks/templates` & `POST /api/tasks/templates`
- `GET /api/notes` & `POST /api/notes` & `PATCH /api/notes/:id` & `DELETE /api/notes/:id`
- `GET /api/mind` & `POST /api/mind` & `DELETE /api/mind/:id`
- `GET /api/focus/sessions` & `POST /api/focus/sessions` & `PATCH /api/focus/sessions/:id/end`
- `GET /api/diary/topics` & `POST /api/diary/topics` & `POST /api/diary/entries`
- `GET /api/learning/data` & `POST /api/learning/folders` & `POST /api/learning/logs`
- `GET /api/ai/agent/sessions` & `POST /api/ai/agent/chat` & `POST /api/ai/transcribe`
- `GET /api/notifications/settings` & `POST /api/notifications/settings` & `POST /api/notifications/subscribe`

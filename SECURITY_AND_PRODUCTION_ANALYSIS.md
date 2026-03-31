# Security & Production Readiness — Formel

**Stack:** React 19 + Vite, Node.js/Express 5, PostgreSQL (Drizzle ORM), Cloudflare R2, Resend
**Last reviewed:** March 2026

---

## What the App Already Does Well

These are genuine strengths — don't change them:

- **SQL Injection: Protected.** Drizzle ORM uses parameterized queries everywhere. No raw string concatenation found.
- **Password Storage: Correct.** bcrypt with salt rounds of 10. Passwords never returned in API responses (`SAFE_COLUMNS` pattern + `sanitizeUser()`).
- **JWT Implementation: Solid.** 15-minute access tokens, refresh token rotation, SHA256-hashed tokens in DB, proper revocation on logout, separate `JWT_REFRESH_SECRET`.
- **Input Validation: Consistent.** Zod schemas on all endpoints (body, params, query). Password requires 8+ chars, uppercase, and digit.
- **Role-Based Access Control: Well-structured.** `authorize()` middleware on all routes. Four roles clearly defined.
- **Audit Trail: Functional.** All mutations logged with old/new values.
- **Error Handling: Safe.** Generic 500 errors returned to users, no stack traces leaked. AppError for controlled responses.
- **Sensitive Data Filtering: Present.** `SAFE_COLUMNS` in user queries, `sanitizeUser()` in auth.
- **CORS: Locked down.** Only whitelisted origins via `CORS_ORIGINS` env var.
- **Rate Limiting: Active.** 10 login attempts per 15 minutes, 200 API requests per minute.
- **File Uploads: Validated.** MIME type checked (PDF/JPEG/PNG/WebP only) on all upload endpoints. Files served through authenticated proxy.

---

## Previously Identified Issues (All Fixed)

| # | Issue | How It Was Fixed |
|---|---|---|
| 1 | **Refresh Tokens Never Cleaned Up** | Expired/revoked tokens are now deleted on server start and every 24 hours via `cleanupExpiredTokens()` in [index.js](backend/src/index.js). |
| 2 | **Cookie Secure Flag Depends on NODE_ENV** | Changed to `secure: process.env.NODE_ENV !== 'development'` — cookies default to secure unless explicitly in dev mode. [auth.controller.js:8](backend/src/modules/auth/auth.controller.js#L8) |
| 3 | **Audit Logging Is Fire-and-Forget** | `logAudit` is now `async` and all 22 call sites across 8 service files `await` it. No more silently swallowed failures. [auditLogger.js](backend/src/lib/auditLogger.js) |
| 4 | **Hardcoded Seed Passwords** | Seed now uses `SEED_ADMIN_PASSWORD` env var or generates a random 24-char hex password. No more hardcoded `admin123`. [seed.js](backend/src/db/seed.js) |
| 5 | **No Structured Logging or Error Tracking** | `@sentry/node` installed and initialized conditionally when `SENTRY_DSN` is set. Unhandled errors captured in [errorHandler.js](backend/src/middleware/errorHandler.js). |
| 6 | **No Graceful Shutdown** | Server handles `SIGTERM`/`SIGINT`, closes connections cleanly with a 15-second forced timeout. [index.js](backend/src/index.js) |

---

## Issues Removed (not real problems or already fixed)

| Removed Issue | Why |
|---|---|
| **"Remove .env from Git history"** | `.env` was never committed to Git. Verified via `git log`. Nothing to remove. |
| **CSRF Protection (was rated HIGH)** | All mutations require Bearer token in Authorization header, which is immune to CSRF. The cookie is only used for the `/refresh` endpoint, where the response (new tokens) goes to the caller — an attacker can't capture it cross-origin. |
| **"No Request Body Size Limit"** | Express `json()` already defaults to 100kb. This is already handled. |
| **Transaction Isolation Level** | For a school app with ~10 concurrent staff users, the chance of two simultaneous payment approvals for the same student is near zero. Not worth the complexity now. |
| **API Versioning** | Design preference, not a security issue. The app has one frontend client. Add this only if you build a public API or mobile app. |
| **Horizontal Privilege Escalation** | The doc acknowledged this is fine for single-school. Not a real issue unless you go multi-tenant. |
| **R2 Files Publicly Accessible** | Fixed — files now served through authenticated `/api/files/*` proxy route. R2 public access disabled. |
| **CORS Accepts Any Origin** | Fixed — now uses `CORS_ORIGINS` env var, defaults to `localhost:5173`. |
| **No Rate Limiting** | Fixed — 10/15min on login, 200/min global via `express-rate-limit`. |
| **Password Strength Too Weak** | Fixed — 8+ chars, uppercase, digit required on both backend and frontend. |
| **Document Upload Missing MIME Validation** | Fixed — PDF/JPEG/PNG/WebP only on student docs and payment docs. |
| **Refresh Token Secret Falls Back to Access Token Secret** | Fixed — `JWT_REFRESH_SECRET` now required, dead fallback code removed. |

---

## Pre-Deployment Checklist

### Before going live
- [ ] Set `NODE_ENV=production` in hosting
- [ ] Rotate all secrets (DB password, JWT, JWT_REFRESH_SECRET, R2 keys, Resend key) in hosting platform
- [ ] Set `CORS_ORIGINS=https://yourdomain.com` in hosting platform
- [ ] Set `SENTRY_DSN` in hosting platform (get DSN from [sentry.io](https://sentry.io))
- [ ] Enable automated database backups in hosting provider

### After launch (first 2 weeks)
- [x] ~~Add refresh token cleanup job (#1)~~ — Done
- [x] ~~Cookie secure flag defaults to secure (#2)~~ — Done
- [x] ~~Make audit logging async for all operations (#3)~~ — Done
- [x] ~~Harden seed passwords (#4)~~ — Done
- [x] ~~Set up Sentry error tracking (#5)~~ — Done
- [x] ~~Add graceful shutdown (#6)~~ — Done

---

## Production Hosting Cost Estimate

### Small School (< 500 students, ~10 staff)

| Service | Plan | Monthly Cost |
|---|---|---|
| Railway (backend + PostgreSQL) | Hobby | ~$5-15 USD |
| Cloudflare R2 (files) | Free tier (10 GB) | $0 |
| Resend (email) | Free tier (3,000/month) | $0 |
| Vercel or Netlify (frontend) | Free tier | $0 |
| **Total** | | **~$5-15 USD (~650-1,950 HTG)** |

### Medium School (500-2,000 students, ~25 staff)

| Service | Plan | Monthly Cost |
|---|---|---|
| Railway (backend + DB) | Pro | ~$30-40 USD |
| Cloudflare R2 | ~50 GB | ~$1 USD |
| Resend | Pro | $20 USD |
| Sentry | Free tier | $0 |
| Vercel (frontend) | Free tier | $0 |
| **Total** | | **~$50-60 USD (~6,500-7,800 HTG)** |

### Cost Drivers
- **R2 storage**: ~3-5 MB per student (photo + documents). 1,000 students = ~5 GB. Stays within free tier for a while.
- **Resend**: Only used for bulk payment reminders. 500 families/month = well within free tier.
- **Database**: At 2,000 students with audit logs, expect 1-5 GB within 2 years. Clean up old audit logs periodically if needed.

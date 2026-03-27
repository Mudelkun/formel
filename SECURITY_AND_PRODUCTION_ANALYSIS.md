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

## Remaining Issues to Fix

### 1. Refresh Tokens Never Cleaned Up
**Priority: MEDIUM**
**Affected:** `refresh_tokens` table

Revoked and expired refresh tokens accumulate forever. Over time this table grows unbounded and slows queries.

**Fix:** Add a scheduled cleanup (cron job or on-startup task):

```js
async function cleanupExpiredTokens() {
  await db.delete(refreshTokens).where(
    or(
      eq(refreshTokens.revoked, true),
      sql`${refreshTokens.expiresAt} < NOW()`
    )
  );
}

// Run on server start and every 24 hours
cleanupExpiredTokens();
setInterval(cleanupExpiredTokens, 24 * 60 * 60 * 1000);
```

---

### 2. Cookie Secure Flag Depends on NODE_ENV
**Priority: MEDIUM**
**File:** [auth.controller.js:8](backend/src/modules/auth/auth.controller.js#L8)

```js
secure: process.env.NODE_ENV === 'production',
```

If `NODE_ENV` is not explicitly set in production, the `Secure` flag is absent and refresh tokens can be intercepted over HTTP.

**Fix:** Default to secure, only allow insecure locally:

```js
secure: process.env.NODE_ENV !== 'development',
```

---

### 3. Audit Logging Is Fire-and-Forget
**Priority: LOW**
**File:** [auditLogger.js](backend/src/lib/auditLogger.js)

The audit logger swallows failures silently. Security-critical actions (payment creation, deletion) may not be recorded.

**Fix:**

```js
async function logAudit(userId, action, tableName, recordId, oldData, newData) {
  await db.insert(auditLogs).values({ userId, action, tableName, recordId, oldData, newData });
}
```

Update callers to `await logAudit(...)` for financial and auth operations. Keep fire-and-forget for low-priority actions if preferred.

---

### 4. Hardcoded Seed Passwords
**Priority: LOW**
**File:** [seed.js:17](backend/src/db/seed.js#L17)

Default credentials (`admin@formel.school / admin123`) are in source. Low real-world risk since seeds only run once, but worth hardening.

**Fix:**

```js
const adminPass = process.env.SEED_ADMIN_PASSWORD ?? crypto.randomBytes(12).toString('hex');
console.log('Admin password:', adminPass);
const passwordHash = await bcrypt.hash(adminPass, 10);
```

---

### 5. No Structured Logging or Error Tracking
**Priority: LOW (pre-launch), MEDIUM (post-launch)**
**Affected:** Entire backend

All errors go to `console.error()`. In production you'll have no visibility into failures.

**Minimum fix:** Add Sentry (free tier handles ~5,000 errors/month):

```bash
npm install @sentry/node
```

```js
// backend/src/index.js (top)
import * as Sentry from '@sentry/node';
Sentry.init({ dsn: process.env.SENTRY_DSN });

// In errorHandler.js
Sentry.captureException(err);
```

---

### 6. No Graceful Shutdown
**Priority: LOW**
**File:** [index.js:46-48](backend/src/index.js#L46-L48)

On deploy restarts, in-flight requests are killed abruptly.

**Fix:**

```js
const server = app.listen(env.PORT, () => {
  console.log(`Server running on port ${env.PORT}`);
});

const shutdown = () => {
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 15000);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
```

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
- [ ] Enable automated database backups in hosting provider

### After launch (first 2 weeks)
- [ ] Add refresh token cleanup job (#1)
- [ ] Make audit logging async for financial operations (#3)
- [ ] Harden seed passwords (#4)
- [ ] Set up Sentry error tracking (#5)
- [ ] Add graceful shutdown (#6)

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

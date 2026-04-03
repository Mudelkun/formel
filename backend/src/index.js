const Sentry = require('@sentry/node');
if (process.env.SENTRY_DSN) {
  Sentry.init({ dsn: process.env.SENTRY_DSN });
}

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { or, eq, sql } = require('drizzle-orm');
const { env } = require('./config/env');
const { db } = require('./config/database');
const { refreshTokens } = require('./db/schema/refreshTokens');
const { errorHandler } = require('./middleware/errorHandler');
const authRouter = require('./modules/auth/auth.routes');
const usersRouter = require('./modules/users/users.routes');
const studentsRouter = require('./modules/students/students.routes');
const settingsRouter = require('./modules/settings/settings.routes');
const schoolYearsRouter = require('./modules/school-years/schoolYears.routes');
const classGroupsRouter = require('./modules/class-groups/classGroups.routes');
const classesRouter = require('./modules/classes/classes.routes');
const enrollmentsRouter = require('./modules/enrollments/enrollments.routes');
const scholarshipsRouter = require('./modules/scholarships/scholarships.routes');
const paymentsRouter = require('./modules/payments/payments.routes');
const versementsRouter = require('./modules/versements/versements.routes');
const financeRouter = require('./modules/finance/finance.routes');
const auditLogsRouter = require('./modules/audit-logs/auditLogs.routes');
const messagingRouter = require('./modules/messaging/messaging.routes');
const filesRouter = require('./modules/files/files.routes');

const app = express();

// Trust the first proxy hop (Railway, Render, etc.) so req.ip reflects the
// real client IP from the X-Forwarded-For header instead of the proxy's IP.
app.set('trust proxy', 1);

// --- CORS: whitelist specific origins ---
app.use(cors({
  origin: env.CORS_ORIGINS,
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      'img-src': ["'self'", 'blob:', 'data:'],
      'frame-src': ["'self'", 'blob:'],
    },
  },
}));
app.use(express.json());
app.use(cookieParser());

// --- Rate limiting ---
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { error: { message: 'Trop de tentatives, réessayez dans 15 minutes' } },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/auth/login', loginLimiter);
app.use('/api/', apiLimiter);

// --- Serve frontend static files ---
const frontendPath = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendPath));

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/students', studentsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/school-years', schoolYearsRouter);
app.use('/api/class-groups', classGroupsRouter);
app.use('/api/classes', classesRouter);
app.use('/api/enrollments', enrollmentsRouter);
app.use('/api/scholarships', scholarshipsRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/versements', versementsRouter);
app.use('/api/finance', financeRouter);
app.use('/api/audit-logs', auditLogsRouter);
app.use('/api/messages', messagingRouter);
app.use('/api/files', filesRouter);

app.use(errorHandler);

// --- SPA fallback: serve index.html for all non-API routes ---
app.get('{*path}', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// --- Refresh token cleanup ---
async function cleanupExpiredTokens() {
  try {
    await db.delete(refreshTokens).where(
      or(
        eq(refreshTokens.revoked, true),
        sql`${refreshTokens.expiresAt} < NOW()`
      )
    );
    console.log('Expired refresh tokens cleaned up');
  } catch (err) {
    console.error('Token cleanup failed:', err);
  }
}

const server = app.listen(env.PORT, () => {
  console.log(`Server running on port ${env.PORT}`);
  cleanupExpiredTokens();
});

const cleanupInterval = setInterval(cleanupExpiredTokens, 24 * 60 * 60 * 1000);

// --- Graceful shutdown ---
const shutdown = () => {
  console.log('Shutting down gracefully...');
  clearInterval(cleanupInterval);
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 15000);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

module.exports = { app };

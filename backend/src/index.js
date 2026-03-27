const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const { env } = require('./config/env');
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

// --- CORS: whitelist specific origins ---
app.use(cors({
  origin: env.CORS_ORIGINS,
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(helmet());
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

app.listen(env.PORT, () => {
  console.log(`Server running on port ${env.PORT}`);
});

module.exports = { app };

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
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
const paymentsRouter = require('./modules/payments/payments.routes');
const versementsRouter = require('./modules/versements/versements.routes');
const financeRouter = require('./modules/finance/finance.routes');
const auditLogsRouter = require('./modules/audit-logs/auditLogs.routes');

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(helmet());
app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/students', studentsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/school-years', schoolYearsRouter);
app.use('/api/class-groups', classGroupsRouter);
app.use('/api/classes', classesRouter);
app.use('/api/enrollments', enrollmentsRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/versements', versementsRouter);
app.use('/api/finance', financeRouter);
app.use('/api/audit-logs', auditLogsRouter);

app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`Server running on port ${env.PORT}`);
});

module.exports = { app };

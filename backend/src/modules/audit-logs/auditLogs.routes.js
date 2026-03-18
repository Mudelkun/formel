const { Router } = require('express');
const { auth } = require('../../middleware/auth');
const { authorize } = require('../../middleware/authorize');
const { validate } = require('../../middleware/validate');
const { listAuditLogsSchema } = require('./auditLogs.validation');
const { listAuditLogs } = require('./auditLogs.controller');

const router = Router();

router.get('/', auth, authorize('admin'), validate(listAuditLogsSchema), listAuditLogs);

module.exports = router;

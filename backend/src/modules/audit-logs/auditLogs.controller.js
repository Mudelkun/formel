const { asyncHandler } = require('../../lib/asyncHandler');
const auditLogsService = require('./auditLogs.service');

const listAuditLogs = asyncHandler(async (req, res) => {
  const result = await auditLogsService.listAuditLogs(req.query);
  res.json(result);
});

module.exports = { listAuditLogs };

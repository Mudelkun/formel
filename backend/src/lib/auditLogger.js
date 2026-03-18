const { db } = require('../config/database');
const { auditLogs } = require('../db/schema/auditLogs');

function logAudit(userId, action, tableName, recordId, oldData, newData) {
  db.insert(auditLogs)
    .values({ userId, action, tableName, recordId, oldData, newData })
    .catch((err) => console.error('Audit log failed:', err));
}

module.exports = { logAudit };

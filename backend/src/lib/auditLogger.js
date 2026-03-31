const { db } = require('../config/database');
const { auditLogs } = require('../db/schema/auditLogs');

async function logAudit(userId, action, tableName, recordId, oldData, newData) {
  await db.insert(auditLogs).values({ userId, action, tableName, recordId, oldData, newData });
}

module.exports = { logAudit };

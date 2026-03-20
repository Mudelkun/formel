const { eq, and, gte, lte, count, desc } = require('drizzle-orm');
const { db } = require('../../config/database');
const { auditLogs } = require('../../db/schema/auditLogs');
const { users } = require('../../db/schema/users');

async function listAuditLogs({ tableName, userId, action, startDate, endDate, page, limit }) {
  const conditions = [];

  if (tableName) conditions.push(eq(auditLogs.tableName, tableName));
  if (userId) conditions.push(eq(auditLogs.userId, userId));
  if (action) conditions.push(eq(auditLogs.action, action));
  if (startDate) conditions.push(gte(auditLogs.createdAt, new Date(startDate)));
  if (endDate) conditions.push(lte(auditLogs.createdAt, new Date(endDate + 'T23:59:59')));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [data, [{ total: totalCount }]] = await Promise.all([
    db.select({
      id: auditLogs.id,
      userId: auditLogs.userId,
      userName: users.name,
      action: auditLogs.action,
      tableName: auditLogs.tableName,
      recordId: auditLogs.recordId,
      oldData: auditLogs.oldData,
      newData: auditLogs.newData,
      createdAt: auditLogs.createdAt,
    })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .where(where)
      .limit(limit).offset((page - 1) * limit)
      .orderBy(desc(auditLogs.createdAt)),
    db.select({ total: count() }).from(auditLogs).where(where),
  ]);

  return {
    data,
    pagination: {
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
    },
  };
}

module.exports = { listAuditLogs };

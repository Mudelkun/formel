const { eq, and, gte, lte, count, desc, sql } = require('drizzle-orm');
const { db } = require('../../config/database');
const { auditLogs } = require('../../db/schema/auditLogs');
const { users } = require('../../db/schema/users');

function decodeAuditCursor(cursor) {
  try {
    const json = Buffer.from(cursor, 'base64url').toString('utf8');
    const { ca, id } = JSON.parse(json);
    if (typeof ca === 'string' && typeof id === 'string') {
      return { createdAt: ca, id };
    }
    return null;
  } catch {
    return null;
  }
}

function encodeAuditCursor(row) {
  return Buffer.from(
    JSON.stringify({ ca: row.createdAt, id: row.id })
  ).toString('base64url');
}

async function listAuditLogs({ tableName, userId, action, startDate, endDate, cursor, limit }) {
  const conditions = [];

  if (tableName) conditions.push(eq(auditLogs.tableName, tableName));
  if (userId) conditions.push(eq(auditLogs.userId, userId));
  if (action) conditions.push(eq(auditLogs.action, action));
  if (startDate) conditions.push(gte(auditLogs.createdAt, new Date(startDate)));
  if (endDate) conditions.push(lte(auditLogs.createdAt, new Date(endDate + 'T23:59:59')));

  if (cursor) {
    const parsed = decodeAuditCursor(cursor);
    if (parsed) {
      conditions.push(
        sql`(${auditLogs.createdAt}, ${auditLogs.id}) < (${parsed.createdAt}, ${parsed.id})`
      );
    }
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const selectFields = {
    id: auditLogs.id,
    userId: auditLogs.userId,
    userName: users.name,
    action: auditLogs.action,
    tableName: auditLogs.tableName,
    recordId: auditLogs.recordId,
    oldData: auditLogs.oldData,
    newData: auditLogs.newData,
    createdAt: auditLogs.createdAt,
  };

  const [rows, [{ total: totalCount }]] = await Promise.all([
    db.select(selectFields)
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .where(where)
      .limit(limit + 1)
      .orderBy(desc(auditLogs.createdAt), desc(auditLogs.id)),
    db.select({ total: count() }).from(auditLogs).where(where),
  ]);

  const hasNextPage = rows.length > limit;
  const data = hasNextPage ? rows.slice(0, limit) : rows;
  const nextCursor = hasNextPage ? encodeAuditCursor(data[data.length - 1]) : null;

  return {
    data,
    pagination: {
      limit,
      totalCount,
      nextCursor,
      hasNextPage,
    },
  };
}

module.exports = { listAuditLogs };

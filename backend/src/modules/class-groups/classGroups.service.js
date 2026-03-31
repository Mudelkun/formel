const { eq, count } = require('drizzle-orm');
const { db } = require('../../config/database');
const { classGroups } = require('../../db/schema/classGroups');
const { AppError } = require('../../lib/apiError');
const { logAudit } = require('../../lib/auditLogger');

async function listClassGroups({ page, limit }) {
  const [data, [{ total: totalCount }]] = await Promise.all([
    db.select().from(classGroups)
      .limit(limit).offset((page - 1) * limit)
      .orderBy(classGroups.name),
    db.select({ total: count() }).from(classGroups),
  ]);

  return {
    data,
    pagination: { page, limit, totalCount, totalPages: Math.ceil(totalCount / limit) },
  };
}

async function createClassGroup(data, userId) {
  const [existing] = await db
    .select({ id: classGroups.id })
    .from(classGroups)
    .where(eq(classGroups.name, data.name));

  if (existing) {
    throw new AppError(409, 'Class group name already exists');
  }

  const [created] = await db
    .insert(classGroups)
    .values({ ...data, updatedAt: new Date() })
    .returning();

  await logAudit(userId, 'create', 'class_groups', created.id, null, created);
  return created;
}

async function getClassGroupById(id) {
  const [group] = await db
    .select()
    .from(classGroups)
    .where(eq(classGroups.id, id));

  if (!group) {
    throw new AppError(404, 'Class group not found');
  }

  return group;
}

async function updateClassGroup(id, data, userId) {
  const [existing] = await db
    .select()
    .from(classGroups)
    .where(eq(classGroups.id, id));

  if (!existing) {
    throw new AppError(404, 'Class group not found');
  }

  if (data.name) {
    const [duplicate] = await db
      .select({ id: classGroups.id })
      .from(classGroups)
      .where(eq(classGroups.name, data.name));

    if (duplicate && duplicate.id !== id) {
      throw new AppError(409, 'Class group name already in use');
    }
  }

  const [updated] = await db
    .update(classGroups)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(classGroups.id, id))
    .returning();

  await logAudit(userId, 'update', 'class_groups', id, existing, updated);
  return updated;
}

async function deleteClassGroup(id, userId) {
  const [existing] = await db
    .select()
    .from(classGroups)
    .where(eq(classGroups.id, id));

  if (!existing) {
    throw new AppError(404, 'Class group not found');
  }

  await db.delete(classGroups).where(eq(classGroups.id, id));
  await logAudit(userId, 'delete', 'class_groups', id, existing, null);
}

module.exports = { listClassGroups, createClassGroup, getClassGroupById, updateClassGroup, deleteClassGroup };

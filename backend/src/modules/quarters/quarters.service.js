const { eq, and } = require('drizzle-orm');
const { db } = require('../../config/database');
const { quarters } = require('../../db/schema/quarters');
const { schoolYears } = require('../../db/schema/schoolYears');
const { AppError } = require('../../lib/apiError');
const { logAudit } = require('../../lib/auditLogger');

async function verifySchoolYearExists(schoolYearId) {
  const [sy] = await db
    .select({ id: schoolYears.id })
    .from(schoolYears)
    .where(eq(schoolYears.id, schoolYearId));

  if (!sy) {
    throw new AppError(404, 'School year not found');
  }
}

async function listQuarters(schoolYearId) {
  await verifySchoolYearExists(schoolYearId);

  const data = await db
    .select()
    .from(quarters)
    .where(eq(quarters.schoolYearId, schoolYearId))
    .orderBy(quarters.number);

  return data;
}

async function createQuarter(schoolYearId, data, userId) {
  await verifySchoolYearExists(schoolYearId);

  const [existing] = await db
    .select({ id: quarters.id })
    .from(quarters)
    .where(and(
      eq(quarters.schoolYearId, schoolYearId),
      eq(quarters.number, data.number),
    ));

  if (existing) {
    throw new AppError(409, 'Quarter number already exists for this school year');
  }

  const [created] = await db
    .insert(quarters)
    .values({ ...data, schoolYearId, updatedAt: new Date() })
    .returning();

  logAudit(userId, 'create', 'quarters', created.id, null, created);
  return created;
}

async function updateQuarter(id, data, userId) {
  const [existing] = await db
    .select()
    .from(quarters)
    .where(eq(quarters.id, id));

  if (!existing) {
    throw new AppError(404, 'Quarter not found');
  }

  if (data.number) {
    const [duplicate] = await db
      .select({ id: quarters.id })
      .from(quarters)
      .where(and(
        eq(quarters.schoolYearId, existing.schoolYearId),
        eq(quarters.number, data.number),
      ));

    if (duplicate && duplicate.id !== id) {
      throw new AppError(409, 'Quarter number already exists for this school year');
    }
  }

  const [updated] = await db
    .update(quarters)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(quarters.id, id))
    .returning();

  logAudit(userId, 'update', 'quarters', id, existing, updated);
  return updated;
}

async function deleteQuarter(id, userId) {
  const [existing] = await db
    .select()
    .from(quarters)
    .where(eq(quarters.id, id));

  if (!existing) {
    throw new AppError(404, 'Quarter not found');
  }

  await db.delete(quarters).where(eq(quarters.id, id));

  logAudit(userId, 'delete', 'quarters', id, existing, null);
}

module.exports = { listQuarters, createQuarter, updateQuarter, deleteQuarter };

const { eq, count } = require('drizzle-orm');
const { db } = require('../../config/database');
const { schoolYears } = require('../../db/schema/schoolYears');
const { AppError } = require('../../lib/apiError');
const { logAudit } = require('../../lib/auditLogger');

async function listSchoolYears({ page, limit }) {
  const [data, [{ total: totalCount }]] = await Promise.all([
    db.select().from(schoolYears)
      .limit(limit).offset((page - 1) * limit)
      .orderBy(schoolYears.startDate),
    db.select({ total: count() }).from(schoolYears),
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

async function createSchoolYear(data, userId) {
  const [existing] = await db
    .select({ id: schoolYears.id })
    .from(schoolYears)
    .where(eq(schoolYears.year, data.year));

  if (existing) {
    throw new AppError(409, 'School year already exists');
  }

  const [created] = await db
    .insert(schoolYears)
    .values({ ...data, updatedAt: new Date() })
    .returning();

  logAudit(userId, 'create', 'school_years', created.id, null, created);
  return created;
}

async function getSchoolYearById(id) {
  const [schoolYear] = await db
    .select()
    .from(schoolYears)
    .where(eq(schoolYears.id, id));

  if (!schoolYear) {
    throw new AppError(404, 'School year not found');
  }

  return schoolYear;
}

async function updateSchoolYear(id, data, userId) {
  const [existing] = await db
    .select()
    .from(schoolYears)
    .where(eq(schoolYears.id, id));

  if (!existing) {
    throw new AppError(404, 'School year not found');
  }

  if (data.year) {
    const [duplicate] = await db
      .select({ id: schoolYears.id })
      .from(schoolYears)
      .where(eq(schoolYears.year, data.year));

    if (duplicate && duplicate.id !== id) {
      throw new AppError(409, 'School year name already in use');
    }
  }

  const [updated] = await db
    .update(schoolYears)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(schoolYears.id, id))
    .returning();

  logAudit(userId, 'update', 'school_years', id, existing, updated);
  return updated;
}

async function activateSchoolYear(id, userId) {
  const [target] = await db
    .select()
    .from(schoolYears)
    .where(eq(schoolYears.id, id));

  if (!target) {
    throw new AppError(404, 'School year not found');
  }

  const result = await db.transaction(async (tx) => {
    await tx
      .update(schoolYears)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(schoolYears.isActive, true));

    const [activated] = await tx
      .update(schoolYears)
      .set({ isActive: true, updatedAt: new Date() })
      .where(eq(schoolYears.id, id))
      .returning();

    return activated;
  });

  logAudit(userId, 'activate', 'school_years', id, target, result);
  return result;
}

module.exports = {
  listSchoolYears,
  createSchoolYear,
  getSchoolYearById,
  updateSchoolYear,
  activateSchoolYear,
};

const { eq, count, and, sql } = require('drizzle-orm');
const { db } = require('../../config/database');
const { classes } = require('../../db/schema/classes');
const { classGroups } = require('../../db/schema/classGroups');
const { enrollments } = require('../../db/schema/enrollments');
const { schoolYears } = require('../../db/schema/schoolYears');
const { AppError } = require('../../lib/apiError');
const { logAudit } = require('../../lib/auditLogger');

async function listClasses({ page, limit }) {
  // Get active school year for student count
  const [activeYear] = await db
    .select({ id: schoolYears.id })
    .from(schoolYears)
    .where(eq(schoolYears.isActive, true));

  const [data, [{ total: totalCount }]] = await Promise.all([
    db.select({
      id: classes.id,
      name: classes.name,
      gradeLevel: classes.gradeLevel,
      classGroupId: classes.classGroupId,
      createdAt: classes.createdAt,
      updatedAt: classes.updatedAt,
      studentCount: count(enrollments.id),
    })
      .from(classes)
      .leftJoin(
        enrollments,
        and(
          eq(enrollments.classId, classes.id),
          activeYear ? eq(enrollments.schoolYearId, activeYear.id) : sql`false`,
          eq(enrollments.status, 'enrolled'),
        ),
      )
      .groupBy(classes.id)
      .limit(limit).offset((page - 1) * limit)
      .orderBy(classes.gradeLevel),
    db.select({ total: count() }).from(classes),
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

async function createClass(data, userId) {
  const [existing] = await db
    .select({ id: classes.id })
    .from(classes)
    .where(eq(classes.gradeLevel, data.gradeLevel));

  if (existing) {
    throw new AppError(409, 'Grade level already exists');
  }

  // Verify class group exists
  const [group] = await db
    .select({ id: classGroups.id })
    .from(classGroups)
    .where(eq(classGroups.id, data.classGroupId));

  if (!group) {
    throw new AppError(404, 'Class group not found');
  }

  const [created] = await db
    .insert(classes)
    .values({ ...data, updatedAt: new Date() })
    .returning();

  logAudit(userId, 'create', 'classes', created.id, null, created);
  return created;
}

async function getClassById(id) {
  const [cls] = await db
    .select()
    .from(classes)
    .where(eq(classes.id, id));

  if (!cls) {
    throw new AppError(404, 'Class not found');
  }

  return cls;
}

async function updateClass(id, data, userId) {
  const [existing] = await db
    .select()
    .from(classes)
    .where(eq(classes.id, id));

  if (!existing) {
    throw new AppError(404, 'Class not found');
  }

  if (data.gradeLevel) {
    const [duplicate] = await db
      .select({ id: classes.id })
      .from(classes)
      .where(eq(classes.gradeLevel, data.gradeLevel));

    if (duplicate && duplicate.id !== id) {
      throw new AppError(409, 'Grade level already in use');
    }
  }

  if (data.classGroupId) {
    const [group] = await db
      .select({ id: classGroups.id })
      .from(classGroups)
      .where(eq(classGroups.id, data.classGroupId));

    if (!group) {
      throw new AppError(404, 'Class group not found');
    }
  }

  const [updated] = await db
    .update(classes)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(classes.id, id))
    .returning();

  logAudit(userId, 'update', 'classes', id, existing, updated);
  return updated;
}

module.exports = { listClasses, createClass, getClassById, updateClass };

const { eq, and, ne, count, desc } = require('drizzle-orm');
const { db } = require('../../config/database');
const { schoolYears } = require('../../db/schema/schoolYears');
const { enrollments } = require('../../db/schema/enrollments');
const { classes } = require('../../db/schema/classes');
const { students } = require('../../db/schema/students');
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

async function promoteStudents(targetSchoolYearId, userId) {
  // Verify target year exists
  const [targetYear] = await db
    .select()
    .from(schoolYears)
    .where(eq(schoolYears.id, targetSchoolYearId));

  if (!targetYear) {
    throw new AppError(404, 'Target school year not found');
  }

  // Auto-detect source year: most recently created year before the target (excluding target)
  const [sourceYear] = await db
    .select()
    .from(schoolYears)
    .where(ne(schoolYears.id, targetSchoolYearId))
    .orderBy(desc(schoolYears.createdAt))
    .limit(1);

  if (!sourceYear) {
    throw new AppError(404, 'No source school year found for promotion');
  }

  // Get all enrollments from source year with class info
  const sourceEnrollments = await db
    .select({
      studentId: enrollments.studentId,
      gradeLevel: classes.gradeLevel,
    })
    .from(enrollments)
    .innerJoin(classes, eq(enrollments.classId, classes.id))
    .where(eq(enrollments.schoolYearId, sourceYear.id));

  // Get all classes sorted by gradeLevel for target mapping
  const allClasses = await db
    .select({ id: classes.id, gradeLevel: classes.gradeLevel })
    .from(classes)
    .orderBy(classes.gradeLevel);

  const classByGrade = {};
  for (const c of allClasses) {
    classByGrade[c.gradeLevel] = c.id;
  }

  // Check which students already have enrollment in target year
  const existingEnrollments = await db
    .select({ studentId: enrollments.studentId })
    .from(enrollments)
    .where(eq(enrollments.schoolYearId, targetSchoolYearId));

  const alreadyEnrolled = new Set(existingEnrollments.map((e) => e.studentId));

  let promoted = 0;
  let skipped = 0;
  let graduated = 0;

  const result = await db.transaction(async (tx) => {
    for (const se of sourceEnrollments) {
      // Skip if already enrolled in target year
      if (alreadyEnrolled.has(se.studentId)) {
        skipped++;
        continue;
      }

      const nextGrade = se.gradeLevel + 1;
      const nextClassId = classByGrade[nextGrade];

      if (!nextClassId) {
        // No class for next grade level — mark student as graduated
        await tx.update(students)
          .set({ status: 'graduated', updatedAt: new Date() })
          .where(eq(students.id, se.studentId));
        graduated++;
        continue;
      }

      await tx.insert(enrollments).values({
        studentId: se.studentId,
        classId: nextClassId,
        schoolYearId: targetSchoolYearId,
        updatedAt: new Date(),
      });

      promoted++;
    }

    return { promoted, skipped, graduated };
  });

  logAudit(userId, 'promote', 'school_years', targetSchoolYearId, { sourceYearId: sourceYear.id }, result);
  return { ...result, sourceYear: sourceYear.year, targetYear: targetYear.year };
}

module.exports = {
  listSchoolYears,
  createSchoolYear,
  getSchoolYearById,
  updateSchoolYear,
  activateSchoolYear,
  promoteStudents,
};

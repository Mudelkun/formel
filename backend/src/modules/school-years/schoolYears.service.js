const { eq, and, ne, count, desc } = require('drizzle-orm');
const { db } = require('../../config/database');
const { schoolYears } = require('../../db/schema/schoolYears');
const { enrollments } = require('../../db/schema/enrollments');
const { classes } = require('../../db/schema/classes');
const { students } = require('../../db/schema/students');
const { scholarships } = require('../../db/schema/scholarships');
const { versements } = require('../../db/schema/versements');
const { feeConfigs } = require('../../db/schema/feeConfigs');
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

  await logAudit(userId, 'create', 'school_years', created.id, null, created);
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

  await logAudit(userId, 'update', 'school_years', id, existing, updated);
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

  await logAudit(userId, 'activate', 'school_years', id, target, result);
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

  // Get source enrollments with their IDs for scholarship lookup
  const sourceEnrollmentsFull = await db
    .select({
      id: enrollments.id,
      studentId: enrollments.studentId,
      classId: enrollments.classId,
      gradeLevel: classes.gradeLevel,
      classGroupId: classes.classGroupId,
    })
    .from(enrollments)
    .innerJoin(classes, eq(enrollments.classId, classes.id))
    .where(eq(enrollments.schoolYearId, sourceYear.id));

  let promoted = 0;
  let skipped = 0;
  let graduated = 0;
  let scholarshipsCarried = 0;
  let feesCarried = 0;

  const result = await db.transaction(async (tx) => {
    // Carry over fee configs & versements for all class groups into the target year
    const allClassesFull = await tx
      .select({ id: classes.id, classGroupId: classes.classGroupId, gradeLevel: classes.gradeLevel })
      .from(classes);

    const classGroupIds = new Set(allClassesFull.map((c) => c.classGroupId));

    for (const cgId of classGroupIds) {
      // Check if fee config already exists for this group in target year
      const [existingFee] = await tx
        .select({ id: feeConfigs.id })
        .from(feeConfigs)
        .where(and(
          eq(feeConfigs.classGroupId, cgId),
          eq(feeConfigs.schoolYearId, targetSchoolYearId),
        ));

      if (existingFee) continue; // Already has fees for target year

      // Get source year fee config
      const [sourceFee] = await tx
        .select()
        .from(feeConfigs)
        .where(and(
          eq(feeConfigs.classGroupId, cgId),
          eq(feeConfigs.schoolYearId, sourceYear.id),
        ));

      if (!sourceFee) continue; // No fees in source year for this group

      // Copy fee config
      await tx.insert(feeConfigs).values({
        classGroupId: cgId,
        schoolYearId: targetSchoolYearId,
        bookFee: sourceFee.bookFee,
      });

      // Copy versements
      const sourceVersements = await tx
        .select()
        .from(versements)
        .where(and(
          eq(versements.classGroupId, cgId),
          eq(versements.schoolYearId, sourceYear.id),
        ));

      for (const sv of sourceVersements) {
        // Shift due date forward by 1 year
        const oldDate = new Date(sv.dueDate);
        const newDate = new Date(oldDate);
        newDate.setFullYear(oldDate.getFullYear() + 1);
        const newDueDate = newDate.toISOString().split('T')[0];

        await tx.insert(versements).values({
          classGroupId: cgId,
          schoolYearId: targetSchoolYearId,
          number: sv.number,
          name: sv.name,
          amount: sv.amount,
          dueDate: newDueDate,
        });
      }

      feesCarried++;
    }

    for (const se of sourceEnrollmentsFull) {
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

      const [newEnrollment] = await tx.insert(enrollments).values({
        studentId: se.studentId,
        classId: nextClassId,
        schoolYearId: targetSchoolYearId,
        updatedAt: new Date(),
      }).returning();

      // Carry over scholarships from source enrollment
      const oldScholarships = await tx
        .select()
        .from(scholarships)
        .where(eq(scholarships.enrollmentId, se.id));

      if (oldScholarships.length > 0) {
        // Get the new class's classGroupId for versement/fee mapping
        const [newClass] = await tx
          .select({ classGroupId: classes.classGroupId })
          .from(classes)
          .where(eq(classes.id, nextClassId));

        // Get target year versements for the new class group
        const targetVersements = await tx
          .select()
          .from(versements)
          .where(and(
            eq(versements.classGroupId, newClass.classGroupId),
            eq(versements.schoolYearId, targetSchoolYearId),
          ));
        const versementByNumber = {};
        for (const v of targetVersements) {
          versementByNumber[v.number] = v;
        }

        // Get target year fee config for book fee amount
        const [targetFeeConfig] = await tx
          .select()
          .from(feeConfigs)
          .where(and(
            eq(feeConfigs.classGroupId, newClass.classGroupId),
            eq(feeConfigs.schoolYearId, targetSchoolYearId),
          ));

        for (const oldSch of oldScholarships) {
          const newSchData = {
            enrollmentId: newEnrollment.id,
            type: oldSch.type,
            percentage: oldSch.percentage,
            isBookAnnulation: oldSch.isBookAnnulation,
            updatedAt: new Date(),
          };

          if (oldSch.type === 'versement_annulation' && oldSch.targetVersementId) {
            // Find the old versement's number to map to the new one
            const [oldVersement] = await tx
              .select({ number: versements.number })
              .from(versements)
              .where(eq(versements.id, oldSch.targetVersementId));

            if (oldVersement) {
              const newVersement = versementByNumber[oldVersement.number];
              if (newVersement) {
                newSchData.targetVersementId = newVersement.id;
                newSchData.fixedAmount = newVersement.amount;
              } else {
                continue; // No matching versement in target year, skip
              }
            } else {
              continue;
            }
          } else if (oldSch.type === 'book_annulation') {
            newSchData.fixedAmount = targetFeeConfig ? targetFeeConfig.bookFee : oldSch.fixedAmount;
          } else {
            // partial or fixed_amount — carry as-is
            newSchData.fixedAmount = oldSch.fixedAmount;
          }

          await tx.insert(scholarships).values(newSchData);
          scholarshipsCarried++;
        }
      }

      promoted++;
    }

    return { promoted, skipped, graduated, scholarshipsCarried, feesCarried };
  });

  await logAudit(userId, 'promote', 'school_years', targetSchoolYearId, { sourceYearId: sourceYear.id }, result);
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

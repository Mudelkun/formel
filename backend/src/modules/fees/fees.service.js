const { eq, and } = require('drizzle-orm');
const { db } = require('../../config/database');
const { classGroups } = require('../../db/schema/classGroups');
const { schoolYears } = require('../../db/schema/schoolYears');
const { feeConfigs } = require('../../db/schema/feeConfigs');
const { versements } = require('../../db/schema/versements');
const { AppError } = require('../../lib/apiError');
const { logAudit } = require('../../lib/auditLogger');

async function verifyClassGroupExists(id) {
  const [group] = await db
    .select({ id: classGroups.id })
    .from(classGroups)
    .where(eq(classGroups.id, id));

  if (!group) throw new AppError(404, 'Class group not found');
}

async function verifySchoolYearExists(id) {
  const [year] = await db
    .select({ id: schoolYears.id })
    .from(schoolYears)
    .where(eq(schoolYears.id, id));

  if (!year) throw new AppError(404, 'School year not found');
}

async function getFees(classGroupId, schoolYearId) {
  await verifyClassGroupExists(classGroupId);
  await verifySchoolYearExists(schoolYearId);

  const [feeConfig] = await db
    .select()
    .from(feeConfigs)
    .where(and(
      eq(feeConfigs.classGroupId, classGroupId),
      eq(feeConfigs.schoolYearId, schoolYearId),
    ));

  const versementList = await db
    .select()
    .from(versements)
    .where(and(
      eq(versements.classGroupId, classGroupId),
      eq(versements.schoolYearId, schoolYearId),
    ))
    .orderBy(versements.number);

  return {
    bookFee: feeConfig ? feeConfig.bookFee : '0',
    feeConfigId: feeConfig ? feeConfig.id : null,
    versements: versementList,
  };
}

async function createFees(classGroupId, data, userId) {
  await verifyClassGroupExists(classGroupId);
  await verifySchoolYearExists(data.schoolYearId);

  // Check if fee config already exists for this group + year
  const [existing] = await db
    .select({ id: feeConfigs.id })
    .from(feeConfigs)
    .where(and(
      eq(feeConfigs.classGroupId, classGroupId),
      eq(feeConfigs.schoolYearId, data.schoolYearId),
    ));

  if (existing) {
    throw new AppError(409, 'Fee configuration already exists for this class group and school year');
  }

  const result = await db.transaction(async (tx) => {
    // Create fee config
    const [config] = await tx
      .insert(feeConfigs)
      .values({
        classGroupId,
        schoolYearId: data.schoolYearId,
        bookFee: data.bookFee,
        updatedAt: new Date(),
      })
      .returning();

    // Create versements (batch insert)
    const versementRecords = data.versements.length > 0
      ? await tx
          .insert(versements)
          .values(data.versements.map((v) => ({
            classGroupId,
            schoolYearId: data.schoolYearId,
            number: v.number,
            name: v.name,
            amount: v.amount,
            dueDate: v.dueDate,
            updatedAt: new Date(),
          })))
          .returning()
      : [];

    return { bookFee: config.bookFee, feeConfigId: config.id, versements: versementRecords };
  });

  logAudit(userId, 'create', 'fee_configs', result.feeConfigId, null, result);
  return result;
}

async function updateFees(classGroupId, data, userId) {
  await verifyClassGroupExists(classGroupId);
  await verifySchoolYearExists(data.schoolYearId);

  const result = await db.transaction(async (tx) => {
    // Upsert fee config
    const [existingConfig] = await tx
      .select()
      .from(feeConfigs)
      .where(and(
        eq(feeConfigs.classGroupId, classGroupId),
        eq(feeConfigs.schoolYearId, data.schoolYearId),
      ));

    let config;
    if (existingConfig) {
      [config] = await tx
        .update(feeConfigs)
        .set({ bookFee: data.bookFee, updatedAt: new Date() })
        .where(eq(feeConfigs.id, existingConfig.id))
        .returning();
    } else {
      [config] = await tx
        .insert(feeConfigs)
        .values({
          classGroupId,
          schoolYearId: data.schoolYearId,
          bookFee: data.bookFee,
          updatedAt: new Date(),
        })
        .returning();
    }

    // Delete old versements for this group + year
    await tx
      .delete(versements)
      .where(and(
        eq(versements.classGroupId, classGroupId),
        eq(versements.schoolYearId, data.schoolYearId),
      ));

    // Insert new versements (batch insert)
    const versementRecords = data.versements.length > 0
      ? await tx
          .insert(versements)
          .values(data.versements.map((v) => ({
            classGroupId,
            schoolYearId: data.schoolYearId,
            number: v.number,
            name: v.name,
            amount: v.amount,
            dueDate: v.dueDate,
            updatedAt: new Date(),
          })))
          .returning()
      : [];

    return { bookFee: config.bookFee, feeConfigId: config.id, versements: versementRecords };
  });

  logAudit(userId, 'update', 'fee_configs', result.feeConfigId, null, result);
  return result;
}

async function updateVersement(id, data, userId) {
  const [existing] = await db
    .select()
    .from(versements)
    .where(eq(versements.id, id));

  if (!existing) {
    throw new AppError(404, 'Versement not found');
  }

  const [updated] = await db
    .update(versements)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(versements.id, id))
    .returning();

  logAudit(userId, 'update', 'versements', id, existing, updated);
  return updated;
}

module.exports = { getFees, createFees, updateFees, updateVersement };

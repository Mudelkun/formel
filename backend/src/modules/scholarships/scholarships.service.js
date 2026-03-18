const { eq } = require('drizzle-orm');
const { db } = require('../../config/database');
const { scholarships } = require('../../db/schema/scholarships');
const { enrollments } = require('../../db/schema/enrollments');
const { AppError } = require('../../lib/apiError');
const { logAudit } = require('../../lib/auditLogger');

async function verifyEnrollmentExists(enrollmentId) {
  const [enrollment] = await db
    .select({ id: enrollments.id })
    .from(enrollments)
    .where(eq(enrollments.id, enrollmentId));

  if (!enrollment) {
    throw new AppError(404, 'Enrollment not found');
  }
}

async function getScholarship(enrollmentId) {
  await verifyEnrollmentExists(enrollmentId);

  const [scholarship] = await db
    .select()
    .from(scholarships)
    .where(eq(scholarships.enrollmentId, enrollmentId));

  if (!scholarship) {
    throw new AppError(404, 'No scholarship found for this enrollment');
  }

  return scholarship;
}

async function createScholarship(enrollmentId, data, userId) {
  await verifyEnrollmentExists(enrollmentId);

  const [existing] = await db
    .select({ id: scholarships.id })
    .from(scholarships)
    .where(eq(scholarships.enrollmentId, enrollmentId));

  if (existing) {
    throw new AppError(409, 'Scholarship already exists for this enrollment');
  }

  const [created] = await db
    .insert(scholarships)
    .values({ ...data, enrollmentId, updatedAt: new Date() })
    .returning();

  logAudit(userId, 'create', 'scholarships', created.id, null, created);
  return created;
}

async function updateScholarship(enrollmentId, data, userId) {
  const [existing] = await db
    .select()
    .from(scholarships)
    .where(eq(scholarships.enrollmentId, enrollmentId));

  if (!existing) {
    throw new AppError(404, 'No scholarship found for this enrollment');
  }

  const [updated] = await db
    .update(scholarships)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(scholarships.enrollmentId, enrollmentId))
    .returning();

  logAudit(userId, 'update', 'scholarships', existing.id, existing, updated);
  return updated;
}

async function deleteScholarship(enrollmentId, userId) {
  const [existing] = await db
    .select()
    .from(scholarships)
    .where(eq(scholarships.enrollmentId, enrollmentId));

  if (!existing) {
    throw new AppError(404, 'No scholarship found for this enrollment');
  }

  await db.delete(scholarships).where(eq(scholarships.enrollmentId, enrollmentId));

  logAudit(userId, 'delete', 'scholarships', existing.id, existing, null);
}

module.exports = { getScholarship, createScholarship, updateScholarship, deleteScholarship };

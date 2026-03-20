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

async function listScholarships(enrollmentId) {
  await verifyEnrollmentExists(enrollmentId);

  const data = await db
    .select()
    .from(scholarships)
    .where(eq(scholarships.enrollmentId, enrollmentId))
    .orderBy(scholarships.createdAt);

  return data;
}

async function createScholarship(enrollmentId, data, userId) {
  await verifyEnrollmentExists(enrollmentId);

  const [created] = await db
    .insert(scholarships)
    .values({ ...data, enrollmentId, updatedAt: new Date() })
    .returning();

  logAudit(userId, 'create', 'scholarships', created.id, null, created);
  return created;
}

async function updateScholarship(scholarshipId, data, userId) {
  const [existing] = await db
    .select()
    .from(scholarships)
    .where(eq(scholarships.id, scholarshipId));

  if (!existing) {
    throw new AppError(404, 'Scholarship not found');
  }

  const [updated] = await db
    .update(scholarships)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(scholarships.id, scholarshipId))
    .returning();

  logAudit(userId, 'update', 'scholarships', scholarshipId, existing, updated);
  return updated;
}

async function deleteScholarship(scholarshipId, userId) {
  const [existing] = await db
    .select()
    .from(scholarships)
    .where(eq(scholarships.id, scholarshipId));

  if (!existing) {
    throw new AppError(404, 'Scholarship not found');
  }

  await db.delete(scholarships).where(eq(scholarships.id, scholarshipId));

  logAudit(userId, 'delete', 'scholarships', scholarshipId, existing, null);
}

module.exports = { listScholarships, createScholarship, updateScholarship, deleteScholarship };

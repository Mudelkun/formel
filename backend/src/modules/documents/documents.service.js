const { eq, and } = require('drizzle-orm');
const { db } = require('../../config/database');
const { students } = require('../../db/schema/students');
const { studentDocuments } = require('../../db/schema/studentDocuments');
const { uploadFile, deleteFile, extractKeyFromUrl } = require('../../lib/uploadService');
const { AppError } = require('../../lib/apiError');

async function verifyStudentExists(studentId) {
  const [student] = await db
    .select({ id: students.id })
    .from(students)
    .where(eq(students.id, studentId));

  if (!student) {
    throw new AppError(404, 'Student not found');
  }
  return student;
}

async function listDocuments(studentId) {
  await verifyStudentExists(studentId);
  return db
    .select()
    .from(studentDocuments)
    .where(eq(studentDocuments.studentId, studentId))
    .orderBy(studentDocuments.createdAt);
}

async function uploadDocument(studentId, file, documentType) {
  await verifyStudentExists(studentId);

  if (!file) {
    throw new AppError(400, 'No file provided');
  }

  const key = `students/${studentId}/documents/${Date.now()}-${file.originalname}`;
  const url = await uploadFile(file.buffer, key, file.mimetype);

  const [doc] = await db
    .insert(studentDocuments)
    .values({
      studentId,
      documentType,
      documentUrl: url,
      updatedAt: new Date(),
    })
    .returning();

  return doc;
}

async function deleteDocument(studentId, docId) {
  const [doc] = await db
    .select()
    .from(studentDocuments)
    .where(and(eq(studentDocuments.id, docId), eq(studentDocuments.studentId, studentId)));

  if (!doc) {
    throw new AppError(404, 'Document not found');
  }

  const key = extractKeyFromUrl(doc.documentUrl);
  await deleteFile(key);
  await db.delete(studentDocuments).where(eq(studentDocuments.id, docId));
}

const ALLOWED_PHOTO_MIMES = ['image/jpeg', 'image/png', 'image/webp'];

async function uploadPhoto(studentId, file) {
  const [student] = await db
    .select()
    .from(students)
    .where(eq(students.id, studentId));

  if (!student) {
    throw new AppError(404, 'Student not found');
  }

  if (!file) {
    throw new AppError(400, 'No photo file provided');
  }

  if (!ALLOWED_PHOTO_MIMES.includes(file.mimetype)) {
    throw new AppError(400, 'Invalid file type. Allowed: JPEG, PNG, WebP');
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new AppError(400, 'Photo must be under 5MB');
  }

  // Delete old photo from R2 if exists
  if (student.profilePhotoUrl) {
    const oldKey = extractKeyFromUrl(student.profilePhotoUrl);
    await deleteFile(oldKey);
  }

  const key = `students/${studentId}/photo/${Date.now()}-${file.originalname}`;
  const url = await uploadFile(file.buffer, key, file.mimetype);

  await db
    .update(students)
    .set({ profilePhotoUrl: url, updatedAt: new Date() })
    .where(eq(students.id, studentId));

  return { profilePhotoUrl: url };
}

module.exports = { listDocuments, uploadDocument, deleteDocument, uploadPhoto };

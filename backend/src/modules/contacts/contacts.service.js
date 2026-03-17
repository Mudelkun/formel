const { eq, and } = require('drizzle-orm');
const { db } = require('../../config/database');
const { contacts } = require('../../db/schema/contacts');
const { students } = require('../../db/schema/students');
const { AppError } = require('../../lib/apiError');

async function verifyStudentExists(studentId) {
  const [student] = await db
    .select({ id: students.id })
    .from(students)
    .where(eq(students.id, studentId));

  if (!student) {
    throw new AppError(404, 'Student not found');
  }
}

async function listContacts(studentId) {
  await verifyStudentExists(studentId);
  return db
    .select()
    .from(contacts)
    .where(eq(contacts.studentId, studentId));
}

async function createContact(studentId, data) {
  await verifyStudentExists(studentId);

  if (data.isPrimary) {
    await db
      .update(contacts)
      .set({ isPrimary: false, updatedAt: new Date() })
      .where(and(eq(contacts.studentId, studentId), eq(contacts.isPrimary, true)));
  }

  const [contact] = await db
    .insert(contacts)
    .values({
      ...data,
      studentId,
      updatedAt: new Date(),
    })
    .returning();

  return contact;
}

async function updateContact(studentId, contactId, data) {
  const [existing] = await db
    .select()
    .from(contacts)
    .where(and(eq(contacts.id, contactId), eq(contacts.studentId, studentId)));

  if (!existing) {
    throw new AppError(404, 'Contact not found');
  }

  if (data.isPrimary) {
    await db
      .update(contacts)
      .set({ isPrimary: false, updatedAt: new Date() })
      .where(and(eq(contacts.studentId, studentId), eq(contacts.isPrimary, true)));
  }

  const [updated] = await db
    .update(contacts)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(contacts.id, contactId))
    .returning();

  return updated;
}

async function deleteContact(studentId, contactId) {
  const [existing] = await db
    .select()
    .from(contacts)
    .where(and(eq(contacts.id, contactId), eq(contacts.studentId, studentId)));

  if (!existing) {
    throw new AppError(404, 'Contact not found');
  }

  await db.delete(contacts).where(eq(contacts.id, contactId));
}

module.exports = { listContacts, createContact, updateContact, deleteContact };

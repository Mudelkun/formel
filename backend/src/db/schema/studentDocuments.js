const { pgTable, uuid, varchar, text, timestamp } = require('drizzle-orm/pg-core');
const { students } = require('./students');

const studentDocuments = pgTable('student_documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  studentId: uuid('student_id').notNull().references(() => students.id),
  documentType: varchar('document_type').notNull(),
  documentUrl: text('document_url').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at'),
});

module.exports = { studentDocuments };

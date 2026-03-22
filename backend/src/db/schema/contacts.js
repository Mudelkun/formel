const { pgTable, uuid, varchar, boolean, timestamp, index } = require('drizzle-orm/pg-core');
const { students } = require('./students');

const contacts = pgTable('contacts', {
  id: uuid('id').primaryKey().defaultRandom(),
  studentId: uuid('student_id').notNull().references(() => students.id),
  firstName: varchar('first_name').notNull(),
  lastName: varchar('last_name').notNull(),
  phone: varchar('phone'),
  email: varchar('email').notNull(),
  relationship: varchar('relationship').notNull(),
  isPrimary: boolean('is_primary').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at'),
}, (table) => [
  index().on(table.studentId),
]);

module.exports = { contacts };

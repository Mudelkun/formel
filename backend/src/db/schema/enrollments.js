const { pgTable, uuid, timestamp, uniqueIndex, index } = require('drizzle-orm/pg-core');
const { students } = require('./students');
const { classes } = require('./classes');
const { schoolYears } = require('./schoolYears');

const enrollments = pgTable('enrollments', {
  id: uuid('id').primaryKey().defaultRandom(),
  studentId: uuid('student_id').notNull().references(() => students.id),
  classId: uuid('class_id').notNull().references(() => classes.id),
  schoolYearId: uuid('school_year_id').notNull().references(() => schoolYears.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at'),
}, (table) => [
  uniqueIndex().on(table.studentId, table.schoolYearId),
  index().on(table.studentId),
  index().on(table.classId),
  index().on(table.schoolYearId),
]);

module.exports = { enrollments };

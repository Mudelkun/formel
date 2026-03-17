const { pgTable, uuid, varchar, numeric, timestamp } = require('drizzle-orm/pg-core');
const { enrollments } = require('./enrollments');

const scholarships = pgTable('scholarships', {
  id: uuid('id').primaryKey().defaultRandom(),
  enrollmentId: uuid('enrollment_id').notNull().unique().references(() => enrollments.id),
  type: varchar('type').notNull(),
  percentage: numeric('percentage'),
  fixedAmount: numeric('fixed_amount'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at'),
});

module.exports = { scholarships };

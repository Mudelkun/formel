const { pgTable, uuid, varchar, numeric, boolean, timestamp } = require('drizzle-orm/pg-core');
const { enrollments } = require('./enrollments');
const { versements } = require('./versements');

const scholarships = pgTable('scholarships', {
  id: uuid('id').primaryKey().defaultRandom(),
  enrollmentId: uuid('enrollment_id').notNull().references(() => enrollments.id),
  type: varchar('type').notNull(), // 'partial' | 'fixed_amount' | 'versement_annulation' | 'book_annulation'
  percentage: numeric('percentage'),
  fixedAmount: numeric('fixed_amount'),
  targetVersementId: uuid('target_versement_id').references(() => versements.id),
  isBookAnnulation: boolean('is_book_annulation').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at'),
});

module.exports = { scholarships };

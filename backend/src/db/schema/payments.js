const { pgTable, uuid, varchar, numeric, date, text, boolean, timestamp, index } = require('drizzle-orm/pg-core');
const { enrollments } = require('./enrollments');

const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  enrollmentId: uuid('enrollment_id').notNull().references(() => enrollments.id),
  amount: numeric('amount').notNull(),
  paymentDate: date('payment_date').notNull(),
  paymentMethod: varchar('payment_method'),
  isBookPayment: boolean('is_book_payment').notNull().default(false),
  status: varchar('status').notNull().default('pending'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at'),
}, (table) => [
  index().on(table.enrollmentId),
  index().on(table.enrollmentId, table.status),
]);

module.exports = { payments };

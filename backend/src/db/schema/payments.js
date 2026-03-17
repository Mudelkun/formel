const { pgTable, uuid, varchar, numeric, date, text, timestamp, index } = require('drizzle-orm/pg-core');
const { enrollments } = require('./enrollments');
const { quarters } = require('./quarters');

const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  enrollmentId: uuid('enrollment_id').notNull().references(() => enrollments.id),
  quarterId: uuid('quarter_id').references(() => quarters.id),
  amount: numeric('amount').notNull(),
  paymentDate: date('payment_date').notNull(),
  paymentMethod: varchar('payment_method'),
  status: varchar('status').notNull().default('pending'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at'),
}, (table) => [
  index().on(table.enrollmentId),
  index().on(table.quarterId),
]);

module.exports = { payments };

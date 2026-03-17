const { pgTable, uuid, varchar, date, boolean, timestamp, uniqueIndex } = require('drizzle-orm/pg-core');
const { sql } = require('drizzle-orm');

const schoolYears = pgTable('school_years', {
  id: uuid('id').primaryKey().defaultRandom(),
  year: varchar('year').unique().notNull(),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  isActive: boolean('is_active').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at'),
}, (table) => [
  uniqueIndex('one_active_school_year').on(table.isActive).where(sql`${table.isActive} = true`),
]);

module.exports = { schoolYears };

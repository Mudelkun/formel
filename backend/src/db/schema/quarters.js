const { pgTable, uuid, varchar, integer, date, timestamp, uniqueIndex, index } = require('drizzle-orm/pg-core');
const { schoolYears } = require('./schoolYears');

const quarters = pgTable('quarters', {
  id: uuid('id').primaryKey().defaultRandom(),
  schoolYearId: uuid('school_year_id').notNull().references(() => schoolYears.id),
  name: varchar('name').notNull(),
  number: integer('number').notNull(),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at'),
}, (table) => [
  uniqueIndex().on(table.schoolYearId, table.number),
  index().on(table.schoolYearId),
]);

module.exports = { quarters };

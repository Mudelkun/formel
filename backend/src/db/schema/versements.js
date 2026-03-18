const { pgTable, uuid, varchar, integer, numeric, date, timestamp, uniqueIndex, index } = require('drizzle-orm/pg-core');
const { classGroups } = require('./classGroups');
const { schoolYears } = require('./schoolYears');

const versements = pgTable('versements', {
  id: uuid('id').primaryKey().defaultRandom(),
  classGroupId: uuid('class_group_id').notNull().references(() => classGroups.id),
  schoolYearId: uuid('school_year_id').notNull().references(() => schoolYears.id),
  number: integer('number').notNull(),
  name: varchar('name').notNull(),
  amount: numeric('amount').notNull(),
  dueDate: date('due_date').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at'),
}, (table) => [
  uniqueIndex().on(table.classGroupId, table.schoolYearId, table.number),
  index().on(table.classGroupId),
  index().on(table.schoolYearId),
]);

module.exports = { versements };

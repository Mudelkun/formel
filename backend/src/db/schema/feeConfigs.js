const { pgTable, uuid, numeric, timestamp, uniqueIndex } = require('drizzle-orm/pg-core');
const { classGroups } = require('./classGroups');
const { schoolYears } = require('./schoolYears');

const feeConfigs = pgTable('fee_configs', {
  id: uuid('id').primaryKey().defaultRandom(),
  classGroupId: uuid('class_group_id').notNull().references(() => classGroups.id),
  schoolYearId: uuid('school_year_id').notNull().references(() => schoolYears.id),
  bookFee: numeric('book_fee').notNull().default('0'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at'),
}, (table) => [
  uniqueIndex().on(table.classGroupId, table.schoolYearId),
]);

module.exports = { feeConfigs };

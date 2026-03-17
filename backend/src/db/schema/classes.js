const { pgTable, uuid, varchar, integer, numeric, timestamp } = require('drizzle-orm/pg-core');

const classes = pgTable('classes', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name').notNull(),
  gradeLevel: integer('grade_level').unique().notNull(),
  annualTuitionFee: numeric('annual_tuition_fee').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at'),
});

module.exports = { classes };

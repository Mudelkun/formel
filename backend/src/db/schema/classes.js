const { pgTable, uuid, varchar, integer, timestamp } = require('drizzle-orm/pg-core');
const { classGroups } = require('./classGroups');

const classes = pgTable('classes', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name').notNull(),
  gradeLevel: integer('grade_level').unique().notNull(),
  classGroupId: uuid('class_group_id').notNull().references(() => classGroups.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at'),
});

module.exports = { classes };

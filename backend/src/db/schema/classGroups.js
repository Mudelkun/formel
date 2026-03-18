const { pgTable, uuid, varchar, timestamp } = require('drizzle-orm/pg-core');

const classGroups = pgTable('class_groups', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name').unique().notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at'),
});

module.exports = { classGroups };

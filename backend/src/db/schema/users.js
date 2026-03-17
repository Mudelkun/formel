const { pgTable, uuid, varchar, text, timestamp } = require('drizzle-orm/pg-core');

const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name').notNull(),
  email: varchar('email').unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  role: varchar('role').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at'),
});

module.exports = { users };

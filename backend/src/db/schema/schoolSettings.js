const { pgTable, uuid, varchar, text, timestamp } = require('drizzle-orm/pg-core');

const schoolSettings = pgTable('school_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  schoolName: varchar('school_name').notNull(),
  address: text('address'),
  phone: varchar('phone'),
  email: varchar('email'),
  currency: varchar('currency').notNull().default('HTG'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at'),
});

module.exports = { schoolSettings };

const { pgTable, uuid, varchar, text, date, boolean, timestamp } = require('drizzle-orm/pg-core');

const students = pgTable('students', {
  id: uuid('id').primaryKey().defaultRandom(),
  nie: varchar('NIE'),
  firstName: varchar('first_name').notNull(),
  lastName: varchar('last_name').notNull(),
  gender: varchar('gender').notNull(),
  birthDate: date('birth_date').notNull(),
  address: text('address'),
  scholarshipRecipient: boolean('scholarship_recipient').default(false),
  status: varchar('status').default('active'),
  profilePhotoUrl: text('profile_photo_url'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at'),
});

module.exports = { students };

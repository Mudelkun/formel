const { pgTable, uuid, varchar, text, date, boolean, timestamp, index } = require('drizzle-orm/pg-core');

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
}, (table) => [
  index().on(table.status),
  index().on(table.scholarshipRecipient),
  index().on(table.lastName, table.firstName),
]);

module.exports = { students };

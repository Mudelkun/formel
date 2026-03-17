const { pgTable, uuid, varchar, jsonb, timestamp } = require('drizzle-orm/pg-core');
const { users } = require('./users');

const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  action: varchar('action').notNull(),
  tableName: varchar('table_name').notNull(),
  recordId: uuid('record_id'),
  oldData: jsonb('old_data'),
  newData: jsonb('new_data'),
  createdAt: timestamp('created_at').defaultNow(),
});

module.exports = { auditLogs };

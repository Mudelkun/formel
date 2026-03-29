const { pgTable, uuid, varchar, text, integer, timestamp, index } = require('drizzle-orm/pg-core');
const { users } = require('./users');

const messageLogs = pgTable('message_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  jobId: varchar('job_id'),
  type: varchar('type').notNull(), // 'bulk' | 'individual'
  messageType: varchar('message_type').notNull(), // 'payment_reminder' | 'custom'
  subject: varchar('subject', { length: 300 }).notNull(),
  body: text('body'),
  recipientSummary: varchar('recipient_summary', { length: 500 }),
  totalRecipients: integer('total_recipients').notNull().default(0),
  sent: integer('sent').notNull().default(0),
  failed: integer('failed').notNull().default(0),
  status: varchar('status').notNull().default('pending'), // 'pending' | 'running' | 'done' | 'error'
  errors: text('errors'), // JSON string of error array
  sentById: uuid('sent_by_id').notNull().references(() => users.id),
  sentAt: timestamp('sent_at').defaultNow(),
  finishedAt: timestamp('finished_at'),
}, (table) => [
  index().on(table.sentAt),
  index().on(table.sentById),
]);

module.exports = { messageLogs };

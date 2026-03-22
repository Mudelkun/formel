const { pgTable, uuid, text, timestamp, index } = require('drizzle-orm/pg-core');
const { payments } = require('./payments');

const paymentDocuments = pgTable('payment_documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  paymentId: uuid('payment_id').notNull().references(() => payments.id),
  documentUrl: text('document_url').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at'),
}, (table) => [
  index().on(table.paymentId),
]);

module.exports = { paymentDocuments };

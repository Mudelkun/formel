const { pgTable, uuid, text, boolean, timestamp } = require('drizzle-orm/pg-core');
const { users } = require('./users');

const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  revoked: boolean('revoked').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

module.exports = { refreshTokens };

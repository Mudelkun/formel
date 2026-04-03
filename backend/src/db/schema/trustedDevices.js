const { pgTable, uuid, text, timestamp } = require('drizzle-orm/pg-core');
const { users } = require('./users');

const trustedDevices = pgTable('trusted_devices', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  deviceFingerprint: text('device_fingerprint').notNull(),
  userAgent: text('user_agent'),
  ipAddress: text('ip_address'),
  createdAt: timestamp('created_at').defaultNow(),
  lastSeenAt: timestamp('last_seen_at').defaultNow(),
});

module.exports = { trustedDevices };

const { drizzle } = require('drizzle-orm/postgres-js');
const { eq } = require('drizzle-orm');
const postgres = require('postgres');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const dotenv = require('dotenv');

dotenv.config();

const schema = require('./schema');

const client = postgres(process.env.DATABASE_URL);
const db = drizzle(client, { schema });

async function seed() {
  console.log('Seeding database...');

  // --- Admin User (skip if already exists) ---
  const existing = await db.select().from(schema.users).where(eq(schema.users.email, 'admin@formel.school')).limit(1);
  if (existing.length === 0) {
    const adminPass = process.env.SEED_ADMIN_PASSWORD ?? crypto.randomBytes(12).toString('hex');
    const passwordHash = await bcrypt.hash(adminPass, 10);
    await db.insert(schema.users).values({
      name: 'Admin Principal',
      email: 'admin@formel.school',
      passwordHash,
      role: 'admin',
    });
    console.log('✓ Admin user created');
    console.log(`  admin@formel.school / ${adminPass}`);
  } else {
    console.log('✓ Admin user already exists, skipping');
  }

  // --- School Settings (skip if already exists) ---
  const existingSettings = await db.select().from(schema.schoolSettings).limit(1);
  if (existingSettings.length === 0) {
    await db.insert(schema.schoolSettings).values({
      schoolName: 'École Formel',
      address: 'Port-au-Prince, Haïti',
      phone: '+509 00 000 0000',
      email: 'contact@formel.school',
      currency: 'HTG',
    });
    console.log('✓ School settings created (currency: HTG)');
  } else {
    console.log('✓ School settings already exist, skipping');
  }

  console.log('\nSeed complete!');

  await client.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});

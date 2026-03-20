const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');

dotenv.config();

const schema = require('./schema');

const client = postgres(process.env.DATABASE_URL);
const db = drizzle(client, { schema });

async function seed() {
  console.log('Seeding database...');

  // --- Admin User ---
  const passwordHash = await bcrypt.hash('admin123', 10);
  await db.insert(schema.users).values({
    name: 'Admin Principal',
    email: 'admin@formel.school',
    passwordHash,
    role: 'admin',
  });
  console.log('✓ Admin user created');

  // --- School Settings ---
  await db.insert(schema.schoolSettings).values({
    schoolName: 'École Formel',
    address: 'Port-au-Prince, Haïti',
    phone: '+509 00 000 0000',
    email: 'contact@formel.school',
    currency: 'HTG',
  });
  console.log('✓ School settings created (currency: HTG)');

  console.log('\nSeed complete!');
  console.log('\nAdmin account:');
  console.log('  admin@formel.school / admin123');

  await client.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});

const { drizzle } = require('drizzle-orm/postgres-js');
const { eq } = require('drizzle-orm');
const postgres = require('postgres');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
const readline = require('readline');

dotenv.config();

const schema = require('./schema');

const client = postgres(process.env.DATABASE_URL);
const db = drizzle(client, { schema });

// ── Confirmation prompt ───────────────────────────────────────

function askConfirmation() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    console.log('');
    console.log('\x1b[33m⚠️  ATTENTION: Cette opération va SUPPRIMER toutes les données de la base de données.\x1b[0m');
    console.log('Seuls les utilisateurs admin et secrétaire seront recréés.');
    console.log('');
    rl.question('Êtes-vous sûr de vouloir continuer ? (oui/non) : ', (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'oui');
    });
  });
}

// ── Clear all tables ──────────────────────────────────────────

async function clearAllTables() {
  console.log('\nSuppression des données existantes...');
  await db.delete(schema.auditLogs);
  await db.delete(schema.refreshTokens);
  await db.delete(schema.paymentDocuments);
  await db.delete(schema.scholarships);
  await db.delete(schema.payments);
  await db.delete(schema.enrollments);
  await db.delete(schema.contacts);
  await db.delete(schema.studentDocuments);
  await db.delete(schema.versements);
  await db.delete(schema.feeConfigs);
  await db.delete(schema.classes);
  await db.delete(schema.students);
  await db.delete(schema.classGroups);
  await db.delete(schema.schoolYears);
  await db.delete(schema.users);
  await db.delete(schema.schoolSettings);
  console.log('✓ Toutes les données ont été supprimées');
}

// ── Seed users ────────────────────────────────────────────────

async function seedUsers() {
  console.log('\nCréation des utilisateurs...');
  const adminHash = await bcrypt.hash('admin123', 10);
  const staffHash = await bcrypt.hash('password123', 10);

  const users = await db.insert(schema.users).values([
    { name: 'Admin Principal', email: 'admin@formel.school', passwordHash: adminHash, role: 'admin' },
    { name: 'Marie Claire Joseph', email: 'secretary@formel.school', passwordHash: staffHash, role: 'secretary' },
  ]).returning();
  console.log(`✓ ${users.length} utilisateurs créés`);
  return users;
}

// ── Main ───────────────────────────────────────────────────────

async function deleteAndRecreateUsers() {
  const confirmed = await askConfirmation();
  if (!confirmed) {
    console.log('Opération annulée.');
    await client.end();
    process.exit(0);
  }

  try {
    await clearAllTables();
    await seedUsers();

    console.log('\n\x1b[32m✅ Opération terminée avec succès !\x1b[0m\n');
    console.log('Comptes de connexion :');
    console.log('  Admin:      admin@formel.school / admin123');
    console.log('  Secrétaire: secretary@formel.school / password123');
  } catch (err) {
    console.error('\n\x1b[31m❌ Erreur:\x1b[0m', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

deleteAndRecreateUsers();
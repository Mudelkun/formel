const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const postgres = require('postgres');

dotenv.config();

async function main() {
  const client = postgres(process.env.DATABASE_URL);

  // Grab the first admin user from the DB
  const [admin] = await client`SELECT id, role FROM users WHERE role = 'admin' LIMIT 1`;

  if (!admin) {
    console.error('No admin user found — run db:seed first');
    process.exit(1);
  }

  const token = jwt.sign(
    { userId: admin.id, role: admin.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  console.log('\nAdmin token (valid 7 days):\n');
  console.log(token);

  await client.end();
}

main().catch(console.error);

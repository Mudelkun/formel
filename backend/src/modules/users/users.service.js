const bcrypt = require('bcrypt');
const { eq, count, and } = require('drizzle-orm');
const { db } = require('../../config/database');
const { users } = require('../../db/schema/users');
const { AppError } = require('../../lib/apiError');
const { revokeAllUserTokens } = require('../auth/auth.service');

const SAFE_COLUMNS = {
  id: users.id,
  name: users.name,
  email: users.email,
  role: users.role,
  isActive: users.isActive,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
};

async function listUsers({ role, page, limit }) {
  const conditions = [];
  if (role) conditions.push(eq(users.role, role));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [data, [{ total: totalCount }]] = await Promise.all([
    db.select(SAFE_COLUMNS).from(users).where(where)
      .limit(limit).offset((page - 1) * limit)
      .orderBy(users.name),
    db.select({ total: count() }).from(users).where(where),
  ]);

  return {
    data,
    pagination: {
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
    },
  };
}

async function createUser({ name, email, password, role }) {
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email));

  if (existing) {
    throw new AppError(409, 'Email already in use');
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const [user] = await db
    .insert(users)
    .values({ name, email, passwordHash, role, updatedAt: new Date() })
    .returning(SAFE_COLUMNS);

  return user;
}

async function getUserById(id) {
  const [user] = await db
    .select(SAFE_COLUMNS)
    .from(users)
    .where(eq(users.id, id));

  if (!user) {
    throw new AppError(404, 'User not found');
  }

  return user;
}

async function updateUser(id, data) {
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, id));

  if (!existing) {
    throw new AppError(404, 'User not found');
  }

  const updateData = { ...data, updatedAt: new Date() };
  delete updateData.email;

  if (data.password) {
    updateData.passwordHash = await bcrypt.hash(data.password, 10);
    delete updateData.password;
  }

  const [user] = await db
    .update(users)
    .set(updateData)
    .where(eq(users.id, id))
    .returning(SAFE_COLUMNS);

  return user;
}

async function deactivateUser(id, requestingUserId) {
  if (id === requestingUserId) {
    throw new AppError(400, 'Cannot deactivate your own account');
  }

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, id));

  if (!existing) {
    throw new AppError(404, 'User not found');
  }

  await db
    .update(users)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(users.id, id));

  await revokeAllUserTokens(id);

  return { message: 'User deactivated' };
}

module.exports = { listUsers, createUser, getUserById, updateUser, deactivateUser };

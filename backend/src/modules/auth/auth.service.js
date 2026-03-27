const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { eq, and } = require('drizzle-orm');
const { db } = require('../../config/database');
const { users } = require('../../db/schema/users');
const { refreshTokens } = require('../../db/schema/refreshTokens');
const { env } = require('../../config/env');
const { AppError } = require('../../lib/apiError');

const ACCESS_TOKEN_EXPIRY = '15m';

function generateAccessToken(userId, role) {
  return jwt.sign({ userId, role }, env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

function generateRefreshToken() {
  return crypto.randomBytes(32).toString('hex');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function sanitizeUser(user) {
  const { passwordHash, ...safe } = user;
  return safe;
}

async function login(email, password) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email));

  if (!user) {
    throw new AppError(401, 'Invalid email or password');
  }

  if (!user.isActive) {
    throw new AppError(401, 'Account deactivated');
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new AppError(401, 'Invalid email or password');
  }

  const accessToken = generateAccessToken(user.id, user.role);
  const rawRefreshToken = generateRefreshToken();
  const tokenHash = hashToken(rawRefreshToken);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + env.REFRESH_TOKEN_EXPIRY_DAYS);

  await db.insert(refreshTokens).values({
    userId: user.id,
    tokenHash,
    expiresAt,
  });

  return {
    accessToken,
    refreshToken: rawRefreshToken,
    user: sanitizeUser(user),
  };
}

async function refresh(rawRefreshToken) {
  const tokenHash = hashToken(rawRefreshToken);

  const [stored] = await db
    .select()
    .from(refreshTokens)
    .where(and(
      eq(refreshTokens.tokenHash, tokenHash),
      eq(refreshTokens.revoked, false),
    ));

  if (!stored || stored.expiresAt < new Date()) {
    throw new AppError(401, 'Invalid or expired refresh token');
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, stored.userId));

  if (!user || !user.isActive) {
    throw new AppError(401, 'Account deactivated');
  }

  // Revoke old token (rotation)
  await db
    .update(refreshTokens)
    .set({ revoked: true })
    .where(eq(refreshTokens.id, stored.id));

  // Issue new tokens
  const accessToken = generateAccessToken(user.id, user.role);
  const newRawRefreshToken = generateRefreshToken();
  const newTokenHash = hashToken(newRawRefreshToken);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + env.REFRESH_TOKEN_EXPIRY_DAYS);

  await db.insert(refreshTokens).values({
    userId: user.id,
    tokenHash: newTokenHash,
    expiresAt,
  });

  return {
    accessToken,
    refreshToken: newRawRefreshToken,
    user: sanitizeUser(user),
  };
}

async function logout(rawRefreshToken) {
  const tokenHash = hashToken(rawRefreshToken);

  await db
    .update(refreshTokens)
    .set({ revoked: true })
    .where(eq(refreshTokens.tokenHash, tokenHash));
}

async function revokeAllUserTokens(userId) {
  await db
    .update(refreshTokens)
    .set({ revoked: true })
    .where(eq(refreshTokens.userId, userId));
}

module.exports = { login, refresh, logout, revokeAllUserTokens };

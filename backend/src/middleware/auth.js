const jwt = require('jsonwebtoken');
const { eq } = require('drizzle-orm');
const { env } = require('../config/env');
const { db } = require('../config/database');
const { users } = require('../db/schema/users');
const { AppError } = require('../lib/apiError');
const { asyncHandler } = require('../lib/asyncHandler');

const auth = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    throw new AppError(401, 'Authentication required');
  }

  const token = header.split(' ')[1];
  let payload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET);
  } catch (err) {
    throw new AppError(401, 'Invalid or expired token');
  }

  const [user] = await db
    .select({ id: users.id, isActive: users.isActive })
    .from(users)
    .where(eq(users.id, payload.userId));

  if (!user || !user.isActive) {
    throw new AppError(401, 'Account deactivated');
  }

  req.user = { userId: payload.userId, role: payload.role };
  next();
});

module.exports = { auth };

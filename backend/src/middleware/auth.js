const jwt = require('jsonwebtoken');
const { env } = require('../config/env');
const { AppError } = require('../lib/apiError');

const auth = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    throw new AppError(401, 'Authentication required');
  }

  const token = header.split(' ')[1];
  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    req.user = { userId: payload.userId, role: payload.role };
    next();
  } catch (err) {
    throw new AppError(401, 'Invalid or expired token');
  }
};

module.exports = { auth };

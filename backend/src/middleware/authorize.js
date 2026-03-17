const { AppError } = require('../lib/apiError');

const authorize = (...allowedRoles) => (req, res, next) => {
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    throw new AppError(403, 'Insufficient permissions');
  }
  next();
};

module.exports = { authorize };

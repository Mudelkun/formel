const { AppError } = require('../lib/apiError');

const errorHandler = (err, req, res, next) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: { message: err.message, details: err.details },
    });
  }

  if (err.name === 'MulterError') {
    return res.status(400).json({
      error: { message: `File upload error: ${err.message}` },
    });
  }

  console.error('Unhandled error:', err);
  res.status(500).json({
    error: { message: 'Internal server error' },
  });
};

module.exports = { errorHandler };

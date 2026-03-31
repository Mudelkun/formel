const Sentry = require('@sentry/node');
const { AppError } = require('../lib/apiError');

const errorHandler = (err, req, res, next) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: { message: err.message, details: err.details },
    });
  }

  if (err.name === 'MulterError') {
    const messages = {
      LIMIT_FILE_SIZE: 'Le fichier dépasse la taille maximale de 10 Mo. Veuillez choisir un fichier plus petit.',
      LIMIT_UNEXPECTED_FILE: 'Type de fichier non supporté.',
    };
    const message = messages[err.code] || `Erreur de téléchargement: ${err.message}`;
    return res.status(400).json({
      error: { message },
    });
  }

  if (Sentry.isInitialized()) {
    Sentry.captureException(err);
  }
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: { message: 'Internal server error' },
  });
};

module.exports = { errorHandler };

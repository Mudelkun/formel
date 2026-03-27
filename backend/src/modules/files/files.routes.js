const { Router } = require('express');
const { auth } = require('../../middleware/auth');
const { streamFile } = require('../../lib/uploadService');
const { AppError } = require('../../lib/apiError');
const { asyncHandler } = require('../../lib/asyncHandler');

const router = Router();

// Proxy route: GET /api/files/* streams the file from R2 (auth required)
router.get('/{*key}', auth, asyncHandler(async (req, res) => {
  const key = Array.isArray(req.params.key) ? req.params.key.join('/') : req.params.key;

  if (!key) {
    throw new AppError(400, 'File key required');
  }

  // Path traversal protection
  if (key.includes('..')) {
    throw new AppError(400, 'Invalid file path');
  }

  try {
    const { body, contentType, contentLength } = await streamFile(key);

    res.set('Content-Type', contentType || 'application/octet-stream');
    if (contentLength) {
      res.set('Content-Length', String(contentLength));
    }
    res.set('Cache-Control', 'private, max-age=3600');

    // AWS SDK v3 Body is a Readable stream — pipe it directly to the response
    body.pipe(res);
  } catch (err) {
    if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) {
      throw new AppError(404, 'File not found');
    }
    throw err;
  }
}));

module.exports = router;

const { S3Client } = require('@aws-sdk/client-s3');
const { env } = require('./env');

let r2 = null;

if (env.R2_ACCOUNT_ID && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY) {
  r2 = new S3Client({
    region: 'auto',
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  });
} else {
  console.warn('R2 credentials not configured — file uploads disabled');
}

module.exports = { r2 };

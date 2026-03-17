const { PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { r2 } = require('../config/r2');
const { env } = require('../config/env');

async function uploadFile(buffer, key, contentType) {
  await r2.send(new PutObjectCommand({
    Bucket: env.R2_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  }));
  return `${env.R2_PUBLIC_URL}/${key}`;
}

async function deleteFile(key) {
  await r2.send(new DeleteObjectCommand({
    Bucket: env.R2_BUCKET_NAME,
    Key: key,
  }));
}

function extractKeyFromUrl(url) {
  return url.replace(`${env.R2_PUBLIC_URL}/`, '');
}

module.exports = { uploadFile, deleteFile, extractKeyFromUrl };

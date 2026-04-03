const { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { r2 } = require('../config/r2');
const { env } = require('../config/env');

async function uploadFile(buffer, key, contentType) {
  if (!r2) throw new Error('R2 storage is not configured — file uploads are disabled');
  await r2.send(new PutObjectCommand({
    Bucket: env.R2_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  }));
  // Return just the key — files are served through the /api/files proxy
  return key;
}

async function streamFile(key) {
  if (!r2) throw new Error('R2 storage is not configured — file uploads are disabled');
  const response = await r2.send(new GetObjectCommand({
    Bucket: env.R2_BUCKET_NAME,
    Key: key,
  }));
  return {
    body: response.Body,
    contentType: response.ContentType,
    contentLength: response.ContentLength,
  };
}

async function deleteFile(key) {
  if (!r2) throw new Error('R2 storage is not configured — file uploads are disabled');
  await r2.send(new DeleteObjectCommand({
    Bucket: env.R2_BUCKET_NAME,
    Key: key,
  }));
}

function extractKeyFromUrl(url) {
  // Handle both old full URLs and new key-only format
  if (env.R2_PUBLIC_URL && url.startsWith(env.R2_PUBLIC_URL)) {
    return url.replace(`${env.R2_PUBLIC_URL}/`, '');
  }
  return url;
}

module.exports = { uploadFile, streamFile, deleteFile, extractKeyFromUrl };

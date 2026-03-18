const { asyncHandler } = require('../../lib/asyncHandler');
const paymentDocsService = require('./paymentDocuments.service');

const listDocuments = asyncHandler(async (req, res) => {
  const data = await paymentDocsService.listDocuments(req.params.id);
  res.json({ data });
});

const uploadDocument = asyncHandler(async (req, res) => {
  const doc = await paymentDocsService.uploadDocument(req.params.id, req.file, req.user.userId);
  res.status(201).json(doc);
});

const deleteDocument = asyncHandler(async (req, res) => {
  await paymentDocsService.deleteDocument(req.params.id, req.params.docId, req.user.userId);
  res.status(204).send();
});

module.exports = { listDocuments, uploadDocument, deleteDocument };

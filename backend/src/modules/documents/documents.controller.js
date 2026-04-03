const { asyncHandler } = require('../../lib/asyncHandler');
const documentsService = require('./documents.service');

const listDocuments = asyncHandler(async (req, res) => {
  const data = await documentsService.listDocuments(req.params.id);
  res.json({ data });
});

const uploadDocument = asyncHandler(async (req, res) => {
  const doc = await documentsService.uploadDocument(req.params.id, req.file, req.body.documentType, req.user.userId);
  res.status(201).json(doc);
});

const deleteDocument = asyncHandler(async (req, res) => {
  await documentsService.deleteDocument(req.params.id, req.params.docId, req.user.userId);
  res.status(204).send();
});

const uploadPhoto = asyncHandler(async (req, res) => {
  const result = await documentsService.uploadPhoto(req.params.id, req.file);
  res.json(result);
});

const deletePhoto = asyncHandler(async (req, res) => {
  await documentsService.deletePhoto(req.params.id);
  res.status(204).send();
});

module.exports = { listDocuments, uploadDocument, deleteDocument, uploadPhoto, deletePhoto };

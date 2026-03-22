const { Router } = require('express');
const { auth } = require('../../middleware/auth');
const { authorize } = require('../../middleware/authorize');
const { validate } = require('../../middleware/validate');
const { upload } = require('../../middleware/upload');
const {
  createStudentSchema,
  updateStudentSchema,
  listStudentsSchema,
  studentIdParamSchema,
} = require('./students.validation');
const {
  listStudents,
  createStudent,
  getStudent,
  updateStudent,
  promoteStudent,
  downgradeStudent,
} = require('./students.controller');

// Contacts
const {
  createContactSchema,
  updateContactSchema,
} = require('../contacts/contacts.validation');
const {
  listContacts,
  createContact,
  updateContact,
  deleteContact,
} = require('../contacts/contacts.controller');

// Documents
const {
  uploadDocumentSchema,
} = require('../documents/documents.validation');
const {
  listDocuments,
  uploadDocument,
  deleteDocument,
  uploadPhoto,
} = require('../documents/documents.controller');

// Balance
const {
  getBalanceSchema,
} = require('../balance/balance.validation');
const {
  getBalance,
} = require('../balance/balance.controller');

const router = Router();

// Students CRUD
router.get('/', auth, authorize('admin', 'secretary', 'teacher'), validate(listStudentsSchema), listStudents);
router.post('/', auth, authorize('admin', 'secretary'), validate(createStudentSchema), createStudent);
router.get('/:id', auth, authorize('admin', 'secretary', 'teacher'), validate(studentIdParamSchema), getStudent);
router.patch('/:id', auth, authorize('admin', 'secretary'), validate(updateStudentSchema), updateStudent);

// Promote / Downgrade
router.post('/:id/promote', auth, authorize('admin', 'secretary'), validate(studentIdParamSchema), promoteStudent);
router.post('/:id/downgrade', auth, authorize('admin', 'secretary'), validate(studentIdParamSchema), downgradeStudent);

// Photo
router.post('/:id/photo', auth, authorize('admin', 'secretary'), upload.single('photo'), uploadPhoto);

// Documents
router.get('/:id/documents', auth, authorize('admin', 'secretary'), validate(studentIdParamSchema), listDocuments);
router.post('/:id/documents', auth, authorize('admin', 'secretary'), upload.single('file'), validate(uploadDocumentSchema), uploadDocument);
router.delete('/:id/documents/:docId', auth, authorize('admin'), deleteDocument);

// Contacts
router.get('/:id/contacts', auth, authorize('admin', 'secretary'), validate(studentIdParamSchema), listContacts);
router.post('/:id/contacts', auth, authorize('admin', 'secretary'), validate(createContactSchema), createContact);
router.patch('/:id/contacts/:contactId', auth, authorize('admin', 'secretary'), validate(updateContactSchema), updateContact);
router.delete('/:id/contacts/:contactId', auth, authorize('admin'), deleteContact);

// Balance
router.get('/:id/balance', auth, authorize('admin', 'secretary'), validate(getBalanceSchema), getBalance);

module.exports = router;

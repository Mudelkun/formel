const { z } = require('zod');

const uploadDocumentSchema = z.object({
  body: z.object({
    documentType: z.enum(['birth_certificate', 'id_card', 'transcript', 'medical_record', 'other']),
  }),
  params: z.object({ id: z.string().uuid() }),
});

module.exports = { uploadDocumentSchema };

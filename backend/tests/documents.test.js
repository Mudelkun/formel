const {
  uploadDocumentSchema,
} = require('../src/modules/documents/documents.validation');

describe('Document validation schemas', () => {
  const validUuid = '550e8400-e29b-41d4-a716-446655440000';

  describe('uploadDocumentSchema', () => {
    test('should accept valid document type', () => {
      const result = uploadDocumentSchema.safeParse({
        body: { documentType: 'birth_certificate' },
        params: { id: validUuid },
      });
      expect(result.success).toBe(true);
    });

    test('should accept all valid document types', () => {
      const types = ['birth_certificate', 'id_card', 'transcript', 'medical_record', 'other'];
      types.forEach((type) => {
        const result = uploadDocumentSchema.safeParse({
          body: { documentType: type },
          params: { id: validUuid },
        });
        expect(result.success).toBe(true);
      });
    });

    test('should reject invalid document type', () => {
      const result = uploadDocumentSchema.safeParse({
        body: { documentType: 'passport' },
        params: { id: validUuid },
      });
      expect(result.success).toBe(false);
    });

    test('should reject missing document type', () => {
      const result = uploadDocumentSchema.safeParse({
        body: {},
        params: { id: validUuid },
      });
      expect(result.success).toBe(false);
    });
  });
});

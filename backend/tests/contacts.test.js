const {
  createContactSchema,
  updateContactSchema,
} = require('../src/modules/contacts/contacts.validation');

describe('Contact validation schemas', () => {
  const validUuid = '550e8400-e29b-41d4-a716-446655440000';

  describe('createContactSchema', () => {
    const validContact = {
      firstName: 'Marie',
      lastName: 'Dupont',
      email: 'marie@example.com',
      relationship: 'mother',
    };

    test('should accept valid contact data', () => {
      const result = createContactSchema.safeParse({
        body: validContact,
        params: { id: validUuid },
      });
      expect(result.success).toBe(true);
    });

    test('should accept contact with optional fields', () => {
      const result = createContactSchema.safeParse({
        body: { ...validContact, phone: '+1234567890', isPrimary: true },
        params: { id: validUuid },
      });
      expect(result.success).toBe(true);
    });

    test('should default isPrimary to false', () => {
      const result = createContactSchema.safeParse({
        body: validContact,
        params: { id: validUuid },
      });
      expect(result.data.body.isPrimary).toBe(false);
    });

    test('should reject invalid email', () => {
      const result = createContactSchema.safeParse({
        body: { ...validContact, email: 'not-an-email' },
        params: { id: validUuid },
      });
      expect(result.success).toBe(false);
    });

    test('should reject missing required fields', () => {
      const result = createContactSchema.safeParse({
        body: { firstName: 'Marie' },
        params: { id: validUuid },
      });
      expect(result.success).toBe(false);
    });
  });

  describe('updateContactSchema', () => {
    const contactUuid = '660e8400-e29b-41d4-a716-446655440000';

    test('should accept partial update', () => {
      const result = updateContactSchema.safeParse({
        body: { phone: '+9876543210' },
        params: { id: validUuid, contactId: contactUuid },
      });
      expect(result.success).toBe(true);
    });

    test('should accept nullable phone', () => {
      const result = updateContactSchema.safeParse({
        body: { phone: null },
        params: { id: validUuid, contactId: contactUuid },
      });
      expect(result.success).toBe(true);
    });

    test('should reject invalid contactId', () => {
      const result = updateContactSchema.safeParse({
        body: { firstName: 'Updated' },
        params: { id: validUuid, contactId: 'bad' },
      });
      expect(result.success).toBe(false);
    });
  });
});

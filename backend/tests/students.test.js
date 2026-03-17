const {
  createStudentSchema,
  updateStudentSchema,
  listStudentsSchema,
  studentIdParamSchema,
} = require('../src/modules/students/students.validation');

describe('Student validation schemas', () => {
  describe('createStudentSchema', () => {
    const validStudent = {
      firstName: 'Jean',
      lastName: 'Dupont',
      gender: 'male',
      birthDate: '2010-05-15',
    };

    test('should accept valid student data', () => {
      const result = createStudentSchema.safeParse({ body: validStudent });
      expect(result.success).toBe(true);
    });

    test('should accept student with optional fields', () => {
      const result = createStudentSchema.safeParse({
        body: {
          ...validStudent,
          nie: 'NIE001',
          address: '123 Main St',
          scholarshipRecipient: true,
        },
      });
      expect(result.success).toBe(true);
    });

    test('should reject missing required fields', () => {
      const result = createStudentSchema.safeParse({
        body: { firstName: 'Jean' },
      });
      expect(result.success).toBe(false);
    });

    test('should reject invalid gender', () => {
      const result = createStudentSchema.safeParse({
        body: { ...validStudent, gender: 'invalid' },
      });
      expect(result.success).toBe(false);
    });

    test('should reject invalid date format', () => {
      const result = createStudentSchema.safeParse({
        body: { ...validStudent, birthDate: '15/05/2010' },
      });
      expect(result.success).toBe(false);
    });

    test('should default scholarshipRecipient to false', () => {
      const result = createStudentSchema.safeParse({ body: validStudent });
      expect(result.data.body.scholarshipRecipient).toBe(false);
    });
  });

  describe('updateStudentSchema', () => {
    const validUuid = '550e8400-e29b-41d4-a716-446655440000';

    test('should accept partial update', () => {
      const result = updateStudentSchema.safeParse({
        body: { firstName: 'Updated' },
        params: { id: validUuid },
      });
      expect(result.success).toBe(true);
    });

    test('should accept status change', () => {
      const result = updateStudentSchema.safeParse({
        body: { status: 'graduated' },
        params: { id: validUuid },
      });
      expect(result.success).toBe(true);
    });

    test('should reject invalid status', () => {
      const result = updateStudentSchema.safeParse({
        body: { status: 'deleted' },
        params: { id: validUuid },
      });
      expect(result.success).toBe(false);
    });

    test('should reject invalid uuid', () => {
      const result = updateStudentSchema.safeParse({
        body: { firstName: 'Test' },
        params: { id: 'not-a-uuid' },
      });
      expect(result.success).toBe(false);
    });
  });

  describe('listStudentsSchema', () => {
    test('should accept empty query', () => {
      const result = listStudentsSchema.safeParse({ query: {} });
      expect(result.success).toBe(true);
      expect(result.data.query.page).toBe(1);
      expect(result.data.query.limit).toBe(20);
    });

    test('should accept valid filters', () => {
      const result = listStudentsSchema.safeParse({
        query: { name: 'Jean', status: 'active', page: '2', limit: '10' },
      });
      expect(result.success).toBe(true);
      expect(result.data.query.page).toBe(2);
      expect(result.data.query.limit).toBe(10);
    });

    test('should reject limit over 100', () => {
      const result = listStudentsSchema.safeParse({
        query: { limit: '200' },
      });
      expect(result.success).toBe(false);
    });
  });

  describe('studentIdParamSchema', () => {
    test('should accept valid uuid', () => {
      const result = studentIdParamSchema.safeParse({
        params: { id: '550e8400-e29b-41d4-a716-446655440000' },
      });
      expect(result.success).toBe(true);
    });

    test('should reject invalid uuid', () => {
      const result = studentIdParamSchema.safeParse({
        params: { id: '123' },
      });
      expect(result.success).toBe(false);
    });
  });
});

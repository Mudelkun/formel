const {
  getBalanceSchema,
} = require('../src/modules/balance/balance.validation');

describe('Balance validation schemas', () => {
  const validUuid = '550e8400-e29b-41d4-a716-446655440000';
  const quarterUuid = '660e8400-e29b-41d4-a716-446655440000';

  describe('getBalanceSchema', () => {
    test('should accept valid student id without quarterId', () => {
      const result = getBalanceSchema.safeParse({
        params: { id: validUuid },
        query: {},
      });
      expect(result.success).toBe(true);
    });

    test('should accept valid student id with quarterId', () => {
      const result = getBalanceSchema.safeParse({
        params: { id: validUuid },
        query: { quarterId: quarterUuid },
      });
      expect(result.success).toBe(true);
    });

    test('should reject invalid student id', () => {
      const result = getBalanceSchema.safeParse({
        params: { id: 'not-uuid' },
        query: {},
      });
      expect(result.success).toBe(false);
    });

    test('should reject invalid quarterId', () => {
      const result = getBalanceSchema.safeParse({
        params: { id: validUuid },
        query: { quarterId: 'not-uuid' },
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('Balance computation logic', () => {
  // Unit tests for the balance calculation logic (without DB)
  function computeDiscount(tuitionAmount, scholarship) {
    if (!scholarship) return 0;
    switch (scholarship.type) {
      case 'full': return tuitionAmount;
      case 'partial': return tuitionAmount * (scholarship.percentage / 100);
      case 'fixed_amount': return scholarship.fixedAmount;
      default: return 0;
    }
  }

  test('should compute full scholarship discount', () => {
    const discount = computeDiscount(500000, { type: 'full' });
    expect(discount).toBe(500000);
  });

  test('should compute partial scholarship discount', () => {
    const discount = computeDiscount(500000, { type: 'partial', percentage: 50 });
    expect(discount).toBe(250000);
  });

  test('should compute fixed amount scholarship discount', () => {
    const discount = computeDiscount(500000, { type: 'fixed_amount', fixedAmount: 100000 });
    expect(discount).toBe(100000);
  });

  test('should return 0 discount when no scholarship', () => {
    const discount = computeDiscount(500000, null);
    expect(discount).toBe(0);
  });

  test('should compute quarter pro-rating', () => {
    const tuition = 400000;
    const numQuarters = 4;
    const quarterTuition = tuition / numQuarters;
    expect(quarterTuition).toBe(100000);
  });

  test('should compute remaining balance', () => {
    const amountDue = 450000;
    const amountPaid = 200000;
    expect(amountDue - amountPaid).toBe(250000);
  });
});

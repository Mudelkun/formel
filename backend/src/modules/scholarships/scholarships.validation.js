const { z } = require('zod');

const getScholarshipSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});

const createScholarshipSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    type: z.enum(['full', 'partial', 'fixed_amount']),
    percentage: z.coerce.number().min(0).max(100).optional(),
    fixedAmount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  }).refine(
    (data) => {
      if (data.type === 'partial' && (data.percentage === undefined || data.percentage === null)) return false;
      if (data.type === 'fixed_amount' && !data.fixedAmount) return false;
      return true;
    },
    { message: 'partial requires percentage, fixed_amount requires fixedAmount' },
  ),
});

const updateScholarshipSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    type: z.enum(['full', 'partial', 'fixed_amount']).optional(),
    percentage: z.coerce.number().min(0).max(100).nullable().optional(),
    fixedAmount: z.string().regex(/^\d+(\.\d{1,2})?$/).nullable().optional(),
  }),
});

const deleteScholarshipSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});

module.exports = {
  getScholarshipSchema,
  createScholarshipSchema,
  updateScholarshipSchema,
  deleteScholarshipSchema,
};

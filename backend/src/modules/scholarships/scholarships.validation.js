const { z } = require('zod');

const listScholarshipsSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});

const createScholarshipSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    type: z.enum(['partial', 'fixed_amount', 'versement_annulation', 'book_annulation']),
    percentage: z.coerce.number().min(0).max(100).optional(),
    fixedAmount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
    targetVersementId: z.string().uuid().optional(),
  }).refine(
    (data) => {
      if (data.type === 'partial' && (data.percentage === undefined || data.percentage === null)) return false;
      if (data.type === 'fixed_amount' && !data.fixedAmount) return false;
      if (data.type === 'versement_annulation' && (!data.fixedAmount || !data.targetVersementId)) return false;
      if (data.type === 'book_annulation' && !data.fixedAmount) return false;
      return true;
    },
    { message: 'partial requires percentage, fixed_amount/annulation requires fixedAmount, versement_annulation requires targetVersementId' },
  ),
});

const updateScholarshipSchema = z.object({
  params: z.object({ scholarshipId: z.string().uuid() }),
  body: z.object({
    type: z.enum(['partial', 'fixed_amount', 'versement_annulation', 'book_annulation']).optional(),
    percentage: z.coerce.number().min(0).max(100).nullable().optional(),
    fixedAmount: z.string().regex(/^\d+(\.\d{1,2})?$/).nullable().optional(),
    targetVersementId: z.string().uuid().nullable().optional(),
  }),
});

const deleteScholarshipSchema = z.object({
  params: z.object({ scholarshipId: z.string().uuid() }),
});

module.exports = {
  listScholarshipsSchema,
  createScholarshipSchema,
  updateScholarshipSchema,
  deleteScholarshipSchema,
};

const { z } = require('zod');

const versementItem = z.object({
  number: z.coerce.number().int().min(1).max(3),
  name: z.string().min(1).max(100),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const getFeesSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  query: z.object({
    schoolYearId: z.string().uuid(),
  }),
});

const createFeesSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    schoolYearId: z.string().uuid(),
    bookFee: z.string().regex(/^\d+(\.\d{1,2})?$/),
    versements: z.array(versementItem).min(1).max(3),
  }),
});

const updateFeesSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    schoolYearId: z.string().uuid(),
    bookFee: z.string().regex(/^\d+(\.\d{1,2})?$/),
    versements: z.array(versementItem).min(1).max(3),
  }),
});

const updateVersementSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    amount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
    dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  }),
});

module.exports = {
  getFeesSchema,
  createFeesSchema,
  updateFeesSchema,
  updateVersementSchema,
};

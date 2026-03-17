const { z } = require('zod');

const createContactSchema = z.object({
  body: z.object({
    firstName: z.string().min(1).max(100),
    lastName: z.string().min(1).max(100),
    phone: z.string().optional(),
    email: z.string().email(),
    relationship: z.string().min(1).max(50),
    isPrimary: z.boolean().optional().default(false),
  }),
  params: z.object({ id: z.string().uuid() }),
});

const updateContactSchema = z.object({
  body: z.object({
    firstName: z.string().min(1).max(100).optional(),
    lastName: z.string().min(1).max(100).optional(),
    phone: z.string().nullable().optional(),
    email: z.string().email().optional(),
    relationship: z.string().min(1).max(50).optional(),
    isPrimary: z.boolean().optional(),
  }),
  params: z.object({
    id: z.string().uuid(),
    contactId: z.string().uuid(),
  }),
});

module.exports = { createContactSchema, updateContactSchema };

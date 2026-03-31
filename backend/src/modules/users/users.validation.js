const { z } = require('zod');

const passwordSchema = z.string()
  .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
  .max(100)
  .regex(/[A-Z]/, 'Doit contenir au moins une lettre majuscule')
  .regex(/[0-9]/, 'Doit contenir au moins un chiffre');

const createUserSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100),
    email: z.string().email(),
    password: passwordSchema,
    role: z.enum(['admin', 'secretary', 'teacher', 'accountant']),
  }),
});

const updateUserSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    password: passwordSchema.optional(),
    role: z.enum(['admin', 'secretary', 'teacher', 'accountant']).optional(),
  }),
  params: z.object({ id: z.string().uuid() }),
});

const userIdParamSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});

const listUsersSchema = z.object({
  query: z.object({
    role: z.enum(['admin', 'secretary', 'teacher', 'accountant']).optional(),
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(100).optional().default(20),
  }),
});

module.exports = { createUserSchema, updateUserSchema, userIdParamSchema, listUsersSchema };

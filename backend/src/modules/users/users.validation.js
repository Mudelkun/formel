const { z } = require('zod');

const createUserSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100),
    email: z.string().email(),
    password: z.string().min(6).max(100),
    role: z.enum(['secretary', 'teacher', 'accountant']),
  }),
});

const updateUserSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    email: z.string().email().optional(),
    password: z.string().min(6).max(100).optional(),
    role: z.enum(['secretary', 'teacher', 'accountant']).optional(),
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

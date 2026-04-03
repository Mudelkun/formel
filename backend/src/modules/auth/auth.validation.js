const { z } = require('zod');

const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1),
  }),
});

const verifyDeviceSchema = z.object({
  body: z.object({
    sessionToken: z.string().min(1),
    code: z.string().length(6).regex(/^\d{6}$/, 'Code must be 6 digits'),
  }),
});

module.exports = { loginSchema, verifyDeviceSchema };

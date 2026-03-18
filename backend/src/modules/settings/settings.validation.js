const { z } = require('zod');

const updateSettingsSchema = z.object({
  body: z.object({
    schoolName: z.string().min(1).max(200).optional(),
    address: z.string().max(500).nullable().optional(),
    phone: z.string().max(50).nullable().optional(),
    email: z.string().email().nullable().optional(),
  }),
});

module.exports = { updateSettingsSchema };

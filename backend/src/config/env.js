const dotenv = require('dotenv');
const { z } = require('zod');

dotenv.config();

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(1),
  JWT_REFRESH_SECRET: z.string().min(1),
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().optional(),
  R2_PUBLIC_URL: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().default('Formel <onboarding@resend.dev>'),
  SECURITY_ALERT_EMAIL: z.string().email(),
  CORS_ORIGINS: z.string().default('http://localhost:5173').transform((s) => s.split(',')),
  REFRESH_TOKEN_EXPIRY_DAYS: z.coerce.number().default(7),
  PORT: z.coerce.number().default(3000),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.format());
  process.exit(1);
}

module.exports = { env: parsed.data };

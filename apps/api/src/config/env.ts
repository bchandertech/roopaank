import { existsSync } from 'node:fs';
import { z } from 'zod';

// Local dev reads apps/api/.env. Tests set their own values (tests/setup-env.ts), and
// hosted environments inject real environment variables.
if (process.env.NODE_ENV !== 'test' && existsSync('.env')) process.loadEnvFile('.env');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65_535).default(4000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  APP_VERSION: z.string().min(1).default(process.env.npm_package_version ?? 'unknown'),
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/, message: 'Must be a postgres:// URL' }),
  // Normalised to a bare origin ("https://example.com") so it compares equal to the Origin header.
  WEB_ORIGIN: z.url().transform((value) => new URL(value).origin),
  TRUST_PROXY: z.coerce.number().int().min(0).max(10).default(0),
  SESSION_TTL_DAYS: z.coerce.number().int().min(1).max(365).default(30),
  RAZORPAY_KEY_ID: z.string().min(1),
  RAZORPAY_KEY_SECRET: z.string().min(1),
  RAZORPAY_WEBHOOK_SECRET: z.string().min(1),
  UPLOAD_DIR: z.string().min(1).default('uploads'),
  PUBLIC_UPLOADS_URL: z.url().transform((value) => value.replace(/\/+$/, '')),
});

function loadConfig() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    // Name the bad variables but never print values: they may be secrets.
    const problems = parsed.error.issues.map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`);
    console.error(`Invalid environment configuration:\n${problems.join('\n')}`);
    process.exit(1);
  }
  const env = parsed.data;
  return {
    ...env,
    isProduction: env.NODE_ENV === 'production',
    isTest: env.NODE_ENV === 'test',
  };
}

export const config = loadConfig();

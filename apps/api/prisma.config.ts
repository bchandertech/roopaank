import { existsSync } from 'node:fs';
import { defineConfig } from 'prisma/config';

// Prisma 7 no longer reads .env itself. Local dev uses apps/api/.env; CI and hosted
// environments set real environment variables instead.
if (existsSync('.env')) process.loadEnvFile('.env');

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  // Not needed for `prisma generate`, so a missing URL must not fail install/CI builds.
  datasource: { url: process.env.DATABASE_URL ?? '' },
});

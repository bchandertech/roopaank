import { config } from '../../src/config/env.js';
import { prisma } from '../../src/lib/prisma.js';
import { assertIsTestDatabase } from '../test-database.js';

/** Empties every table so each test starts from a known state. */
export async function resetDatabase(): Promise<void> {
  assertIsTestDatabase(config.DATABASE_URL);
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  await prisma.$executeRawUnsafe(
    `TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(', ')} RESTART IDENTITY CASCADE`,
  );
  await prisma.$executeRawUnsafe('ALTER SEQUENCE "order_number_seq" RESTART WITH 1');
}

import { execSync } from 'node:child_process';

/**
 * Runs once before all test files: brings the test database schema up to date.
 * Jest loads this file outside its module mapper, so it can't import local .ts helpers;
 * keep the URL default in sync with tests/test-database.ts.
 */
export default function globalSetup(): void {
  const url = process.env.TEST_DATABASE_URL ?? 'postgresql://roopaank:roopaank@localhost:5434/roopaank_test';
  if (!new URL(url).pathname.endsWith('_test')) {
    throw new Error('Refusing to run tests: the test database name must end with "_test"');
  }
  execSync('npx prisma migrate deploy', { env: { ...process.env, DATABASE_URL: url }, stdio: 'pipe' });
}

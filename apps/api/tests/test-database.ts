/** Local Docker test database (see docker-compose.yml). CI overrides it with TEST_DATABASE_URL. */
export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://roopaank:roopaank@localhost:5434/roopaank_test';

/** Tests wipe data, so they must never point at a real database by mistake. */
export function assertIsTestDatabase(url: string): void {
  if (!new URL(url).pathname.endsWith('_test')) {
    throw new Error(`Refusing to run tests: database name in ${new URL(url).pathname} must end with "_test"`);
  }
}

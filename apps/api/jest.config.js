/** @type {import('jest').Config} */
export default {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.ts$': ['@swc/jest', { jsc: { parser: { syntax: 'typescript' }, target: 'es2023' } }],
  },
  moduleNameMapper: {
    // Source files import siblings as `./x.js` (Node ESM rule); map back to the .ts file.
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@roopaank/shared$': '<rootDir>/../../packages/shared/src/index.ts',
  },
  setupFiles: ['<rootDir>/tests/setup-env.ts'],
  setupFilesAfterEnv: ['<rootDir>/tests/after-env.ts'],
  globalSetup: '<rootDir>/tests/global-setup.ts',
  // Integration tests share one database, so they run in a single process (--runInBand).
  testTimeout: 20_000,
};

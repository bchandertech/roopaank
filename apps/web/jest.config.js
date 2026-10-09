/** @type {import('jest').Config} */
export default {
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  transform: {
    '^.+\\.(ts|tsx)$': [
      '@swc/jest',
      {
        jsc: {
          parser: { syntax: 'typescript', tsx: true },
          transform: { react: { runtime: 'automatic' } },
          target: 'es2023',
        },
      },
    ],
  },
  moduleNameMapper: {
    // "@/x" → "src/x" (mirrors tsconfig.app.json and vite.config.ts).
    '^@/(.*)$': '<rootDir>/src/$1',
    // Jest cannot import CSS or binary assets; Vite handles them in the real build.
    '\\.css$': '<rootDir>/test/style-mock.js',
    '\\.(png|jpe?g|gif|webp|svg|woff2?)$': '<rootDir>/test/file-mock.js',
  },
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/main.tsx', '!src/**/*.d.ts'],
};

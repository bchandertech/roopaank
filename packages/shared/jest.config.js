/** @type {import('jest').Config} */
export default {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.ts$': ['@swc/jest', { jsc: { parser: { syntax: 'typescript' }, target: 'es2023' } }],
  },
  // Source files import siblings as `./x.js` (Node ESM rule); map back to the .ts file.
  moduleNameMapper: { '^(\\.{1,2}/.*)\\.js$': '$1' },
};

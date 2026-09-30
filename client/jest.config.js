export default {
  testEnvironment: 'jsdom',
  // Cold CI runners compile React + the app on first import, which can exceed the 5s default.
  testTimeout: 20000,
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testMatch: ['<rootDir>/src/**/*.test.{js,jsx}'],
  transform: {
    '^.+\\.[jt]sx?$': 'babel-jest',
  },
  moduleNameMapper: {
    '\\.(css)$': '<rootDir>/test/styleMock.cjs',
  },
  collectCoverageFrom: ['src/**/*.{js,jsx}', '!src/**/*.test.{js,jsx}'],
  coverageDirectory: 'coverage',
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
  },
}

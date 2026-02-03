/**
 * Jest Configuration for Book Editor
 *
 * This configuration sets up Jest for testing the Node.js backend services.
 * Run tests with: npm test
 * Run with coverage: npm run test:coverage
 */

module.exports = {
  // Use Node.js environment (not jsdom)
  testEnvironment: 'node',

  // Look for test files in __tests__ directory
  testMatch: ['**/__tests__/**/*.test.js'],

  // Collect coverage from services and routes
  collectCoverageFrom: [
    'services/**/*.js',
    'routes/**/*.js',
    '!**/node_modules/**'
  ],

  // Coverage thresholds to maintain code quality
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },

  // Show verbose output
  verbose: true,

  // Timeout for async tests (document generation can take time)
  testTimeout: 10000,

  // Clear mocks between tests
  clearMocks: true,

  // Coverage output directory
  coverageDirectory: 'coverage',

  // Files to ignore
  testPathIgnorePatterns: [
    '/node_modules/',
    '/frontend/'
  ]
};

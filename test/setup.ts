// Test setup and global configuration

// Extend Jest matchers if needed
expect.extend({
  // Custom matchers can be added here
});

// Set default test timeout
jest.setTimeout(10000);

// Suppress console output during tests (optional)
// const consoleMock = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
//   error: jest.fn(),
// };

// Test setup and global configuration

// Mock chalk for testing
const createChalkFunction = (code: string) => {
  const fn: any = (str: string) => `\x1b[${code}m${str}\x1b[39m`;
  fn.bold = (str: string) => `\x1b[${code}m${str}\x1b[39m`;
  return fn;
};

jest.mock('chalk', () => ({
  __esModule: true,
  default: {
    bold: (str: string) => str,
    underline: (str: string) => str,
    red: createChalkFunction('31'),
    yellow: createChalkFunction('33'),
    blue: createChalkFunction('34'),
    green: createChalkFunction('32'),
    gray: createChalkFunction('90'),
  },
}));

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

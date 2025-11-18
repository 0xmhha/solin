module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.test.ts', '**/*.spec.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverageFrom: [
    'lib/**/*.ts',
    '!lib/**/*.d.ts',
    '!lib/**/index.ts',
    '!lib/**/*.interface.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/lib/$1',
    '^@core/(.*)$': '<rootDir>/lib/core/$1',
    '^@parser/(.*)$': '<rootDir>/lib/parser/$1',
    '^@rules/(.*)$': '<rootDir>/lib/rules/$1',
    '^@config/(.*)$': '<rootDir>/lib/config/$1',
    '^@cli/(.*)$': '<rootDir>/lib/cli/$1',
    '^@formatters/(.*)$': '<rootDir>/lib/formatters/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  testTimeout: 10000,
  globals: {
    'ts-jest': {
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
    },
  },
};

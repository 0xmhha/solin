/**
 * CLI Tests
 *
 * Testing the command-line interface functionality
 */

import { CLI } from '@cli/cli';

describe('CLI', () => {
  let cli: CLI;

  beforeEach(() => {
    cli = new CLI();
  });

  describe('constructor', () => {
    test('should create CLI instance', () => {
      expect(cli).toBeInstanceOf(CLI);
    });
  });

  describe('parseArguments', () => {
    test('should parse file arguments', () => {
      const args = ['node', 'solin', 'test.sol'];
      const result = cli.parseArguments(args);

      expect(result.files).toEqual(['test.sol']);
    });

    test('should parse multiple files', () => {
      const args = ['node', 'solin', 'test1.sol', 'test2.sol'];
      const result = cli.parseArguments(args);

      expect(result.files).toEqual(['test1.sol', 'test2.sol']);
    });

    test('should parse config option', () => {
      const args = ['node', 'solin', '--config', '.solinrc.json', 'test.sol'];
      const result = cli.parseArguments(args);

      expect(result.config).toBe('.solinrc.json');
      expect(result.files).toEqual(['test.sol']);
    });

    test('should parse format option', () => {
      const args = ['node', 'solin', '--format', 'json', 'test.sol'];
      const result = cli.parseArguments(args);

      expect(result.format).toBe('json');
    });

    test('should parse fix option', () => {
      const args = ['node', 'solin', '--fix', 'test.sol'];
      const result = cli.parseArguments(args);

      expect(result.fix).toBe(true);
    });

    test('should parse cache option', () => {
      const args = ['node', 'solin', '--cache', 'test.sol'];
      const result = cli.parseArguments(args);

      expect(result.cache).toBe(true);
    });

    test('should parse parallel option', () => {
      const args = ['node', 'solin', '--parallel', '4', 'test.sol'];
      const result = cli.parseArguments(args);

      expect(result.parallel).toBe(4);
    });
  });

  describe('getVersion', () => {
    test('should return version from package.json', () => {
      const version = cli.getVersion();

      expect(version).toMatch(/^\d+\.\d+\.\d+$/);
      expect(version).toBe('0.1.0');
    });
  });

  describe('showHelp', () => {
    test('should return help text', () => {
      const help = cli.showHelp();

      expect(help).toContain('Usage:');
      expect(help).toContain('solin');
      expect(help).toContain('Options:');
    });

    test('should include all main options in help', () => {
      const help = cli.showHelp();

      expect(help).toContain('--config');
      expect(help).toContain('--format');
      expect(help).toContain('--fix');
      expect(help).toContain('--cache');
      expect(help).toContain('--parallel');
    });
  });
});

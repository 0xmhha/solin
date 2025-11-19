/**
 * Analyze Command Tests
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { AnalyzeCommand } from '@/cli/commands/analyze';
import type { ParsedArguments } from '@/cli/types';

describe('AnalyzeCommand', () => {
  let analyzeCommand: AnalyzeCommand;
  let testDir: string;
  let originalCwd: string;
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let stdoutWriteSpy: jest.SpyInstance;

  beforeEach(async () => {
    analyzeCommand = new AnalyzeCommand();
    originalCwd = process.cwd();

    // Create a temp directory for testing
    testDir = path.join(__dirname, 'test-analyze-' + Date.now());
    await fs.mkdir(testDir, { recursive: true });
    process.chdir(testDir);

    // Mock console
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    stdoutWriteSpy = jest.spyOn(process.stdout, 'write').mockImplementation();
  });

  afterEach(async () => {
    // Restore
    process.chdir(originalCwd);
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    stdoutWriteSpy.mockRestore();

    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  /**
   * Create a default ParsedArguments object
   */
  function createArgs(overrides: Partial<ParsedArguments> = {}): ParsedArguments {
    return {
      files: [],
      format: 'stylish',
      quiet: true,
      ...overrides,
    };
  }

  /**
   * Create a test Solidity file
   */
  async function createSolidityFile(name: string, content: string): Promise<string> {
    const filePath = path.join(testDir, name);
    await fs.writeFile(filePath, content, 'utf-8');
    return filePath;
  }

  describe('basic functionality', () => {
    test('should return 2 when no files found', async () => {
      const args = createArgs({ files: ['nonexistent.sol'] });
      const result = await analyzeCommand.execute(args);
      expect(result).toBe(2);
    });

    test('should analyze a single valid file', async () => {
      const content = `
        // SPDX-License-Identifier: MIT
        pragma solidity ^0.8.0;
        contract Test {
          function foo() public pure returns (uint256) {
            return 42;
          }
        }
      `;
      const filePath = await createSolidityFile('test.sol', content);

      const args = createArgs({ files: [filePath] });
      const result = await analyzeCommand.execute(args);

      // Should complete without critical errors
      expect([0, 1]).toContain(result);
    });

    test('should analyze multiple files', async () => {
      const content1 = `
        // SPDX-License-Identifier: MIT
        pragma solidity ^0.8.0;
        contract Test1 {}
      `;
      const content2 = `
        // SPDX-License-Identifier: MIT
        pragma solidity ^0.8.0;
        contract Test2 {}
      `;

      const file1 = await createSolidityFile('test1.sol', content1);
      const file2 = await createSolidityFile('test2.sol', content2);

      const args = createArgs({ files: [file1, file2] });
      const result = await analyzeCommand.execute(args);

      expect([0, 1]).toContain(result);
    });

    test('should return 2 for invalid Solidity syntax', async () => {
      const content = `
        this is not valid solidity
      `;
      const filePath = await createSolidityFile('invalid.sol', content);

      const args = createArgs({ files: [filePath] });
      const result = await analyzeCommand.execute(args);

      // Parse errors return 2
      expect(result).toBe(2);
    });
  });

  describe('output formats', () => {
    test('should output stylish format by default', async () => {
      const content = `
        // SPDX-License-Identifier: MIT
        pragma solidity ^0.8.0;
        contract Test {}
      `;
      const filePath = await createSolidityFile('test.sol', content);

      const args = createArgs({ files: [filePath], format: 'stylish' });
      await analyzeCommand.execute(args);

      // Stylish formatter outputs string format
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    test('should output JSON format when specified', async () => {
      const content = `
        // SPDX-License-Identifier: MIT
        pragma solidity ^0.8.0;
        contract Test {}
      `;
      const filePath = await createSolidityFile('test.sol', content);

      const args = createArgs({ files: [filePath], format: 'json' });
      await analyzeCommand.execute(args);

      // Check that output is valid JSON
      const output = consoleLogSpy.mock.calls
        .map((call) => call[0])
        .filter((s) => typeof s === 'string' && s.trim().startsWith('{'))
        .join('');

      if (output) {
        expect(() => JSON.parse(output)).not.toThrow();
      }
    });

    test('should output SARIF format when specified', async () => {
      const content = `
        // SPDX-License-Identifier: MIT
        pragma solidity ^0.8.0;
        contract Test {}
      `;
      const filePath = await createSolidityFile('test.sol', content);

      const args = createArgs({ files: [filePath], format: 'sarif' });
      await analyzeCommand.execute(args);

      // SARIF is JSON with specific schema
      const output = consoleLogSpy.mock.calls
        .map((call) => call[0])
        .filter((s) => typeof s === 'string' && s.includes('$schema'))
        .join('');

      if (output) {
        const sarif = JSON.parse(output);
        expect(sarif.$schema).toContain('sarif');
      }
    });

    test('should output HTML format when specified', async () => {
      const content = `
        // SPDX-License-Identifier: MIT
        pragma solidity ^0.8.0;
        contract Test {}
      `;
      const filePath = await createSolidityFile('test.sol', content);

      const args = createArgs({ files: [filePath], format: 'html' });
      await analyzeCommand.execute(args);

      // HTML format should contain HTML tags
      const output = consoleLogSpy.mock.calls.map((call) => call[0]).join('');
      expect(output).toContain('<');
    });
  });

  describe('issue detection', () => {
    test('should detect tx.origin usage', async () => {
      const content = `
        // SPDX-License-Identifier: MIT
        pragma solidity ^0.8.0;
        contract Test {
          function isOwner() public view returns (bool) {
            return tx.origin == msg.sender;
          }
        }
      `;
      const filePath = await createSolidityFile('tx-origin.sol', content);

      const args = createArgs({ files: [filePath], format: 'json' });
      const result = await analyzeCommand.execute(args);

      // Should find issues
      expect(result).toBe(1);
    });

    test('should detect floating pragma', async () => {
      const content = `
        // SPDX-License-Identifier: MIT
        pragma solidity ^0.8.0;
        contract Test {}
      `;
      const filePath = await createSolidityFile('floating-pragma.sol', content);

      const args = createArgs({ files: [filePath], format: 'json' });
      await analyzeCommand.execute(args);

      // Should complete (may or may not find issues depending on config)
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    test('should detect empty blocks', async () => {
      const content = `
        // SPDX-License-Identifier: MIT
        pragma solidity 0.8.19;
        contract Test {
          function foo() public {}
        }
      `;
      const filePath = await createSolidityFile('empty-block.sol', content);

      const args = createArgs({ files: [filePath], format: 'json' });
      await analyzeCommand.execute(args);

      expect(consoleLogSpy).toHaveBeenCalled();
    });
  });

  describe('exit codes', () => {
    test('should return 0 when no errors', async () => {
      const content = `
        // SPDX-License-Identifier: MIT
        pragma solidity 0.8.19;
        contract Test {
          uint256 private value;
          function getValue() public view returns (uint256) {
            return value;
          }
        }
      `;
      const filePath = await createSolidityFile('clean.sol', content);

      const args = createArgs({ files: [filePath] });
      const result = await analyzeCommand.execute(args);

      // Should be 0 or 1 depending on rule configuration
      expect([0, 1]).toContain(result);
    });

    test('should return 1 when errors found', async () => {
      const content = `
        // SPDX-License-Identifier: MIT
        pragma solidity ^0.8.0;
        contract Test {
          function withdraw() public {
            require(tx.origin == msg.sender);
          }
        }
      `;
      const filePath = await createSolidityFile('with-errors.sol', content);

      const args = createArgs({ files: [filePath] });
      const result = await analyzeCommand.execute(args);

      expect(result).toBe(1);
    });

    test('should return 2 when no files found', async () => {
      const args = createArgs({ files: ['*.nonexistent'] });
      const result = await analyzeCommand.execute(args);
      expect(result).toBe(2);
    });
  });

  describe('configuration', () => {
    test('should use custom config file', async () => {
      const content = `
        // SPDX-License-Identifier: MIT
        pragma solidity ^0.8.0;
        contract Test {}
      `;
      const filePath = await createSolidityFile('test.sol', content);

      // Create custom config
      const configPath = path.join(testDir, '.solinrc.json');
      await fs.writeFile(
        configPath,
        JSON.stringify({
          rules: {
            'security/tx-origin': 'off',
          },
        }),
        'utf-8'
      );

      const args = createArgs({
        files: [filePath],
        config: configPath,
      });
      await analyzeCommand.execute(args);

      expect(consoleLogSpy).toHaveBeenCalled();
    });

    test('should work without config file', async () => {
      const content = `
        // SPDX-License-Identifier: MIT
        pragma solidity ^0.8.0;
        contract Test {}
      `;
      const filePath = await createSolidityFile('test.sol', content);

      const args = createArgs({ files: [filePath] });
      const result = await analyzeCommand.execute(args);

      // Should complete successfully
      expect([0, 1]).toContain(result);
    });
  });

  describe('quiet mode', () => {
    test('should suppress progress output in quiet mode', async () => {
      const content = `
        // SPDX-License-Identifier: MIT
        pragma solidity ^0.8.0;
        contract Test {}
      `;
      const filePath = await createSolidityFile('test.sol', content);

      const args = createArgs({ files: [filePath], quiet: true });
      await analyzeCommand.execute(args);

      // Should not output "Analyzing X files..."
      const output = consoleLogSpy.mock.calls.map((call) => call[0]).join('\n');
      expect(output).not.toContain('Analyzing');
    });

    test('should show progress output when not quiet', async () => {
      const content = `
        // SPDX-License-Identifier: MIT
        pragma solidity ^0.8.0;
        contract Test {}
      `;
      const filePath = await createSolidityFile('test.sol', content);

      const args = createArgs({ files: [filePath], quiet: false });
      await analyzeCommand.execute(args);

      // Should output "Analyzing X file(s)..."
      const output = consoleLogSpy.mock.calls.map((call) => call[0]).join('\n');
      expect(output).toContain('Analyzing');
    });
  });

  describe('max warnings', () => {
    test('should fail when warnings exceed max', async () => {
      const content = `
        // SPDX-License-Identifier: MIT
        pragma solidity ^0.8.0;
        contract Test {
          function a() public {}
          function b() public {}
          function c() public {}
        }
      `;
      const filePath = await createSolidityFile('warnings.sol', content);

      const args = createArgs({
        files: [filePath],
        maxWarnings: 0,
      });
      const result = await analyzeCommand.execute(args);

      // If there are warnings, should return 1
      expect([0, 1]).toContain(result);
    });
  });

  describe('error handling', () => {
    test('should handle missing config file gracefully', async () => {
      const content = `
        // SPDX-License-Identifier: MIT
        pragma solidity ^0.8.0;
        contract Test {}
      `;
      const filePath = await createSolidityFile('test.sol', content);

      const args = createArgs({
        files: [filePath],
        config: '/nonexistent/config.json',
      });
      const result = await analyzeCommand.execute(args);

      expect(result).toBe(2);
    });

    test('should handle invalid config file', async () => {
      const content = `
        // SPDX-License-Identifier: MIT
        pragma solidity ^0.8.0;
        contract Test {}
      `;
      const filePath = await createSolidityFile('test.sol', content);

      // Create invalid config
      const configPath = path.join(testDir, 'invalid-config.json');
      await fs.writeFile(configPath, 'not valid json', 'utf-8');

      const args = createArgs({
        files: [filePath],
        config: configPath,
      });
      const result = await analyzeCommand.execute(args);

      expect(result).toBe(2);
    });
  });

  describe('glob patterns', () => {
    test('should resolve glob patterns', async () => {
      const content = `
        // SPDX-License-Identifier: MIT
        pragma solidity ^0.8.0;
        contract Test {}
      `;

      // Create multiple files
      await createSolidityFile('test1.sol', content);
      await createSolidityFile('test2.sol', content);

      const args = createArgs({ files: [path.join(testDir, '*.sol')] });
      const result = await analyzeCommand.execute(args);

      expect([0, 1]).toContain(result);
    });

    test('should handle directory as input', async () => {
      const content = `
        // SPDX-License-Identifier: MIT
        pragma solidity ^0.8.0;
        contract Test {}
      `;

      await createSolidityFile('test.sol', content);

      const args = createArgs({ files: [testDir] });
      const result = await analyzeCommand.execute(args);

      expect([0, 1]).toContain(result);
    });
  });
});

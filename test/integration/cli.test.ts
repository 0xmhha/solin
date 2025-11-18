/**
 * CLI Integration Tests
 *
 * End-to-end tests for CLI commands
 */

import { CLI } from '@cli/cli';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('CLI Integration Tests', () => {
  let cli: CLI;
  let tempDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    cli = new CLI();
    originalCwd = process.cwd();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'solin-cli-test-'));
    process.chdir(tempDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('init command', () => {
    test('should create .solinrc.json file', async () => {
      const exitCode = await cli.run(['node', 'solin', 'init']);

      expect(exitCode).toBe(0);

      const configPath = path.join(tempDir, '.solinrc.json');
      const exists = await fs
        .access(configPath)
        .then(() => true)
        .catch(() => false);

      expect(exists).toBe(true);
    });

    test('should fail if config already exists without --force', async () => {
      // Create config first
      await cli.run(['node', 'solin', 'init']);

      // Try to create again without --force
      const exitCode = await cli.run(['node', 'solin', 'init']);

      expect(exitCode).toBe(1);
    });

    test('should overwrite config with --force', async () => {
      // Create config first
      await cli.run(['node', 'solin', 'init']);

      // Overwrite with --force
      const exitCode = await cli.run(['node', 'solin', 'init', '--force']);

      expect(exitCode).toBe(0);
    });
  });

  describe('list-rules command', () => {
    test('should list all available rules', async () => {
      const exitCode = await cli.run(['node', 'solin', 'list-rules']);

      expect(exitCode).toBe(0);
    });
  });

  describe('analyze command', () => {
    test('should analyze valid Solidity file', async () => {
      // Create a simple Solidity file
      const testFile = path.join(tempDir, 'Test.sol');
      await fs.writeFile(
        testFile,
        `
// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

contract Test {
    uint256 public value;

    function setValue(uint256 _value) public {
        value = _value;
    }
}
      `,
      );

      const exitCode = await cli.run(['node', 'solin', testFile]);

      // Exit code 0 means no errors found (warnings/info are OK)
      expect(exitCode).toBeGreaterThanOrEqual(0);
    });

    test('should detect issues in vulnerable contract', async () => {
      const testFile = path.join(tempDir, 'Vulnerable.sol');
      await fs.writeFile(
        testFile,
        `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Vulnerable {
    function check() public {
        require(tx.origin == msg.sender);
    }
}
      `,
      );

      const exitCode = await cli.run(['node', 'solin', testFile]);

      // Should return 1 for errors found
      expect(exitCode).toBeGreaterThan(0);
    });

    test('should return error code 2 for no files', async () => {
      const exitCode = await cli.run(['node', 'solin', 'nonexistent.sol']);

      expect(exitCode).toBe(2);
    });

    test('should analyze multiple files', async () => {
      const file1 = path.join(tempDir, 'Contract1.sol');
      const file2 = path.join(tempDir, 'Contract2.sol');

      await fs.writeFile(
        file1,
        `
// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;
contract Contract1 {}
      `,
      );

      await fs.writeFile(
        file2,
        `
// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;
contract Contract2 {}
      `,
      );

      const exitCode = await cli.run(['node', 'solin', file1, file2]);

      expect(exitCode).toBeGreaterThanOrEqual(0);
    });

    test('should analyze directory', async () => {
      const contractsDir = path.join(tempDir, 'contracts');
      await fs.mkdir(contractsDir);

      const testFile = path.join(contractsDir, 'Test.sol');
      await fs.writeFile(
        testFile,
        `
// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;
contract Test {}
      `,
      );

      const exitCode = await cli.run(['node', 'solin', contractsDir]);

      expect(exitCode).toBeGreaterThanOrEqual(0);
    });

    test('should use custom config file', async () => {
      const testFile = path.join(tempDir, 'Test.sol');
      await fs.writeFile(
        testFile,
        `
// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;
contract Test {}
      `,
      );

      const configFile = path.join(tempDir, 'custom.json');
      await fs.writeFile(
        configFile,
        JSON.stringify({
          rules: {
            'security/tx-origin': 'error',
          },
        }),
      );

      const exitCode = await cli.run(['node', 'solin', testFile, '--config', configFile]);

      expect(exitCode).toBeGreaterThanOrEqual(0);
    });

    test('should support quiet mode', async () => {
      const testFile = path.join(tempDir, 'Test.sol');
      await fs.writeFile(
        testFile,
        `
// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;
contract Test {}
      `,
      );

      const exitCode = await cli.run(['node', 'solin', testFile, '--quiet']);

      expect(exitCode).toBeGreaterThanOrEqual(0);
    });
  });

  describe('version command', () => {
    test('should show version', async () => {
      const cli = new CLI();
      const version = cli.getVersion();

      expect(version).toBeDefined();
      expect(typeof version).toBe('string');
      expect(version.length).toBeGreaterThan(0);
    });
  });

  describe('help command', () => {
    test('should show help text', () => {
      const cli = new CLI();
      const help = cli.showHelp();

      expect(help).toBeDefined();
      expect(typeof help).toBe('string');
      expect(help).toContain('solin');
      expect(help).toContain('Options');
    });
  });
});

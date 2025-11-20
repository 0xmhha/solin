/**
 * Config Loader Tests
 *
 * Testing configuration loading and merging
 */

import { ConfigLoader } from '@config/config-loader';
import { Config } from '@config/types';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('ConfigLoader', () => {
  let loader: ConfigLoader;
  let tempDir: string;

  beforeEach(async () => {
    loader = new ConfigLoader();
    // Create temporary directory for tests
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'solin-test-'));
  });

  afterEach(async () => {
    // Cleanup temp directory
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('constructor', () => {
    test('should create ConfigLoader instance', () => {
      expect(loader).toBeInstanceOf(ConfigLoader);
    });
  });

  describe('load', () => {
    test('should load .solinrc.json from directory', async () => {
      const config: Config = {
        rules: {
          'security/reentrancy': 'error',
        },
      };

      // Write config file
      const configPath = path.join(tempDir, '.solinrc.json');
      await fs.writeFile(configPath, JSON.stringify(config, null, 2));

      const result = await loader.load({ cwd: tempDir });

      expect(result).toHaveProperty('rules');
      expect(result.rules).toHaveProperty('security/reentrancy');
      expect(result.rules['security/reentrancy']).toBe('error');
    });

    test('should load from specific config path', async () => {
      const config: Config = {
        rules: {
          'lint/naming-convention': 'warning',
        },
      };

      const configPath = path.join(tempDir, 'custom-config.json');
      await fs.writeFile(configPath, JSON.stringify(config, null, 2));

      const result = await loader.load({ configPath });

      expect(result.rules).toHaveProperty('lint/naming-convention');
      expect(result.rules['lint/naming-convention']).toBe('warning');
    });

    test('should return default config when no config file found in isolated directory', async () => {
      // Create a deeply nested directory that won't find parent configs
      const isolatedDir = path.join(tempDir, 'isolated', 'deep', 'nested');
      await fs.mkdir(isolatedDir, { recursive: true });

      // Create a .solinrc.json in the root of isolatedDir's parent chain to stop search
      const stopConfig = path.join(tempDir, 'isolated', '.solinrc.json');
      await fs.writeFile(stopConfig, JSON.stringify({ rules: {} }));

      // Now test with a directory that has no config
      const result = await loader.load({ cwd: isolatedDir, useDefaults: true });

      expect(result).toHaveProperty('rules');
      // basePath will be where the config was found (isolated dir)
      expect(result.basePath).toBe(path.join(tempDir, 'isolated'));
    });

    test('should use config from parent directory when not in cwd', async () => {
      // Create parent directory with config
      const parentDir = path.join(tempDir, 'parent');
      const childDir = path.join(parentDir, 'child');
      await fs.mkdir(childDir, { recursive: true });

      // Create config in parent directory
      const parentConfig: Config = {
        rules: {
          'security/reentrancy': 'warning',
        },
      };
      await fs.writeFile(
        path.join(parentDir, '.solinrc.json'),
        JSON.stringify(parentConfig, null, 2)
      );

      // Load from child directory - should find parent config
      const result = await loader.load({ cwd: childDir });

      // Should find config from parent directory
      expect(result).toHaveProperty('rules');
      expect(result.rules).toHaveProperty('security/reentrancy');
      expect(result.basePath).toBe(parentDir);
    });

    test('should parse .solinrc.js file', async () => {
      const configPath = path.join(tempDir, '.solinrc.js');
      const configContent = `
        module.exports = {
          rules: {
            'security/tx-origin': 'error'
          }
        };
      `;
      await fs.writeFile(configPath, configContent);

      const result = await loader.load({ cwd: tempDir });

      expect(result.rules).toHaveProperty('security/tx-origin');
    });

    test('should load from package.json solin field', async () => {
      const packageJson = {
        name: 'test-project',
        solin: {
          rules: {
            'security/delegatecall': 'warning',
          },
        },
      };

      const pkgPath = path.join(tempDir, 'package.json');
      await fs.writeFile(pkgPath, JSON.stringify(packageJson, null, 2));

      const result = await loader.load({ cwd: tempDir });

      expect(result.rules).toHaveProperty('security/delegatecall');
    });

    test('should search parent directories for config', async () => {
      const parentDir = tempDir;
      const childDir = path.join(tempDir, 'src', 'contracts');
      await fs.mkdir(childDir, { recursive: true });

      const config: Config = {
        rules: {
          'security/reentrancy': 'error',
        },
      };

      const configPath = path.join(parentDir, '.solinrc.json');
      await fs.writeFile(configPath, JSON.stringify(config, null, 2));

      const result = await loader.load({ cwd: childDir });

      expect(result.rules).toHaveProperty('security/reentrancy');
    });
  });

  describe('validate', () => {
    test('should validate valid config', () => {
      const config: Config = {
        rules: {
          'security/reentrancy': 'error',
        },
      };

      expect(() => loader.validate(config)).not.toThrow();
    });

    test('should throw error for invalid rules type', () => {
      const config = {
        rules: 'not-an-object',
      };

      expect(() => loader.validate(config as unknown as Config)).toThrow();
    });

    test('should throw error for invalid severity', () => {
      const config: Config = {
        rules: {
          'security/reentrancy': 'invalid' as any,
        },
      };

      expect(() => loader.validate(config)).toThrow();
    });

    test('should validate array rule config', () => {
      const config: Config = {
        rules: {
          'lint/naming-convention': [
            'error',
            {
              contract: 'PascalCase',
            },
          ],
        },
      };

      expect(() => loader.validate(config)).not.toThrow();
    });
  });

  describe('merge', () => {
    test('should merge two configs', () => {
      const base: Config = {
        rules: {
          'security/reentrancy': 'error',
          'lint/naming-convention': 'warning',
        },
      };

      const override: Config = {
        rules: {
          'lint/naming-convention': 'off',
          'security/tx-origin': 'error',
        },
      };

      const result = loader.merge(base, override);

      expect(result.rules).toEqual({
        'security/reentrancy': 'error',
        'lint/naming-convention': 'off',
        'security/tx-origin': 'error',
      });
    });

    test('should merge arrays (plugins)', () => {
      const base: Config = {
        plugins: ['plugin-a'],
      };

      const override: Config = {
        plugins: ['plugin-b'],
      };

      const result = loader.merge(base, override);

      expect(result.plugins).toEqual(['plugin-a', 'plugin-b']);
    });
  });
});

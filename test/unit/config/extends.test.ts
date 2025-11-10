/**
 * Config Extends Mechanism Tests
 *
 * Testing configuration extends and preset loading
 */

import { ConfigLoader } from '@config/config-loader';
import { Config } from '@config/types';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('Config Extends Mechanism', () => {
  let loader: ConfigLoader;
  let tempDir: string;

  beforeEach(async () => {
    loader = new ConfigLoader();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'solin-test-extends-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('loadPreset', () => {
    test('should load built-in preset by name', async () => {
      const preset = await loader.loadPreset('solin:recommended');

      expect(preset).toHaveProperty('rules');
      expect(Object.keys(preset.rules!).length).toBeGreaterThan(0);
    });

    test('should load solin:all preset', async () => {
      const preset = await loader.loadPreset('solin:all');

      expect(preset).toHaveProperty('rules');
      expect(Object.keys(preset.rules!).length).toBeGreaterThan(0);
    });

    test('should load solin:security preset', async () => {
      const preset = await loader.loadPreset('solin:security');

      expect(preset).toHaveProperty('rules');
      // Security preset should have security-related rules
      const ruleIds = Object.keys(preset.rules!);
      expect(ruleIds.some((id) => id.startsWith('security/'))).toBe(true);
    });

    test('should throw error for unknown preset', async () => {
      await expect(loader.loadPreset('solin:unknown')).rejects.toThrow();
    });

    test('should load preset from relative path', async () => {
      const customPreset: Config = {
        rules: {
          'custom/rule-1': 'error',
        },
      };

      const presetPath = path.join(tempDir, 'custom-preset.json');
      await fs.writeFile(presetPath, JSON.stringify(customPreset, null, 2));

      const preset = await loader.loadPreset('./custom-preset.json', tempDir);

      expect(preset.rules).toHaveProperty('custom/rule-1');
    });
  });

  describe('resolveExtends', () => {
    test('should resolve single extends', async () => {
      const config: Config = {
        extends: 'solin:recommended',
        rules: {
          'custom/my-rule': 'error',
        },
      };

      const resolved = await loader.resolveExtends(config, tempDir);

      // Should have rules from preset
      expect(Object.keys(resolved.rules!).length).toBeGreaterThan(1);
      // Should have custom rule
      expect(resolved.rules).toHaveProperty('custom/my-rule');
    });

    test('should resolve multiple extends (array)', async () => {
      const config: Config = {
        extends: ['solin:recommended', 'solin:security'],
        rules: {
          'custom/my-rule': 'error',
        },
      };

      const resolved = await loader.resolveExtends(config, tempDir);

      // Should have rules from both presets
      expect(Object.keys(resolved.rules!).length).toBeGreaterThan(1);
      // Should have custom rule
      expect(resolved.rules).toHaveProperty('custom/my-rule');
    });

    test('should merge extends in order (later overrides earlier)', async () => {
      // Create two custom presets with overlapping rules
      const preset1: Config = {
        rules: {
          'test/rule-1': 'error',
          'test/rule-2': 'warning',
        },
      };

      const preset2: Config = {
        rules: {
          'test/rule-2': 'off', // Override
          'test/rule-3': 'error',
        },
      };

      const preset1Path = path.join(tempDir, 'preset1.json');
      const preset2Path = path.join(tempDir, 'preset2.json');

      await fs.writeFile(preset1Path, JSON.stringify(preset1, null, 2));
      await fs.writeFile(preset2Path, JSON.stringify(preset2, null, 2));

      const config: Config = {
        extends: ['./preset1.json', './preset2.json'],
        rules: {
          'test/rule-1': 'off', // Override from config
        },
      };

      const resolved = await loader.resolveExtends(config, tempDir);

      // preset1: test/rule-1 = error, test/rule-2 = warning
      // preset2: test/rule-2 = off (overrides), test/rule-3 = error
      // config: test/rule-1 = off (overrides)
      expect(resolved.rules!['test/rule-1']).toBe('off');
      expect(resolved.rules!['test/rule-2']).toBe('off');
      expect(resolved.rules!['test/rule-3']).toBe('error');
    });

    test('should handle nested extends', async () => {
      // Create base preset
      const basePreset: Config = {
        rules: {
          'base/rule-1': 'error',
        },
      };

      // Create extended preset that extends base
      const extendedPreset: Config = {
        extends: './base.json',
        rules: {
          'extended/rule-1': 'error',
        },
      };

      const basePath = path.join(tempDir, 'base.json');
      const extendedPath = path.join(tempDir, 'extended.json');

      await fs.writeFile(basePath, JSON.stringify(basePreset, null, 2));
      await fs.writeFile(extendedPath, JSON.stringify(extendedPreset, null, 2));

      const config: Config = {
        extends: './extended.json',
        rules: {
          'custom/rule-1': 'error',
        },
      };

      const resolved = await loader.resolveExtends(config, tempDir);

      // Should have rules from base, extended, and config
      expect(resolved.rules!['base/rule-1']).toBe('error');
      expect(resolved.rules!['extended/rule-1']).toBe('error');
      expect(resolved.rules!['custom/rule-1']).toBe('error');
    });

    test('should detect circular extends', async () => {
      // Create circular reference
      const config1: Config = {
        extends: './config2.json',
        rules: {
          'rule-1': 'error',
        },
      };

      const config2: Config = {
        extends: './config1.json',
        rules: {
          'rule-2': 'error',
        },
      };

      const config1Path = path.join(tempDir, 'config1.json');
      const config2Path = path.join(tempDir, 'config2.json');

      await fs.writeFile(config1Path, JSON.stringify(config1, null, 2));
      await fs.writeFile(config2Path, JSON.stringify(config2, null, 2));

      const config: Config = {
        extends: './config1.json',
      };

      await expect(loader.resolveExtends(config, tempDir)).rejects.toThrow(
        /circular/i,
      );
    });

    test('should resolve config without extends', async () => {
      const config: Config = {
        rules: {
          'custom/rule-1': 'error',
        },
      };

      const resolved = await loader.resolveExtends(config, tempDir);

      expect(resolved.rules!['custom/rule-1']).toBe('error');
      expect(Object.keys(resolved.rules!).length).toBe(1);
    });
  });

  describe('integration with load()', () => {
    test('should automatically resolve extends when loading config', async () => {
      const config: Config = {
        extends: 'solin:recommended',
        rules: {
          'custom/my-rule': 'error',
        },
      };

      const configPath = path.join(tempDir, '.solinrc.json');
      await fs.writeFile(configPath, JSON.stringify(config, null, 2));

      const result = await loader.load({ cwd: tempDir });

      // Should have rules from preset
      expect(Object.keys(result.rules).length).toBeGreaterThan(1);
      // Should have custom rule
      expect(result.rules['custom/my-rule']).toBe('error');
    });
  });
});
